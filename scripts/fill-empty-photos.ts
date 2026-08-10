/**
 * Attach locally-downloaded past-application photos (public/photos/backfill/) to
 * past applications that currently have NO photos at all. Complements
 * migrate-backfill.ts, which only *replaces* existing Drive URLs — it never
 * touches applications imported without any photo rows (e.g. all of 2014 and
 * 2023). This pass fills those blanks; it never overwrites an app that already
 * has photos, so it's safe to re-run.
 *
 * Bridge key: form-response filenames embed the artist name after " - ",
 * e.g. "IMG_7025 - Daniel Schmidt.jpeg". We resolve that to an application by,
 * in order of confidence:
 *   1. exact name            → applications.name
 *   2. hand alias            → ALIASES
 *   3. email                 → filename that is an email address
 *   4. name prefix           → "Heidi Hensley Art (District One)" → Heidi Hensley
 *   5. business ↔ web/social → "Leaping Goat Soap" appears in an empty app's
 *                              website host or a social handle (unambiguous only)
 * A multi-year artist's photos go to each of their empty years (same set — it's
 * their work; a possibly-off-year photo beats a blank archive card).
 *
 * Every image is normalized through sharp (EXIF auto-orient, ≤2000px, JPEG) so
 * HEIC/PNG originals render in the browser and Blob storage stays lean.
 *
 * Usage:
 *   npx tsx scripts/fill-empty-photos.ts            # dry run (no writes)
 *   npx tsx scripts/fill-empty-photos.ts --commit   # upload + insert
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import sharp from "sharp";
import { eq } from "drizzle-orm";
import { put } from "@vercel/blob";
import { db } from "../src/db";
import { applications, applicationPhotos, cycles } from "../src/db/schema";

const BACKFILL_DIR = path.join(process.cwd(), "public/photos/backfill");
const COMMIT = process.argv.includes("--commit");
const MAX_PER_APP = 6;

const norm = (s: string) =>
  s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
const compact = (s: string) => norm(s).replace(/ /g, "");

// Backfill filenames using a business/booth name the DB stores under a person.
const ALIASES: Record<string, string> = {
  "very good puzzle": "very good puzzle paige dixon brian dixon",
  "brian dixon": "paige brian dixon",
  chalises: "adrienne chappell",
  "rene shoemaker": "rene d shoemaker",
  "beka p": "beka poss",
};

// Generic tokens that must never carry a business↔web match on their own.
const STOP = new Set([
  "the", "and", "co", "company", "llc", "inc", "art", "arts", "studio", "studios",
  "shop", "designs", "design", "handmade", "goods", "makes", "made", "athens",
  "georgia", "ga", "creations", "jewelry", "soap", "soaps", "ceramics", "pottery",
  "farm", "info", "natural", "naturals", "by", "of",
]);

type Target = { id: number; year: number };

function artistFromFilename(file: string): string | null {
  const base = file.replace(/\.[a-z0-9]+$/i, "").replace(/\(\d+\)$/, "").trim();
  const idx = base.lastIndexOf(" - ");
  return idx === -1 ? null : base.slice(idx + 3).trim();
}

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith(".")) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

/** Dedupe an artist's files by content hash, stable (basename-sorted) order. */
function dedupe(files: string[]): { file: string; hash: string }[] {
  const seen = new Map<string, { file: string; hash: string }>();
  for (const f of files.sort((a, b) => path.basename(a).localeCompare(path.basename(b)))) {
    const buf = fs.readFileSync(f);
    if (buf.length < 1500) continue;
    const hash = crypto.createHash("sha256").update(buf).digest("hex").slice(0, 16);
    if (!seen.has(hash)) seen.set(hash, { file: f, hash });
  }
  return [...seen.values()];
}

/** EXIF-orient, cap at 2000px, re-encode JPEG. Returns null if unreadable. */
async function normalizeToJpeg(file: string): Promise<Buffer | null> {
  try {
    return await sharp(fs.readFileSync(file), { unlimited: true })
      .rotate()
      .resize(2000, 2000, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 82 })
      .toBuffer();
  } catch (e) {
    console.warn(`    ! skip (unreadable): ${path.basename(file)} — ${(e as Error).message.slice(0, 60)}`);
    return null;
  }
}

function webHost(website: string | null): string {
  if (!website) return "";
  try {
    const u = new URL(website.startsWith("http") ? website : `https://${website}`);
    return compact(u.hostname.replace(/^www\./, "").replace(/\.[a-z]+$/, ""));
  } catch {
    return compact(website);
  }
}

async function main() {
  console.log(`Mode: ${COMMIT ? "COMMIT" : "DRY RUN"}\n`);

  const byArtist = new Map<string, { raw: string; files: string[] }>();
  for (const f of walk(BACKFILL_DIR)) {
    const name = artistFromFilename(path.basename(f));
    if (!name) continue;
    const k = norm(name);
    if (!byArtist.has(k)) byArtist.set(k, { raw: name, files: [] });
    byArtist.get(k)!.files.push(f);
  }

  const apps = await db
    .select({
      id: applications.id,
      name: applications.name,
      email: applications.email,
      website: applications.website,
      socials: applications.socials,
      description: applications.description,
      bio: applications.bio,
      year: cycles.year,
    })
    .from(applications)
    .innerJoin(cycles, eq(applications.cycleId, cycles.id));

  const byName = new Map<string, Target[]>();
  const byEmail = new Map<string, Target[]>();
  for (const a of apps) {
    (byName.get(norm(a.name)) ?? byName.set(norm(a.name), []).get(norm(a.name))!).push({ id: a.id, year: a.year });
    if (a.email) {
      const ek = a.email.toLowerCase().trim();
      (byEmail.get(ek) ?? byEmail.set(ek, []).get(ek)!).push({ id: a.id, year: a.year });
    }
  }

  const photoRows = await db.select({ applicationId: applicationPhotos.applicationId }).from(applicationPhotos);
  const hasPhoto = new Set(photoRows.map((p) => p.applicationId));

  // Per empty app: name tokens (for person-name variants) + a compact haystack
  // of web host, socials, and description/bio (for business-name matching).
  const emptyApps: { t: Target; nameToks: Set<string>; hay: string }[] = [];
  for (const a of apps) {
    if (hasPhoto.has(a.id)) continue;
    const socials = Object.values((a.socials as Record<string, string>) ?? {}).map(compact).join(" ");
    // Include the email — old apps often carry the business in the address
    // (info@3porchfarm.com) when every other field is blank.
    const hay = compact(`${a.email ?? ""} ${webHost(a.website)} ${socials} ${a.description ?? ""} ${a.bio ?? ""}`);
    emptyApps.push({
      t: { id: a.id, year: a.year },
      nameToks: new Set(norm(a.name).split(" ").filter(Boolean)),
      hay,
    });
  }

  /** Resolve a backfill name to apps + the method used (confidence). */
  function resolve(key: string, raw: string): { targets: Target[]; method: string } {
    if (byName.has(key)) return { targets: byName.get(key)!, method: "name" };
    if (ALIASES[key] && byName.has(ALIASES[key])) return { targets: byName.get(ALIASES[key])!, method: "alias" };
    const ek = raw.toLowerCase().trim();
    if (raw.includes("@") && byEmail.has(ek)) return { targets: byEmail.get(ek)!, method: "email" };

    // Name prefix: drop trailing business/handle tokens ("Heidi Hensley Art …").
    const toks = key.split(" ");
    for (let len = toks.length - 1; len >= 2; len--) {
      const prefix = toks.slice(0, len).join(" ");
      if (byName.has(prefix)) return { targets: byName.get(prefix)!, method: `prefix:${prefix}` };
    }

    // Name-token subset: all backfill name tokens present in one empty app's name
    // ("Melissa Crisp" ⊆ "Melissa Standridge Crisp"). Needs ≥2 tokens.
    if (toks.length >= 2) {
      const subs = emptyApps.filter((a) => toks.every((t) => a.nameToks.has(t)));
      const uniq = new Map(subs.map((x) => [x.t.id, x.t]));
      if (uniq.size === 1) return { targets: [...uniq.values()], method: "name-subset" };
    }

    // Business ↔ web/social/description: distinctive compact appears in exactly
    // one empty app.
    const c = compact(key);
    const distinctive = toks.filter((t) => t.length >= 4 && !STOP.has(t));
    if (c.length >= 7 || distinctive.length >= 2) {
      const hits = emptyApps.filter(({ hay }) => {
        if (c.length >= 7 && hay.includes(c)) return true;
        return distinctive.length >= 2 && distinctive.every((t) => hay.includes(t));
      });
      const uniqApps = new Map(hits.map((x) => [x.t.id, x.t]));
      if (uniqApps.size === 1) return { targets: [...uniqApps.values()], method: "web" };
      if (uniqApps.size > 1) return { targets: [], method: "web-ambiguous" };
    }
    return { targets: [], method: "none" };
  }

  const blobByHash = new Map<string, string>();
  const byYear = new Map<number, number>();
  const fuzzyLog: string[] = [];
  let appsFilled = 0, photosInserted = 0, uploads = 0;
  const unmatched: string[] = [];

  for (const [k, { raw, files }] of byArtist) {
    const { targets, method } = resolve(k, raw);
    if (targets.length === 0) {
      unmatched.push(method === "web-ambiguous" ? `${raw} [ambiguous web match]` : raw);
      continue;
    }
    const empties = targets.filter((a) => !hasPhoto.has(a.id));
    if (empties.length === 0) continue;

    const unique = dedupe(files).slice(0, MAX_PER_APP);
    if (unique.length === 0) continue;

    const urls: string[] = [];
    for (const u of unique) {
      let url = blobByHash.get(u.hash);
      if (!url) {
        if (COMMIT) {
          const jpeg = await normalizeToJpeg(u.file);
          if (!jpeg) continue;
          const safe = norm(raw).replace(/ /g, "-").slice(0, 40) || "artist";
          const blob = await put(`archive/backfill/${safe}-${u.hash}.jpg`, jpeg, {
            access: "public",
            contentType: "image/jpeg",
            addRandomSuffix: false,
            allowOverwrite: true,
          });
          url = blob.url;
          blobByHash.set(u.hash, url);
        } else {
          url = `(dry) ${u.hash}`;
        }
        uploads++;
      }
      urls.push(url);
    }
    if (urls.length === 0) continue;

    if (method.startsWith("prefix") || method === "web" || method === "alias" || method === "name-subset") {
      fuzzyLog.push(`  [${method}] ${raw} → ${empties.map((t) => `app${t.id}/${t.year}`).join(", ")}`);
    }
    for (const t of empties) {
      if (COMMIT) {
        await db.insert(applicationPhotos).values(urls.map((url, i) => ({ applicationId: t.id, url, position: i })));
      }
      byYear.set(t.year, (byYear.get(t.year) ?? 0) + 1);
      appsFilled++;
      photosInserted += urls.length;
    }
  }

  console.log(`Fuzzy/alias matches applied (${fuzzyLog.length}):`);
  console.log(fuzzyLog.join("\n"));
  console.log("\n=== Summary ===");
  console.log(`Apps filled: ${appsFilled} | photo rows inserted: ${photosInserted} | unique uploads: ${uploads}`);
  console.log("By year:");
  [...byYear.entries()].sort((a, b) => a[0] - b[0]).forEach(([y, n]) => console.log(`  ${y}: ${n}`));
  console.log(`\nStill unmatched (${unmatched.length}) — no confident app match:`);
  console.log(unmatched.sort().join(" | "));
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
