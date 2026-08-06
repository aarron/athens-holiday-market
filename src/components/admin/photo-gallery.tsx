"use client";

import { useEffect, useState } from "react";
import { SafeImg } from "@/components/admin/safe-img";

export function PhotoGallery({ photos }: { photos: { id: number; url: string }[] }) {
  const [idx, setIdx] = useState<number | null>(null);

  useEffect(() => {
    if (idx === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIdx(null);
      if (e.key === "ArrowRight") setIdx((i) => (i === null ? i : (i + 1) % photos.length));
      if (e.key === "ArrowLeft") setIdx((i) => (i === null ? i : (i - 1 + photos.length) % photos.length));
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [idx, photos.length]);

  if (photos.length === 0) return null;

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {photos.map((p, i) => (
          <button
            key={p.id}
            onClick={() => setIdx(i)}
            className="group block overflow-hidden rounded-lg bg-cream shadow-[var(--shadow-card)]"
            aria-label={`View photo ${i + 1} larger`}
          >
            <SafeImg
              src={p.url}
              alt="Applicant work"
              flowerSize={32}
              className="aspect-square w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          </button>
        ))}
      </div>

      {idx !== null && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/90 p-4"
          onClick={() => setIdx(null)}
          role="dialog"
          aria-modal="true"
        >
          <button
            onClick={() => setIdx(null)}
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-xl text-white hover:bg-white/25"
            aria-label="Close"
          >
            ✕
          </button>

          {photos.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIdx((i) => (i === null ? i : (i - 1 + photos.length) % photos.length));
              }}
              className="absolute left-3 flex h-12 w-12 items-center justify-center rounded-full bg-white/15 text-3xl text-white hover:bg-white/25 sm:left-6"
              aria-label="Previous"
            >
              ‹
            </button>
          )}

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photos[idx].url}
            alt="Applicant work"
            onClick={(e) => e.stopPropagation()}
            className="max-h-[88vh] max-w-[92vw] rounded-lg object-contain shadow-2xl"
          />

          {photos.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIdx((i) => (i === null ? i : (i + 1) % photos.length));
              }}
              className="absolute right-3 flex h-12 w-12 items-center justify-center rounded-full bg-white/15 text-3xl text-white hover:bg-white/25 sm:right-6"
              aria-label="Next"
            >
              ›
            </button>
          )}

          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-white/15 px-3 py-1 text-sm font-semibold text-white">
            {idx + 1} / {photos.length}
          </div>
        </div>
      )}
    </>
  );
}
