/**
 * Attach locally-downloaded past-application photos (public/photos/backfill/) to
 * past applications that currently have NO photos at all. Complements
 * migrate-backfill.ts, which only *replaces* existing Drive URLs — it never
 * touches applications that were imported without any photo rows (e.g. all of
 * 2014 and 2023). This pass fills those blanks; it never overwrites an app that
 * already has photos, so there's nothing to lose and it's safe to re-run.
 *
 * Bridge key: form-response filenames embed the artist name after " - ",
 * e.g. "IMG_7025 - Daniel Schmidt.jpeg" → applications.name. A multi-year
 * artist's photos are attached to each of their empty years (same set — it's
 * their work; a possibly-off-year photo beats a blank archive card).
 *
 * Every image is normalized through sharp: EXIF auto-orient, downsize to
 * ≤2000px, re-encode as JPEG — so HEIC/PNG originals render in the browser and
 * Blob storage stays lean.
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

// Backfill filenames using a business/booth name the DB stores under a person.
// (Shared with migrate-backfill.ts; extend as business names are verified.)
const ALIASES: Record<string, string> = {
  "very good puzzle": "very good puzzle paige dixon brian dixon",
  "brian dixon": "paige brian dixon",
  chalises: "adrienne chappell",
  "rene shoemaker": "rene d shoemaker",
  "beka p": "beka poss",
};

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
    if (buf.length < 1500) continue; // skip corrupt/placeholder
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
    .select({ id: applications.id, name: applications.name, email: applications.email, year: cycles.year })
    .from(applications)
    .innerJoin(cycles, eq(applications.cycleId, cycles.id));
  const byName = new Map<string, { id: number; year: number }[]>();
  const byEmail = new Map<string, { id: number; year: number }[]>();
  for (const a of apps) {
    const k = norm(a.name);
    (byName.get(k) ?? byName.set(k, []).get(k)!).push({ id: a.id, year: a.year });
    if (a.email) {
      const ek = a.email.toLowerCase().trim();
      (byEmail.get(ek) ?? byEmail.set(ek, []).get(ek)!).push({ id: a.id, year: a.year });
    }
  }
  const lookup = (key: string, raw: string): { id: number; year: number }[] => {
    if (byName.has(key)) return byName.get(key)!;
    if (ALIASES[key] && byName.has(ALIASES[key])) return byName.get(ALIASES[key])!;
    const ek = raw.toLowerCase().trim();
    if (raw.includes("@") && byEmail.has(ek)) return byEmail.get(ek)!;
    return [];
  };

  // Which apps currently have any photo row? (Only fill the truly empty ones.)
  const photoRows = await db.select({ applicationId: applicationPhotos.applicationId }).from(applicationPhotos);
  const hasPhoto = new Set(photoRows.map((p) => p.applicationId));

  const blobByHash = new Map<string, string>();
  const byYear = new Map<number, number>();
  let appsFilled = 0, photosInserted = 0, uploads = 0, unmatched = 0;
  const unmatchedNames: string[] = [];

  for (const [k, { raw, files }] of byArtist) {
    const cands = lookup(k, raw);
    const empties = cands.filter((a) => !hasPhoto.has(a.id));
    if (cands.length === 0) { unmatched++; unmatchedNames.push(raw); continue; }
    if (empties.length === 0) continue; // all their apps already have photos

    const unique = dedupe(files).slice(0, MAX_PER_APP);
    if (unique.length === 0) continue;

    // Normalize + upload each unique file once; reuse the Blob URL across years.
    const urls: string[] = [];
    for (const u of unique) {
      let url = blobByHash.get(u.hash);
      if (!url) {
        if (COMMIT) {
          const jpeg = await normalizeToJpeg(u.file);
          if (!jpeg) continue;
          const safe = norm(raw).replace(/ /g, "-").slice(0, 40);
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

    for (const t of empties) {
      console.log(`  ${raw} → app ${t.id}/${t.year}: ${urls.length} photos`);
      if (COMMIT) {
        await db.insert(applicationPhotos).values(
          urls.map((url, i) => ({ applicationId: t.id, url, position: i })),
        );
      }
      byYear.set(t.year, (byYear.get(t.year) ?? 0) + 1);
      appsFilled++;
      photosInserted += urls.length;
    }
  }

  console.log("\n=== Summary ===");
  console.log(`Apps filled: ${appsFilled} | photo rows inserted: ${photosInserted} | unique uploads: ${uploads}`);
  console.log("By year:");
  [...byYear.entries()].sort((a, b) => a[0] - b[0]).forEach(([y, n]) => console.log(`  ${y}: ${n}`));
  console.log(`\nUnmatched backfill names (${unmatched}) — mostly business names needing an alias:`);
  console.log(unmatchedNames.sort().join(" | "));
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
