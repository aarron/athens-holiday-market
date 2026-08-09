import "server-only";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  createCanvas,
  loadImage,
  GlobalFonts,
  type Image,
  type SKRSContext2D,
} from "@napi-rs/canvas";
import { zipSync } from "fflate";
import { put } from "@vercel/blob";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { applications, applicationPhotos } from "@/db/schema";
import { site } from "@/lib/site";

/**
 * Server-side branded spotlight cards. This is the Node/canvas twin of the
 * browser generator in `share-card.ts` — same layout, so the emailed kit matches
 * what artists download in their portal. Kept server-only: it reads the brand
 * font + logo from disk and is used to pre-build a zip cached to Vercel Blob
 * (never rendered at request time — see the posting-team auto-email).
 */

export type ShareCardKind = "square" | "story";

const d0 = new Date(site.event.days[0].date + "T00:00");
const d1 = new Date(site.event.days[1].date + "T00:00");

const FONT = "Jost";
const ACCENTS = ["#c6e34d", "#45bced", "#f472c0", "#f5a04a", "#4bd0c0", "#ffd24a"];
function accentFor(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return ACCENTS[h % ACCENTS.length];
}

// Register the brand font once (variable Jost, traced from public/ — see
// next.config outputFileTracingIncludes).
let fontReady = false;
function ensureFont() {
  if (fontReady) return;
  try {
    GlobalFonts.register(readFileSync(path.join(process.cwd(), "public/kit/jost.ttf")), FONT);
  } catch (e) {
    console.error("[social-kit] font register failed (falling back to system):", e);
  }
  fontReady = true;
}

// Load + cache the wordmark logo once (best-effort — the card is still valid
// without it).
let logoPromise: Promise<Image | null> | null = null;
function loadLogo() {
  if (!logoPromise) {
    logoPromise = loadImage(readFileSync(path.join(process.cwd(), "public/brand/logo.png"))).catch(
      () => null,
    );
  }
  return logoPromise;
}

/** Fetch a remote photo (Blob URL) into an Image, or null on any failure. */
async function loadPhoto(url: string | null): Promise<Image | null> {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await loadImage(Buffer.from(await res.arrayBuffer()));
  } catch {
    return null;
  }
}

function setSpacing(ctx: SKRSContext2D, value: string) {
  (ctx as unknown as { letterSpacing?: string }).letterSpacing = value;
}

function roundRect(ctx: SKRSContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** object-fit: cover math for drawing an image into a box. */
function drawCover(ctx: SKRSContext2D, img: Image, x: number, y: number, w: number, h: number) {
  const r = Math.max(w / img.width, h / img.height);
  const iw = img.width * r;
  const ih = img.height * r;
  ctx.drawImage(img, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih);
}

function ellipsize(ctx: SKRSContext2D, text: string, maxWidth: number) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + "…").width > maxWidth) t = t.slice(0, -1);
  return t + "…";
}

/** Draw one branded spotlight card and encode it to a JPEG buffer. */
async function drawCard(
  kind: ShareCardKind,
  photo: Image | null,
  name: string,
  medium: string,
): Promise<Buffer> {
  ensureFont();
  const [w, h] = kind === "square" ? [1080, 1080] : [1080, 1920];
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext("2d");

  // Background
  ctx.fillStyle = "#faf5ea";
  ctx.fillRect(0, 0, w, h);

  const photoH = Math.round(h * (kind === "square" ? 0.67 : 0.62));
  if (photo) {
    drawCover(ctx, photo, 0, 0, w, photoH);
  } else {
    ctx.fillStyle = "#e9e2d0";
    ctx.fillRect(0, 0, w, photoH);
  }

  // Small logo badge, top-left over the photo.
  const logo = await loadLogo();
  if (logo) {
    const chipW = Math.round(w * 0.2);
    const inset = Math.round(chipW * 0.07);
    const logoW = chipW - inset * 2;
    const logoH = logoW * (logo.height / logo.width);
    const chipH = logoH + inset * 2;
    const m = 32;
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.3)";
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 4;
    ctx.fillStyle = "#ffffff";
    roundRect(ctx, m, m, chipW, chipH, 14);
    ctx.fill();
    ctx.restore();
    ctx.drawImage(logo, m + inset, m + inset, logoW, logoH);
  }

  // Soft gradient so the photo dissolves into the band instead of a hard edge.
  const scrimH = Math.round(h * 0.14);
  const grad = ctx.createLinearGradient(0, photoH - scrimH, 0, photoH);
  grad.addColorStop(0, "rgba(23,22,27,0)");
  grad.addColorStop(1, "rgba(23,22,27,1)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, photoH - scrimH, w, scrimH);

  // Bottom band + accent rule along its top edge.
  const accent = accentFor(name);
  ctx.fillStyle = "#17161b";
  ctx.fillRect(0, photoH, w, h - photoH);
  ctx.fillStyle = accent;
  ctx.fillRect(0, photoH, w, 8);

  const pad = 72;
  let y = photoH + 96;
  ctx.textBaseline = "alphabetic";

  // Eyebrow — the artist's medium, uppercase in the accent color.
  ctx.fillStyle = accent;
  ctx.font = `700 27px ${FONT}`;
  setSpacing(ctx, "3px");
  ctx.fillText(ellipsize(ctx, (medium || site.name).toUpperCase(), w - pad * 2), pad, y);
  setSpacing(ctx, "0px");
  y += 76;

  // Artist name — the hero.
  ctx.fillStyle = "#ffffff";
  ctx.font = `800 70px ${FONT}`;
  ctx.fillText(ellipsize(ctx, name, w - pad * 2), pad, y);
  y += 40;

  // Short accent divider.
  ctx.fillStyle = accent;
  ctx.fillRect(pad, y, 84, 4);
  y += 46;

  // Event footer.
  ctx.fillStyle = "rgba(255,255,255,0.66)";
  ctx.font = `600 25px ${FONT}`;
  setSpacing(ctx, "1.5px");
  ctx.fillText(
    `${site.name.toUpperCase()}  ·  DEC ${d0.getDate()}–${d1.getDate()}  ·  ${site.event.timeLabel.toUpperCase()}`,
    pad,
    y,
  );
  setSpacing(ctx, "0px");

  return canvas.encode("jpeg", 92);
}

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

/** Run async tasks with a bounded concurrency (keeps memory + sockets in check). */
async function mapPool<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx]);
    }
  });
  await Promise.all(workers);
  return out;
}

/**
 * Render a feed + story spotlight for every accepted artist in a cycle and pack
 * them into a single zip (stored, not deflated — JPEGs are already compressed).
 * Sourced from application photos, which exist from the moment of acceptance
 * (before artists build their own pages).
 */
export async function buildSpotlightZip(cycleId: number): Promise<{ zip: Uint8Array; count: number }> {
  const apps = await db
    .select({ id: applications.id, name: applications.name, medium: applications.medium })
    .from(applications)
    .where(and(eq(applications.cycleId, cycleId), eq(applications.status, "accepted")));

  const ids = apps.map((a) => a.id);
  const photoRows = ids.length
    ? await db
        .select({
          applicationId: applicationPhotos.applicationId,
          url: applicationPhotos.url,
          position: applicationPhotos.position,
        })
        .from(applicationPhotos)
        .where(inArray(applicationPhotos.applicationId, ids))
        .orderBy(asc(applicationPhotos.position))
    : [];
  const firstPhoto = new Map<number, string>();
  for (const p of photoRows) if (!firstPhoto.has(p.applicationId)) firstPhoto.set(p.applicationId, p.url);

  const files: Record<string, Uint8Array> = {};
  await mapPool(apps, 4, async (a) => {
    const photo = await loadPhoto(firstPhoto.get(a.id) ?? null);
    const base = `${slugify(a.name) || `artist-${a.id}`}-${a.id}`;
    const [feed, story] = await Promise.all([
      drawCard("square", photo, a.name, a.medium ?? ""),
      drawCard("story", photo, a.name, a.medium ?? ""),
    ]);
    files[`${base}-feed.jpg`] = new Uint8Array(feed);
    files[`${base}-story.jpg`] = new Uint8Array(story);
  });

  const zip = zipSync(files, { level: 0 });
  return { zip, count: apps.length };
}

/**
 * Build the spotlight zip for a cycle and upload it to a stable Blob path. The
 * URL never changes across rebuilds (overwrite in place), so it's safe to email
 * once and refresh silently as more artists are accepted.
 */
export async function publishSpotlightZip(cycleId: number): Promise<{ url: string; count: number }> {
  const { zip, count } = await buildSpotlightZip(cycleId);
  const blob = await put(`social-kit/${cycleId}/athens-holiday-market-social-kit.zip`, Buffer.from(zip), {
    access: "public",
    contentType: "application/zip",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
  return { url: blob.url, count };
}
