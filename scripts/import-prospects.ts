import { readFileSync } from "fs";
import { eq } from "drizzle-orm";
import { db } from "../src/db";
import {
  cycles,
  applications,
  prospects,
  prospectImages,
  prospectBatches,
  prospectOptOuts,
} from "../src/db/schema";
import { categorizeMedium } from "../src/lib/mediums";
import {
  cleanWebsite,
  cleanInstagram,
  cleanEmail,
  prospectDedupeKey,
} from "../src/lib/prospects";

/**
 * Seed the prospect pool from the research spreadsheet + prototype lookbook,
 * pre-merged into one JSON by scripts (see scratchpad/parse_prospects.py).
 *
 * The data is scraped, not artist-submitted, so it must NEVER be committed to
 * this public repo — pass the JSON path with --file (kept outside the tree).
 *
 * Idempotent: a unique (cycleId, dedupeKey) index means re-runs skip prospects
 * that already exist rather than duplicating them.
 *
 *   npx dotenv -e .env.local -- tsx scripts/import-prospects.ts --file <path>
 */

type Row = {
  name: string;
  medium?: string;
  category?: string;
  city?: string;
  state?: string;
  region?: string;
  website?: string;
  instagram?: string;
  contact?: string;
  notes?: string;
  foundVia?: string;
  email?: string;
  description?: string;
  images?: string[];
  sourceSheet?: string;
};

function arg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const file = arg("--file");
  if (!file) throw new Error("Pass --file <path> to the pre-merged prospects JSON.");
  const raw = JSON.parse(readFileSync(file, "utf8")) as {
    prospects: Row[];
    bench: Row[];
    lookbookOnly: Row[];
  };

  const cycle = await db.query.cycles.findFirst({ where: eq(cycles.isActive, true) });
  if (!cycle) throw new Error("No active cycle. Set one before importing prospects.");
  console.log(`Active cycle: ${cycle.year} (#${cycle.id})`);

  // Exclusion set: anyone who already applied this cycle (accepted artists are
  // linked to those applications), or anyone on the cold-outreach opt-out list
  // — matched by email.
  const [appEmails, optOuts] = await Promise.all([
    db
      .select({ email: applications.email })
      .from(applications)
      .where(eq(applications.cycleId, cycle.id)),
    db.select({ email: prospectOptOuts.email }).from(prospectOptOuts),
  ]);
  const excluded = new Set(
    [...appEmails, ...optOuts]
      .map((r) => (r.email ?? "").trim().toLowerCase())
      .filter(Boolean),
  );

  // One batch row records this import.
  const [batch] = await db
    .insert(prospectBatches)
    .values({
      cycleId: cycle.id,
      source: "import",
      label: `Research spreadsheet + lookbook import`,
      status: "complete",
      createdBy: "import-script",
    })
    .returning({ id: prospectBatches.id });

  // Merge the three pools; bench + lookbook-only are secondary. Dedupe within
  // the run by key, merging image lists so a lookbook match enriches a sheet row.
  const tagged: Row[] = [
    ...raw.prospects.map((r) => ({ ...r })),
    ...raw.lookbookOnly.map((r) => ({ ...r })),
    ...raw.bench.map((r) => ({
      ...r,
      notes: [r.notes, "Bench lead"].filter(Boolean).join(" — "),
    })),
  ];

  const byKey = new Map<string, Row>();
  for (const r of tagged) {
    if (!r.name?.trim()) continue;
    const key = prospectDedupeKey(r.name, r.website);
    const existing = byKey.get(key);
    if (existing) {
      const imgs = new Set([...(existing.images ?? []), ...(r.images ?? [])]);
      existing.images = [...imgs];
      existing.email ||= r.email;
      existing.description ||= r.description;
      existing.instagram ||= r.instagram;
    } else {
      byKey.set(key, r);
    }
  }

  let added = 0,
    skippedExcluded = 0,
    skippedDup = 0,
    imagesAdded = 0;

  for (const [dedupeKey, r] of byKey) {
    const email = cleanEmail(r.email);
    if (email && excluded.has(email)) {
      skippedExcluded++;
      continue;
    }
    const medium = r.medium?.trim() || null;
    const category = medium ? categorizeMedium(medium) : r.category?.trim() || null;

    const [inserted] = await db
      .insert(prospects)
      .values({
        cycleId: cycle.id,
        batchId: batch.id,
        source: "import",
        name: r.name.trim(),
        medium,
        category,
        city: r.city?.trim() || null,
        state: r.state?.trim() || null,
        region: r.region?.trim() || null,
        website: cleanWebsite(r.website),
        instagram: cleanInstagram(r.instagram),
        email,
        contact: r.contact?.trim() || null,
        description: r.description?.trim() || null,
        notes: r.notes?.trim() || null,
        foundVia: r.foundVia?.trim() || null,
        dedupeKey,
        raw: r,
      })
      .onConflictDoNothing({ target: [prospects.cycleId, prospects.dedupeKey] })
      .returning({ id: prospects.id });

    if (!inserted) {
      skippedDup++;
      continue;
    }
    added++;

    const urls = [...new Set((r.images ?? []).filter(Boolean))];
    if (urls.length) {
      await db.insert(prospectImages).values(
        urls.map((sourceUrl, position) => ({
          prospectId: inserted.id,
          sourceUrl,
          position,
        })),
      );
      imagesAdded += urls.length;
    }
  }

  await db
    .update(prospectBatches)
    .set({
      stats: { found: byKey.size, added, skippedExcluded, skippedDup, imagesAdded },
      completedAt: new Date(),
    })
    .where(eq(prospectBatches.id, batch.id));

  console.log(
    `Import complete: ${added} added, ${skippedExcluded} excluded (already in system), ` +
      `${skippedDup} already imported, ${imagesAdded} images across the pool.`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
