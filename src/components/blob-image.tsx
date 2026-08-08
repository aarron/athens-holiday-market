"use client";

import { useState } from "react";
import Image from "next/image";
import { Flower } from "@/components/brand";

/**
 * Public artist photo. Vercel Blob uploads (the norm) go through next/image for
 * optimization; any non-Blob URL (e.g. a historical Google Drive link) falls
 * back to a plain <img> so an un-configured host can't throw at render. Both
 * paths show the branded flower if the image fails to load. Fills its parent —
 * the parent must be `relative` with a defined size (aspect-* / height).
 */
export function BlobImage({
  src,
  alt,
  sizes,
  imgClassName = "object-cover",
  flowerSize = 32,
}: {
  src: string | null;
  alt: string;
  sizes: string;
  imgClassName?: string;
  flowerSize?: number;
}) {
  const [failed, setFailed] = useState(!src);
  if (failed || !src) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-cream">
        <Flower size={flowerSize} color="var(--color-fuchsia)" />
      </div>
    );
  }
  const isBlob = src.includes(".public.blob.vercel-storage.com");
  if (isBlob) {
    return (
      <Image src={src} alt={alt} fill sizes={sizes} className={imgClassName} onError={() => setFailed(true)} />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} loading="lazy" className={`h-full w-full ${imgClassName}`} onError={() => setFailed(true)} />
  );
}
