import { put } from "@vercel/blob";
import sharp from "sharp";
import { eq, isNull, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { prospectImages, prospects } from "@/db/schema";
import { extractSiteImages } from "@/lib/site-images";

/**
 * Prospect reference images. We want PICTURES OF THE WORK — not logos, social
 * glyphs, or pixelated thumbnails. Every candidate is downloaded and measured
 * with sharp; only real, sufficiently large, non-banner images are kept and
 * cached to Vercel Blob. Admin-only content, never shown publicly.
 *
 * No "server-only" pragma so the import/enrich scripts can call it under tsx.
 */

const EXT: Record<string, string> = {
  jpeg: "jpg",
  jpg: "jpg",
  png: "png",
  webp: "webp",
  avif: "avif",
  gif: "gif",
};

const FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
  Accept: "image/avif,image/webp,image/png,image/jpeg,*/*",
};

/**
 * A candidate qualifies as "a picture of the work" if it's reasonably large and
 * not logo/banner-shaped. Logos, social icons, and pixelated thumbnails are
 * small; banners/wordmarks are extremely wide. Real photos clear both.
 */
export function passesImageQuality(meta: { width?: number; height?: number }): boolean {
  const w = meta.width ?? 0;
  const h = meta.height ?? 0;
  if (!w || !h) return false;
  if (Math.max(w, h) < 500) return false; // too small — icons, logos, pixelated thumbs
  if (Math.min(w, h) < 300) return false; // skinny strips
  const ratio = Math.max(w, h) / Math.min(w, h);
  if (ratio > 2.6) return false; // banners / logo bars
  return true;
}

async function fetchImageBuffer(url: string): Promise<Buffer | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 9000);
    const res = await fetch(url, { headers: FETCH_HEADERS, redirect: "follow", signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 1500 || buf.length > 15_000_000) return null;
    return buf;
  } catch {
    return null;
  }
}

/** Download + measure a candidate; cache to Blob only if it's a real work photo. */
async function cacheGoodImage(
  prospectId: number,
  position: number,
  sourceUrl: string,
): Promise<{ sourceUrl: string; blobUrl: string } | null> {
  const buf = await fetchImageBuffer(sourceUrl);
  if (!buf) return null;
  const meta = await sharp(buf)
    .metadata()
    .catch(() => null);
  if (!meta || !passesImageQuality(meta)) return null;
  const ext = EXT[meta.format ?? ""] ?? "jpg";
  const blob = await put(`prospects/${prospectId}/${position}-${Date.now()}.${ext}`, buf, {
    access: "public",
    contentType: `image/${meta.format ?? "jpeg"}`,
    addRandomSuffix: false,
    allowOverwrite: true,
  });
  return { sourceUrl, blobUrl: blob.url };
}

/**
 * Extract candidate photos from a prospect's website, keep only the good ones
 * (measured), cache them to Blob, and store up to `max`. Returns how many were
 * added. Shared by the backfill and the auto-scout enrichment.
 */
export async function enrichProspectImages(prospectId: number, website: string, max = 4) {
  const candidates = await extractSiteImages(website, 14); // gather generously; we filter hard
  const good: { sourceUrl: string; blobUrl: string }[] = [];
  for (const url of candidates) {
    if (good.length >= max) break;
    try {
      const g = await cacheGoodImage(prospectId, good.length, url);
      if (g) good.push(g);
    } catch (e) {
      console.error(`[enrich-images] ${url} failed:`, e);
    }
    await new Promise((r) => setTimeout(r, 60));
  }
  if (good.length) {
    await db
      .insert(prospectImages)
      .values(good.map((g, i) => ({ prospectId, sourceUrl: g.sourceUrl, blobUrl: g.blobUrl, position: i })));
  }
  return good.length;
}

/** Backfill: enrich every prospect that has a website but no images yet. */
export async function enrichProspectImagesFromSites(opts: { limit?: number } = {}) {
  const haveImages = new Set(
    (await db.select({ pid: prospectImages.prospectId }).from(prospectImages)).map((r) => r.pid),
  );
  const candidates = (
    await db
      .select({ id: prospects.id, website: prospects.website })
      .from(prospects)
      .where(isNotNull(prospects.website))
  )
    .filter((r) => r.website && !haveImages.has(r.id))
    .slice(0, opts.limit ?? 200);

  let processed = 0;
  let withImages = 0;
  let imagesAdded = 0;
  for (const c of candidates) {
    processed++;
    const n = await enrichProspectImages(c.id, c.website!, 4);
    if (n) {
      withImages++;
      imagesAdded += n;
    }
  }
  return { processed, withImages, imagesAdded };
}

/**
 * Cache any prospect image row that has a source URL but no Blob copy yet
 * (e.g. lookbook seeds), applying the same quality gate — a candidate that
 * fails (logo/too small) has its row deleted rather than cached.
 */
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
      const buf = await fetchImageBuffer(r.sourceUrl);
      const meta = buf ? await sharp(buf).metadata().catch(() => null) : null;
      if (!buf || !meta || !passesImageQuality(meta)) {
        await db.delete(prospectImages).where(eq(prospectImages.id, r.id));
        failed++;
        continue;
      }
      const ext = EXT[meta.format ?? ""] ?? "jpg";
      const blob = await put(`prospects/${r.prospectId}/${r.id}.${ext}`, buf, {
        access: "public",
        contentType: `image/${meta.format ?? "jpeg"}`,
        addRandomSuffix: false,
        allowOverwrite: true,
      });
      await db.update(prospectImages).set({ blobUrl: blob.url }).where(eq(prospectImages.id, r.id));
      cached++;
    } catch {
      failed++;
    }
    await new Promise((res) => setTimeout(res, 60));
  }
  return { total: rows.length, cached, failed };
}
