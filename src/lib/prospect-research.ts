import Anthropic from "@anthropic-ai/sdk";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  applications,
  cycles,
  settings,
  prospects,
  prospectImages,
  prospectBatches,
  prospectOptOuts,
} from "@/db/schema";
import { categorizeMedium } from "@/lib/mediums";
import { cleanWebsite, cleanInstagram, cleanEmail, prospectDedupeKey } from "@/lib/prospects";
import { extractSiteImages } from "@/lib/site-images";
import { cachePendingProspectImages, enrichProspectImagesFromSites } from "@/lib/prospect-images";
import { perplexityChat, hasPerplexity } from "@/lib/perplexity";

/**
 * Autonomous artist scouting. The model does DISCOVERY only — grounded by the
 * web_search server tool, it returns structured candidate makers. Image URLs are
 * never taken from the model (it hallucinates them); instead we fetch each
 * candidate's site and extract real photos deterministically. Runs in resumable
 * rounds so it never exceeds a serverless timeout: a query plan + cursor live in
 * the batch's `params`, and each call advances the cursor within a time budget.
 */

export type GeoScope = "athens" | "southeast" | "none";

const GEO_LABEL: Record<GeoScope, string> = {
  athens: "Athens, Georgia and the surrounding northeast Georgia area",
  southeast:
    "the Southeastern US — especially Athens & northeast Georgia, metro Atlanta, north Georgia, upstate South Carolina, and the Augusta area",
  none: "the United States",
};

const REGIONS: Record<GeoScope, string[]> = {
  athens: ["Athens & NE Georgia", "North Georgia"],
  southeast: [
    "Athens & NE Georgia",
    "Metro Atlanta",
    "North Georgia",
    "Upstate South Carolina",
    "Augusta area",
  ],
  none: ["Georgia", "Southeast US", "United States"],
};

// Two broad medium buckets per region keeps the query count (and thus the total
// run time) manageable while still spreading across the whole medium range.
const MEDIUM_GROUPS: string[][] = [
  ["Ceramics & Pottery", "Glass", "Woodwork", "Jewelry", "Metalwork", "Leather"],
  [
    "Painting & Drawing",
    "Printmaking & Paper",
    "Photography",
    "Textiles & Fiber",
    "Candles & Apothecary",
    "Bath & Body",
    "Home & Decor",
    "Mixed Media & Sculpture",
  ],
];

type PlanItem = { region: string; mediums: string[] };
type ResearchParams = {
  geoScope: GeoScope;
  targetCount: number;
  plan: PlanItem[];
  cursor: number;
};

type Candidate = {
  name: string;
  medium?: string;
  city?: string;
  state?: string;
  website?: string;
  instagram?: string;
  email?: string;
  description?: string;
  reason?: string;
};

function buildPlan(geoScope: GeoScope): PlanItem[] {
  const plan: PlanItem[] = [];
  for (const region of REGIONS[geoScope]) {
    for (const mediums of MEDIUM_GROUPS) plan.push({ region, mediums });
  }
  return plan;
}

/** Create a queued auto-scout batch with its query plan. */
export async function createResearchBatch(
  cycleId: number,
  opts: { geoScope: GeoScope; targetCount: number; createdBy: string },
) {
  const params: ResearchParams = {
    geoScope: opts.geoScope,
    targetCount: opts.targetCount,
    plan: buildPlan(opts.geoScope),
    cursor: 0,
  };
  const [batch] = await db
    .insert(prospectBatches)
    .values({
      cycleId,
      source: "auto_scout",
      label: `Auto-scout — ${GEO_LABEL[opts.geoScope].split("—")[0].trim()}`,
      status: "queued",
      params,
      stats: { added: 0, skipped: 0, queriesRun: 0 },
      createdBy: opts.createdBy,
    })
    .returning({ id: prospectBatches.id });
  return batch.id;
}

function parseCandidates(text: string): Candidate[] {
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) return [];
  try {
    const arr = JSON.parse(match[0]);
    if (!Array.isArray(arr)) return [];
    return arr.filter((c) => c && typeof c.name === "string" && c.name.trim());
  } catch {
    return [];
  }
}

/** True if any web_search block came back as an error (e.g. the account's
 *  server-tool usage limit was hit) rather than real results. */
function searchErrored(content: Anthropic.ContentBlock[]): boolean {
  return content.some(
    (b) =>
      b.type === "web_search_tool_result" &&
      !Array.isArray((b as { content?: unknown }).content) &&
      (b as { content?: { type?: string } }).content?.type === "web_search_tool_result_error",
  );
}

const DISCOVERY_SYSTEM =
  "You research independent, handmade artists and makers who would be a great fit to invite to a juried holiday craft market in Athens, Georgia. " +
  "Find REAL makers with an active web presence. Only include artists who make their own work by hand. " +
  "Exclude galleries that only resell, big brands, print-on-demand shops, and anyone clearly inactive. " +
  "CRITICAL: your entire response must be a JSON array and nothing else — no prose, questions, or apologies. " +
  "An empty array [] is fine if you found none. Never invent URLs, emails, or handles.";

function discoveryUser(geoScope: GeoScope, item: PlanItem): string {
  return (
    `Find handmade artists based in ${item.region} (within ${GEO_LABEL[geoScope]}) working in any of these mediums: ${item.mediums.join(", ")}. ` +
    `Return about 7 strong, distinct candidates as a JSON array of objects with keys: ` +
    `name (maker or business name), medium, city, state (2-letter), website (full URL if known), instagram (handle or URL if known), email (only if clearly published), description (one short sentence), reason (why they'd fit this market, one short phrase). ` +
    `Omit any key you don't know. Respond with ONLY the JSON array.`
  );
}

/** Perplexity Sonar — the primary provider (no Anthropic web-search cap). */
async function discoverPerplexity(
  geoScope: GeoScope,
  item: PlanItem,
): Promise<{ candidates: Candidate[]; errored: boolean }> {
  const r = await perplexityChat(DISCOVERY_SYSTEM, discoveryUser(geoScope, item), {
    model: "sonar",
    maxTokens: 1800,
    timeoutMs: 60_000,
  });
  if (!r.ok) {
    console.error(`[research] perplexity failed (${r.status}): ${r.error}`);
    return { candidates: [], errored: true };
  }
  return { candidates: parseCandidates(r.text), errored: false };
}

/** Anthropic web_search — fallback when no Perplexity key is configured. */
async function discoverAnthropic(
  geoScope: GeoScope,
  item: PlanItem,
): Promise<{ candidates: Candidate[]; errored: boolean }> {
  const client = new Anthropic();
  const msg = await client.messages.create(
    {
      model: "claude-sonnet-5",
      max_tokens: 2000,
      tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 3 } as never],
      system:
        DISCOVERY_SYSTEM +
        " Use web search efficiently — a handful of broad searches (craft-fair rosters, maker directories, studio-tour lists), not one search per artist.",
      messages: [{ role: "user", content: discoveryUser(geoScope, item) }],
    },
    { timeout: 150_000 }, // bound each query so one can't blow the function limit
  );
  const text = msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  return { candidates: parseCandidates(text), errored: searchErrored(msg.content) };
}

/** Provider dispatch: prefer Perplexity, fall back to Anthropic web search. */
async function discover(geoScope: GeoScope, item: PlanItem) {
  return hasPerplexity() ? discoverPerplexity(geoScope, item) : discoverAnthropic(geoScope, item);
}

/**
 * Advance an auto-scout batch by processing queries until the target is met, the
 * plan is exhausted, or the time budget runs out. Safe to call repeatedly (the
 * on-demand trigger and the daily cron both call it); dedup makes it idempotent.
 */
export async function runProspectResearch(
  batchId: number,
  opts: { timeBudgetMs?: number } = {},
) {
  const budget = opts.timeBudgetMs ?? 180_000;
  const startedAt = Date.now();

  const batch = await db.query.prospectBatches.findFirst({
    where: eq(prospectBatches.id, batchId),
  });
  if (!batch || batch.source !== "auto_scout") return { error: "Not an auto-scout batch." };
  if (batch.status === "complete") return { done: true, added: 0 };

  const params = batch.params as ResearchParams;
  const cycleId = batch.cycleId;

  if (!hasPerplexity() && !process.env.ANTHROPIC_API_KEY) {
    const note = "No search provider configured (set PERPLEXITY_API_KEY or ANTHROPIC_API_KEY).";
    await db.update(prospectBatches).set({ status: "failed", note }).where(eq(prospectBatches.id, batchId));
    return { error: note };
  }

  await db.update(prospectBatches).set({ status: "running" }).where(eq(prospectBatches.id, batchId));

  // Load exclusion sets once: existing prospect keys (this cycle), applicant
  // emails (this cycle), and cold-outreach opt-outs.
  const [existingProspects, appEmails, optOuts] = await Promise.all([
    db.select({ dedupeKey: prospects.dedupeKey }).from(prospects).where(eq(prospects.cycleId, cycleId)),
    db.select({ email: applications.email }).from(applications).where(eq(applications.cycleId, cycleId)),
    db.select({ email: prospectOptOuts.email }).from(prospectOptOuts),
  ]);
  const seenKeys = new Set(existingProspects.map((p) => p.dedupeKey));
  const excludedEmails = new Set(
    [...appEmails, ...optOuts].map((r) => (r.email ?? "").trim().toLowerCase()).filter(Boolean),
  );

  const stats = (batch.stats as { added: number; skipped: number; queriesRun: number }) ?? {
    added: 0,
    skipped: 0,
    queriesRun: 0,
  };
  const addedIds: number[] = [];
  let limited = false;

  while (params.cursor < params.plan.length && stats.added < params.targetCount) {
    if (Date.now() - startedAt > budget) break;
    const item = params.plan[params.cursor];

    let candidates: Candidate[] = [];
    try {
      const r = await discover(params.geoScope, item);
      candidates = r.candidates;
      // Web-search quota exhausted for now: pause WITHOUT advancing the cursor so
      // the daily cron resumes this exact query once the limit resets.
      if (r.errored && candidates.length === 0) {
        limited = true;
        break;
      }
    } catch (e) {
      console.error(`[research] query ${params.cursor} failed:`, e);
    }
    stats.queriesRun++;

    for (const c of candidates) {
      const website = cleanWebsite(c.website);
      const key = prospectDedupeKey(c.name, website);
      if (seenKeys.has(key)) {
        stats.skipped++;
        continue;
      }
      const email = cleanEmail(c.email);
      if (email && excludedEmails.has(email)) {
        stats.skipped++;
        continue;
      }
      seenKeys.add(key);

      const medium = c.medium?.trim() || null;
      const [inserted] = await db
        .insert(prospects)
        .values({
          cycleId,
          batchId,
          source: "auto_scout",
          name: c.name.trim(),
          medium,
          category: medium ? categorizeMedium(medium) : null,
          city: c.city?.trim() || null,
          state: c.state?.trim()?.slice(0, 2).toUpperCase() || null,
          region: item.region,
          website,
          instagram: cleanInstagram(c.instagram),
          email,
          description: c.description?.trim() || null,
          notes: c.reason?.trim() || null,
          foundVia: "Auto-scout",
          dedupeKey: key,
          raw: c,
        })
        .onConflictDoNothing({ target: [prospects.cycleId, prospects.dedupeKey] })
        .returning({ id: prospects.id });

      if (!inserted) {
        stats.skipped++;
        continue;
      }
      stats.added++;
      addedIds.push(inserted.id);
    }

    params.cursor++;
    // Persist progress after each query so a timeout/crash resumes cleanly.
    await db
      .update(prospectBatches)
      .set({ params, stats })
      .where(eq(prospectBatches.id, batchId));
  }

  // Enrich newly-added prospects with real site images (within remaining budget).
  for (const id of addedIds) {
    if (Date.now() - startedAt > budget) break;
    const p = await db.query.prospects.findFirst({ where: eq(prospects.id, id) });
    if (!p?.website) continue;
    const urls = await extractSiteImages(p.website, 4);
    if (urls.length) {
      await db
        .insert(prospectImages)
        .values(urls.map((sourceUrl, position) => ({ prospectId: id, sourceUrl, position })));
    }
  }

  const complete = params.cursor >= params.plan.length || stats.added >= params.targetCount;
  await db
    .update(prospectBatches)
    .set({
      params,
      stats,
      status: complete ? "complete" : "running",
      note: limited ? "Paused: web-search limit reached — resumes automatically." : null,
      completedAt: complete ? new Date() : null,
    })
    .where(eq(prospectBatches.id, batchId));

  return {
    done: complete,
    paused: limited,
    added: stats.added,
    skipped: stats.skipped,
    queriesRun: stats.queriesRun,
  };
}

/**
 * Daily-cron entry point. Once a year (August) it auto-kicks a Southeast scout
 * for the active cycle — claimed via a settings flag so it fires exactly once —
 * then advances any in-flight batch and caches any pending images. All parts
 * no-op on a normal day.
 */
export async function runProspectScoutingCron(now: Date = new Date()) {
  const results: Record<string, unknown> = {};
  const cycle = await db.query.cycles.findFirst({ where: eq(cycles.isActive, true) });
  if (cycle) {
    const monthET = Number(
      new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", month: "numeric" }).format(now),
    );
    if (monthET === 8) {
      const flagKey = `prospect_autoscout:${cycle.year}`;
      const [claimed] = await db
        .insert(settings)
        .values({ key: flagKey, value: true })
        .onConflictDoNothing({ target: settings.key })
        .returning({ key: settings.key });
      if (claimed) {
        results.created = await createResearchBatch(cycle.id, {
          geoScope: "southeast",
          targetCount: 60,
          createdBy: "cron",
        });
      }
    }
  }
  results.advance = await advancePendingResearch({ timeBudgetMs: 120_000 });
  // Pull photos from prospect websites for anyone still missing them, then cache
  // everything to Blob. Both no-op when there's nothing pending.
  results.enriched = await enrichProspectImagesFromSites({ limit: 60 });
  results.images = await cachePendingProspectImages({ limit: 200 });
  return results;
}

/** Continue any batch left in queued/running state — for the daily cron. */
export async function advancePendingResearch(opts: { timeBudgetMs?: number } = {}) {
  const pending = await db
    .select({ id: prospectBatches.id })
    .from(prospectBatches)
    .where(and(eq(prospectBatches.source, "auto_scout"), inArray(prospectBatches.status, ["queued", "running"])));
  let advanced = 0;
  for (const b of pending) {
    try {
      await runProspectResearch(b.id, opts);
      advanced++;
    } catch (e) {
      console.error(`[research] advance batch ${b.id} failed:`, e);
    }
  }
  return { pending: pending.length, advanced };
}
