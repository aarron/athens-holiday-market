"use client";

import { useState } from "react";
import { FacebookIcon, ExternalIcon } from "@/components/icons";

/** Lightweight share row for a public artist page. */
export function ArtistShareButtons({ url, name }: { url: string; name: string }) {
  const [copied, setCopied] = useState(false);
  const text = `Meet ${name} at the Athens Holiday Market`;
  const fb = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
  const x = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;

  async function nativeShare() {
    if (navigator.share) {
      try {
        await navigator.share({ title: name, text, url });
      } catch {
        /* user dismissed */
      }
    } else {
      copy();
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  }

  const btn =
    "inline-flex items-center gap-1.5 rounded-full border-2 border-ink/15 px-3.5 py-1.5 text-sm font-semibold transition-colors hover:bg-cream";

  return (
    <div className="mt-6 flex flex-wrap items-center gap-2">
      <span className="text-sm font-semibold text-ink-soft">Share:</span>
      <button type="button" onClick={nativeShare} className={btn} aria-label="Share this artist">
        Share
        <ExternalIcon size={14} aria-hidden />
      </button>
      <a href={fb} target="_blank" rel="noreferrer" className={btn}>
        <FacebookIcon size={15} aria-hidden />
        Facebook
      </a>
      <a href={x} target="_blank" rel="noreferrer" className={btn}>
        X
      </a>
      <button type="button" onClick={copy} className={btn}>
        {copied ? "Link copied ✓" : "Copy link"}
      </button>
    </div>
  );
}
