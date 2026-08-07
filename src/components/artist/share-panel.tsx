"use client";

import { useState } from "react";
import { site } from "@/lib/site";

const d0 = new Date(site.event.days[0].date + "T00:00");
const d1 = new Date(site.event.days[1].date + "T00:00");
const DATE_LABEL = `Dec ${d0.getDate()}–${d1.getDate()}, ${site.event.year}`;

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

type Kind = "square" | "story";

async function makeCard(
  kind: Kind,
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
  // Eyebrow
  ctx.fillStyle = "#c6e34d"; // chartreuse
  ctx.font = "700 30px Jost, Arial, sans-serif";
  ctx.fillText("FIND ME AT THE", pad, y);
  y += 78;

  // Event name
  ctx.fillStyle = "#ffffff";
  ctx.font = "800 76px Jost, Arial, sans-serif";
  ctx.fillText("Athens Holiday Market", pad, y);
  y += 66;

  // Date + place
  ctx.fillStyle = "rgba(255,255,255,0.72)";
  ctx.font = "500 34px Jost, Arial, sans-serif";
  ctx.fillText(`${DATE_LABEL} · ${site.location.name}`, pad, y);
  y += 74;

  // Artist name (accent)
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

export function SharePanel({
  name,
  medium,
  slug,
  photoUrl,
}: {
  name: string;
  medium: string;
  slug: string;
  photoUrl: string | null;
}) {
  const [busy, setBusy] = useState<Kind | null>(null);
  const [err, setErr] = useState("");
  const [copied, setCopied] = useState<number | null>(null);

  const pageUrl = `${site.url}/artists/${slug}`;
  const first = name.split(" ")[0];
  const captions = [
    `I'll be at the ${site.name}! Come find my ${medium.toLowerCase() || "work"} in the Big City Bread courtyard, ${DATE_LABEL}. See my booth → ${pageUrl} ${site.social.hashtag}`,
    `Counting down to the ${site.name} 🎁 Handmade goods and a courtyard full of local makers, ${DATE_LABEL} at Big City Bread. Come say hi at my booth → ${pageUrl} ${site.social.hashtag} ${site.social.instagram}`,
  ];

  async function share(kind: Kind) {
    setErr("");
    setBusy(kind);
    try {
      const blob = await makeCard(kind, photoUrl, name, medium);
      const file = new File([blob], `${slug}-${kind}.jpg`, { type: "image/jpeg" });
      const nav = navigator as Navigator & { canShare?: (d?: ShareData) => boolean };
      if (nav.canShare?.({ files: [file] })) {
        await nav.share({ files: [file], text: captions[0] });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = file.name;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      if ((e as Error)?.name !== "AbortError") setErr("Couldn't make the image. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  async function copyCaption(i: number) {
    try {
      await navigator.clipboard.writeText(captions[i]);
      setCopied(i);
      setTimeout(() => setCopied((c) => (c === i ? null : c)), 1800);
    } catch {
      setErr("Couldn't copy. Please select and copy manually.");
    }
  }

  return (
    <div className="rounded-xl bg-white p-5 shadow-[var(--shadow-card)]">
      <h2 className="font-display text-lg font-extrabold">Share your work</h2>
      <p className="mt-0.5 text-sm text-ink-soft">
        Tell your followers where to find you. Tap a size to save or share a ready-made graphic, then
        copy a caption to go with it. Tag {site.social.instagram} and we&apos;ll reshare you.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => share("square")}
          disabled={busy !== null}
          className="rounded-md bg-fern-deep px-4 py-2 text-sm font-bold text-white hover:opacity-90 disabled:opacity-60"
        >
          {busy === "square" ? "Preparing…" : "Post / Feed image"}
        </button>
        <button
          type="button"
          onClick={() => share("story")}
          disabled={busy !== null}
          className="rounded-md border-2 border-ink/15 px-4 py-2 text-sm font-semibold hover:bg-cream disabled:opacity-60"
        >
          {busy === "story" ? "Preparing…" : "Story image"}
        </button>
      </div>

      {err && <p className="mt-2 text-sm font-medium text-poppy">{err}</p>}

      <div className="mt-5 space-y-3">
        <p className="text-sm font-bold text-ink">Captions</p>
        {captions.map((c, i) => (
          <div key={i} className="rounded-lg bg-cream-soft p-3">
            <p className="whitespace-pre-line text-sm leading-relaxed text-ink-soft">{c}</p>
            <button
              type="button"
              onClick={() => copyCaption(i)}
              className="mt-2 rounded-md border-2 border-ink/15 px-3 py-1 text-xs font-semibold hover:bg-cream"
            >
              {copied === i ? "Copied ✓" : "Copy caption"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
