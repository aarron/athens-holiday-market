"use client";

import { useState } from "react";
import { site } from "@/lib/site";
import { makeShareCard, type ShareCardKind as Kind } from "@/lib/share-card";
import { Button } from "@/components/ui/button";
import { StatusMessage } from "@/components/ui/status-message";

const d0 = new Date(site.event.days[0].date + "T00:00");
const d1 = new Date(site.event.days[1].date + "T00:00");
const DATE_LABEL = `Dec ${d0.getDate()}–${d1.getDate()}, ${site.event.year}`;

export function SharePanel({
  name,
  medium,
  slug,
  photoUrl,
  published = true,
}: {
  name: string;
  medium: string;
  slug: string;
  photoUrl: string | null;
  published?: boolean;
}) {
  const [busy, setBusy] = useState<Kind | null>(null);
  const [err, setErr] = useState("");
  const [copied, setCopied] = useState<number | null>(null);

  const pageUrl = `${site.url}/artists/${slug}`;
  const captions = [
    `I'll be at the ${site.name}! Come find my ${medium.toLowerCase() || "work"} in the Big City Bread courtyard, ${DATE_LABEL}. See my booth → ${pageUrl} ${site.social.hashtag}`,
    `Counting down to the ${site.name} 🎁 Handmade goods and a courtyard full of local makers, ${DATE_LABEL} at Big City Bread. Come say hi at my booth → ${pageUrl} ${site.social.hashtag} ${site.social.instagram}`,
  ];

  async function share(kind: Kind) {
    setErr("");
    setBusy(kind);
    try {
      const blob = await makeShareCard(kind, photoUrl, name, medium);
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
        <Button
          variant="confirm"
          size="sm"
          onClick={() => share("square")}
          disabled={busy !== null}
          loading={busy === "square"}
          loadingLabel="Preparing…"
        >
          Post / Feed image
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => share("story")}
          disabled={busy !== null}
          loading={busy === "story"}
          loadingLabel="Preparing…"
        >
          Story image
        </Button>
      </div>

      {err && <StatusMessage tone="error" className="mt-2">{err}</StatusMessage>}

      {!published && (
        <p className="mt-3 rounded-lg bg-cream-soft px-3 py-2 text-xs leading-relaxed text-ink-soft">
          Your images are ready to download and post now. The booth link in the captions goes live
          the moment we publish your page — so you may want to hold the captioned posts until then.
        </p>
      )}

      <div className="mt-5 space-y-3">
        <p className="text-sm font-bold text-ink">Captions</p>
        {captions.map((c, i) => (
          <div key={i} className="rounded-lg bg-cream-soft p-3">
            <p className="whitespace-pre-line text-sm leading-relaxed text-ink-soft">{c}</p>
            <button
              type="button"
              onClick={() => copyCaption(i)}
              className="mt-2 rounded-lg border-2 border-ink/15 px-3 py-1 text-xs font-semibold hover:bg-cream"
            >
              {copied === i ? "Copied ✓" : "Copy caption"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
