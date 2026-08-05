"use client";

import { useState } from "react";
import { Flower } from "@/components/brand";

/**
 * Image with a branded fallback. Historical (2024) photos are Google Drive
 * links that block hotlinking; real uploads (Vercel Blob) load normally.
 */
export function SafeImg({
  src,
  alt,
  className = "",
  flowerSize = 22,
}: {
  src: string | null;
  alt: string;
  className?: string;
  flowerSize?: number;
}) {
  const [failed, setFailed] = useState(!src);
  if (failed || !src) {
    return (
      <div className={`flex items-center justify-center bg-cream ${className}`}>
        <Flower size={flowerSize} color="var(--color-fuchsia)" />
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className={className} loading="lazy" onError={() => setFailed(true)} />
  );
}
