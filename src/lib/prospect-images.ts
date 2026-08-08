import { put } from "@vercel/blob";
import { eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { prospectImages, prospects } from "@/db/schema";
import { extractSiteImages } from "@/lib/site-images";

/**
 * Cache scraped prospect reference images into Vercel Blob. The research URLs are
 * third-party hotlinks (Shopify/Squarespace CDNs) that can rot, hotlink-block, or
 * throttle; once cached we serve our own copy so the triage deck never stalls on
 * a broken image. Admin-only content — these are never shown publicly.
 *
 * No "server-only" pragma so the import script can call it under tsx; it uses the
 * Blob token + Node fetch and must only ever run server-side.
 */

const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};

// A browser-ish UA + Accept; many CDNs 403 a bare fetch.
const FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
  Accept: "image/avif,image/webp,image/png,image/jpeg,*/*",
};

async function cacheOne(img: { id: number; prospectId: number; sourceUrl: string }) {
  const res = await fetch(img.sourceUrl, { headers: FETCH_HEADERS, redirect: "follow" });
  if (!res.ok) return false;
  const ct = (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  const ext = EXT[ct];
  if (!ext) return false;
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 500 || buf.length > 12_000_000) return false; // skip tracking pixels / huge files
  const blob = await put(`prospects/${img.prospectId}/${img.id}.${ext}`, buf, {
    access: "public",
    contentType: ct,
    addRandomSuffix: false,
    allowOverwrite: true,
  });
  await db.update(prospectImages).set({ blobUrl: blob.url }).where(eq(prospectImages.id, img.id));
  return true;
}

/**
 * Pull reference photos from each prospect's own website for prospects that have
 * a site but no images yet. Uses NO web-search quota — it just fetches the
 * artist's page and extracts og:image + a few in-page photos. This is what
 * populates the bulk of the imported prospects (the spreadsheet had no images).
 * Best-effort; a site that blocks us or has no usable images is simply skipped.
 */
export async function enrichProspectImagesFromSites(opts: { limit?: number } = {}) {
  const haveImages = new Set(
    (await db.select({ pid: prospectImages.prospectId }).from(prospectImages)).map((r) => r.pid),
  );
  const candidates = (
    await db
      .select({ id: prospects.id, website: prospects.website })
      .from(prospects)
      .where(sql`${prospects.website} is not null`)
  )
    .filter((r) => r.website && !haveImages.has(r.id))
    .slice(0, opts.limit ?? 200);

  let processed = 0;
  let withImages = 0;
  let imagesAdded = 0;
  for (const c of candidates) {
    processed++;
    try {
      const urls = await extractSiteImages(c.website!, 4);
      if (urls.length) {
        await db
          .insert(prospectImages)
          .values(urls.map((sourceUrl, position) => ({ prospectId: c.id, sourceUrl, position })));
        withImages++;
        imagesAdded += urls.length;
      }
    } catch (e) {
      console.error(`[enrich-images] prospect ${c.id} failed:`, e);
    }
    await new Promise((res) => setTimeout(res, 120)); // gentle pacing
  }
  return { processed, withImages, imagesAdded };
}

/** Cache every prospect image that isn't in Blob yet. Best-effort per image. */
export async function cachePendingProspectImages(opts: { limit?: number } = {}) {
  const rows = await db
    .select({
      id: prospectImages.id,
      prospectId: prospectImages.prospectId,
      sourceUrl: prospectImages.sourceUrl,
    })
    .from(prospectImages)
    .where(isNull(prospectImages.blobUrl))
    .limit(opts.limit ?? 1000);

  let cached = 0;
  let failed = 0;
  for (const r of rows) {
    try {
      if (await cacheOne(r)) cached++;
      else failed++;
    } catch {
      failed++;
    }
    await new Promise((res) => setTimeout(res, 80)); // gentle pacing
  }
  return { total: rows.length, cached, failed };
}
