// Client-side share-card generator. Composites an artist's photo + market
// branding into a downloadable/shareable JPEG. Browser-only (uses canvas);
// import from client components only. Shared by the artist portal's SharePanel
// and the judges' social-kit download hub.
import { site } from "@/lib/site";

const d0 = new Date(site.event.days[0].date + "T00:00");
const d1 = new Date(site.event.days[1].date + "T00:00");

export type ShareCardKind = "square" | "story";

// Bright, legible-on-dark accents; one is picked per artist so the weekly
// spotlights feel like a set without being identical.
const ACCENTS = ["#c6e34d", "#45bced", "#f472c0", "#f5a04a", "#4bd0c0", "#ffd24a"];
function accentFor(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return ACCENTS[h % ACCENTS.length];
}

type SpacedCtx = CanvasRenderingContext2D & { letterSpacing?: string };
function setSpacing(ctx: CanvasRenderingContext2D, value: string) {
  (ctx as SpacedCtx).letterSpacing = value;
}

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image load failed"));
    img.src = url;
  });
}

// Load the wordmark once and reuse it across generated cards.
let logoPromise: Promise<HTMLImageElement> | null = null;
function loadLogo() {
  if (!logoPromise) logoPromise = loadImage("/brand/logo-athens-holiday-market.svg");
  return logoPromise;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** object-fit: cover math for drawing an image into a box. */
function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const r = Math.max(w / img.width, h / img.height);
  const iw = img.width * r;
  const ih = img.height * r;
  ctx.drawImage(img, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih);
}

function ellipsize(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + "…").width > maxWidth) t = t.slice(0, -1);
  return t + "…";
}

export async function makeShareCard(
  kind: ShareCardKind,
  photoUrl: string | null,
  name: string,
  medium: string,
): Promise<Blob> {
  const [w, h] = kind === "square" ? [1080, 1080] : [1080, 1920];
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;

  // Background
  ctx.fillStyle = "#faf5ea";
  ctx.fillRect(0, 0, w, h);

  const photoH = Math.round(h * (kind === "square" ? 0.67 : 0.62));
  if (photoUrl) {
    try {
      const img = await loadImage(photoUrl);
      drawCover(ctx, img, 0, 0, w, photoH);
    } catch {
      ctx.fillStyle = "#e9e2d0";
      ctx.fillRect(0, 0, w, photoH);
    }
  }

  // Small logo badge, top-left over the photo — snug white surround so it
  // brands the image without covering the art.
  try {
    const logo = await loadLogo();
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
  } catch {
    /* logo optional — skip if it fails to load */
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

  const font = '"Helvetica Neue", Helvetica, Arial, sans-serif';
  const pad = 72;
  let y = photoH + 96;
  ctx.textBaseline = "alphabetic";

  // Eyebrow — the artist's medium, uppercase in the accent color.
  ctx.fillStyle = accent;
  ctx.font = `700 27px ${font}`;
  setSpacing(ctx, "3px");
  ctx.fillText(ellipsize(ctx, (medium || site.name).toUpperCase(), w - pad * 2), pad, y);
  setSpacing(ctx, "0px");
  y += 76;

  // Artist name — the hero.
  ctx.fillStyle = "#ffffff";
  ctx.font = `800 70px ${font}`;
  ctx.fillText(ellipsize(ctx, name, w - pad * 2), pad, y);
  y += 40;

  // Short accent divider.
  ctx.fillStyle = accent;
  ctx.fillRect(pad, y, 84, 4);
  y += 46;

  // Event footer.
  ctx.fillStyle = "rgba(255,255,255,0.66)";
  ctx.font = `600 25px ${font}`;
  setSpacing(ctx, "1.5px");
  ctx.fillText(
    `${site.name.toUpperCase()}  ·  DEC ${d0.getDate()}–${d1.getDate()}  ·  ${site.event.timeLabel.toUpperCase()}`,
    pad,
    y,
  );
  setSpacing(ctx, "0px");

  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("export failed"))), "image/jpeg", 0.92),
  );
}
