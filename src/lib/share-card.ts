// Client-side share-card generator. Composites an artist's photo + market
// branding into a downloadable/shareable JPEG. Browser-only (uses canvas);
// import from client components only. Shared by the artist portal's SharePanel
// and the judges' social-kit download hub.
import { site } from "@/lib/site";

const d0 = new Date(site.event.days[0].date + "T00:00");
const d1 = new Date(site.event.days[1].date + "T00:00");
const DATE_LABEL = `Dec ${d0.getDate()}–${d1.getDate()}, ${site.event.year}`;

export type ShareCardKind = "square" | "story";

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

  const photoH = Math.round(h * (kind === "square" ? 0.7 : 0.62));
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

  // Bottom band
  ctx.fillStyle = "#17161b";
  ctx.fillRect(0, photoH, w, h - photoH);

  const pad = 72;
  let y = photoH + 96;

  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#c6e34d"; // chartreuse
  ctx.font = "700 30px Jost, Arial, sans-serif";
  ctx.fillText("FIND ME AT THE", pad, y);
  y += 78;

  ctx.fillStyle = "#ffffff";
  ctx.font = "800 76px Jost, Arial, sans-serif";
  ctx.fillText("Athens Holiday Market", pad, y);
  y += 66;

  ctx.fillStyle = "rgba(255,255,255,0.72)";
  ctx.font = "500 34px Jost, Arial, sans-serif";
  ctx.fillText(`${DATE_LABEL} · ${site.location.name}`, pad, y);
  y += 74;

  ctx.fillStyle = "#f472c0"; // fuchsia-light
  ctx.font = "800 54px Jost, Arial, sans-serif";
  ctx.fillText(ellipsize(ctx, name, w - pad * 2), pad, y);
  if (medium) {
    y += 46;
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.font = "500 30px Jost, Arial, sans-serif";
    ctx.fillText(ellipsize(ctx, medium, w - pad * 2), pad, y);
  }

  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("export failed"))), "image/jpeg", 0.92),
  );
}
