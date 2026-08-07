/**
 * Migrate locally-downloaded past-application photos (public/photos/backfill/)
 * to Vercel Blob, replacing the Drive URLs still stored in application_photos.
 *
 * Bridge key: the Drive form-response filenames embed the artist name after
 * " - ", e.g. "IMG_7025 - Daniel Schmidt.jpeg". We match that to
 * applications.name. Remaining Drive photos live only in 2017/2019/2021/2022,
 * so an artist with Drive photos in exactly one of those years is unambiguous.
 *
 * Usage:
 *   npx tsx scripts/migrate-backfill.ts            # dry run (no writes)
 *   npx tsx scripts/migrate-backfill.ts --commit   # unambiguous names only
 *   npx tsx scripts/migrate-backfill.ts --commit --ambiguous  # + multi-year
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { eq, like, inArray } from "drizzle-orm";
import { put } from "@vercel/blob";
import { db } from "../src/db";
import { applications, applicationPhotos, cycles } from "../src/db/schema";

const BACKFILL_DIR = path.join(process.cwd(), "public/photos/backfill");
const COMMIT = process.argv.includes("--commit");
const INCLUDE_AMBIGUOUS = process.argv.includes("--ambiguous");
const MAX_PER_APP = 6; // soft cap on gallery size

const norm = (s: string) =>
  s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

/**
 * Backfill filenames that use a business/booth name the DB stores under the
 * person's name. Maps normalized backfill name → normalized applications.name.
 * (Verified by hand against the DB; multi-year targets resolve to newest year.)
 */
const ALIASES: Record<string, string> = {
  "very good puzzle": "very good puzzle paige dixon brian dixon",
  "brian dixon": "paige brian dixon",
  "chalises": "adrienne chappell",
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

function contentType(file: string): string {
  const ext = path.extname(file).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".gif") return "image/gif";
  if (ext === ".heic" || ext === ".heif") return "image/heic";
  return "image/jpeg";
}

/** Dedupe files by content hash, keep a stable (basename-sorted) order. */
function dedupe(files: string[]): { file: string; hash: string; buf: Buffer }[] {
  const seen = new Map<string, { file: string; hash: string; buf: Buffer }>();
  for (const f of files.sort((a, b) => path.basename(a).localeCompare(path.basename(b)))) {
    const buf = fs.readFileSync(f);
    if (buf.length < 1500) continue; // skip corrupt/placeholder
    const hash = crypto.createHash("sha256").update(buf).digest("hex").slice(0, 16);
    if (!seen.has(hash)) seen.set(hash, { file: f, hash, buf });
  }
  return [...seen.values()];
}

async function main() {
  console.log(`Mode: ${COMMIT ? "COMMIT" : "DRY RUN"}${INCLUDE_AMBIGUOUS ? " +ambiguous" : ""}\n`);

  // Group backfill files by normalized artist name.
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
  const appsByName = new Map<string, { id: number; year: number }[]>();
  const appsByEmail = new Map<string, { id: number; year: number }[]>();
  for (const a of apps) {
    const k = norm(a.name);
    if (!appsByName.has(k)) appsByName.set(k, []);
    appsByName.get(k)!.push({ id: a.id, year: a.year });
    if (a.email) {
      const ek = a.email.toLowerCase().trim();
      if (!appsByEmail.has(ek)) appsByEmail.set(ek, []);
      appsByEmail.get(ek)!.push({ id: a.id, year: a.year });
    }
  }
  /** Resolve a backfill artist key to candidate apps: direct name, alias, or email. */
  const lookup = (key: string, raw: string): { id: number; year: number }[] => {
    if (appsByName.has(key)) return appsByName.get(key)!;
    if (ALIASES[key] && appsByName.has(ALIASES[key])) return appsByName.get(ALIASES[key])!;
    if (raw.includes("@") && appsByEmail.has(raw.toLowerCase().trim())) return appsByEmail.get(raw.toLowerCase().trim())!;
    return [];
  };

  const drivePhotos = await db
    .select({ id: applicationPhotos.id, applicationId: applicationPhotos.applicationId })
    .from(applicationPhotos)
    .where(like(applicationPhotos.url, "%drive.google%"));
  const driveByApp = new Map<number, number[]>();
  for (const p of drivePhotos) {
    if (!driveByApp.has(p.applicationId)) driveByApp.set(p.applicationId, []);
    driveByApp.get(p.applicationId)!.push(p.id);
  }

  // Apps that already hold a migrated backfill photo. Guards idempotency for
  // multi-year artists: once one of an artist's years is migrated, dropping its
  // Drive rows would otherwise promote the NEXT year to "most recent" and copy
  // the photos again. If any of an artist's apps is already backfilled, skip.
  const backfilled = await db
    .select({ applicationId: applicationPhotos.applicationId })
    .from(applicationPhotos)
    .where(like(applicationPhotos.url, "%/archive/backfill/%"));
  const backfilledApps = new Set(backfilled.map((b) => b.applicationId));

  const blobByHash = new Map<string, string>(); // hash -> blob url (upload once)
  let namesMigrated = 0, appsMigrated = 0, photosInserted = 0, filesUploaded = 0;
  const ambiguous: string[] = [], nomatch: string[] = [];

  for (const [k, { raw, files }] of byArtist) {
    const allCandidates = lookup(k, raw);
    // Already handled in a prior run — don't re-migrate to another year.
    if (allCandidates.some((a) => backfilledApps.has(a.id))) continue;
    let targets = allCandidates.filter((a) => driveByApp.has(a.id));
    if (targets.length === 0) { nomatch.push(`${raw} (${files.length}f)`); continue; }
    if (targets.length > 1) {
      if (!INCLUDE_AMBIGUOUS) {
        ambiguous.push(`${raw} (${files.length}f) -> ${targets.map((t) => `app${t.id}/${t.year}`).join(", ")}`);
        continue;
      }
      // Ambiguous multi-year artist: attach photos to the most recent year only;
      // leave older years on Drive (we can't split photos back to a year).
      const newest = targets.reduce((a, b) => (b.year > a.year ? b : a));
      targets = [newest];
    }

    const unique = dedupe(files).slice(0, MAX_PER_APP);
    if (unique.length === 0) continue;

    for (const t of targets) {
      const driveRowIds = driveByApp.get(t.id)!;
      console.log(`  ${raw} → app ${t.id}/${t.year}: ${unique.length} photos (drops ${driveRowIds.length} Drive rows)`);
      if (COMMIT) {
        // Upload each unique file once (reuse the blob URL if we've seen the hash).
        const urls: string[] = [];
        for (const u of unique) {
          let url = blobByHash.get(u.hash);
          if (!url) {
            const safe = norm(raw).replace(/ /g, "-").slice(0, 40);
            const ext = path.extname(u.file).toLowerCase().replace(".", "") || "jpg";
            const blob = await put(`archive/backfill/${safe}-${u.hash}.${ext}`, u.buf, {
              access: "public",
              contentType: contentType(u.file),
              addRandomSuffix: false,
              allowOverwrite: true,
            });
            url = blob.url;
            blobByHash.set(u.hash, url);
            filesUploaded++;
          }
          urls.push(url);
        }
        // neon-http has no transactions. Insert the blob rows first, then drop
        // the Drive rows — a mid-run failure leaves extra rows, never a gap, and
        // re-running is safe (migrated apps no longer match the Drive query).
        await db.insert(applicationPhotos).values(
          urls.map((url, i) => ({ applicationId: t.id, url, position: i })),
        );
        await db.delete(applicationPhotos).where(inArray(applicationPhotos.id, driveRowIds));
      }
      appsMigrated++;
      photosInserted += unique.length;
    }
    namesMigrated++;
  }

  console.log("\n=== Summary ===");
  console.log(`Names migrated: ${namesMigrated} | apps updated: ${appsMigrated} | photo rows inserted: ${photosInserted} | blob uploads: ${filesUploaded}`);
  console.log(`Skipped ambiguous (multi-year): ${ambiguous.length} names`);
  console.log(`No drive-photo match: ${nomatch.length} names`);
  if (!INCLUDE_AMBIGUOUS && ambiguous.length) {
    console.log("\n--- Ambiguous (run with --ambiguous to migrate, same photo set to each year) ---");
    console.log(ambiguous.join("\n"));
  }
  console.log(`\n--- No-match names (${nomatch.length}) ---`);
  console.log(nomatch.join("\n"));
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
