"use client";

import { useEffect, useRef } from "react";

/**
 * Background hero video that honors reduced-motion: it never sets `autoPlay`,
 * and only starts playback via JS when the user hasn't asked to reduce motion.
 * Reduced-motion users see the static poster instead.
 */
export function HeroVideo() {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    v.play().catch(() => {
      /* autoplay may be blocked; poster stays — fine */
    });
  }, []);

  return (
    <video
      ref={ref}
      className="absolute inset-0 -z-20 h-full w-full object-cover"
      muted
      loop
      playsInline
      poster="/video/hero-poster.jpg"
      aria-hidden="true"
    >
      <source src="/video/hero.mp4" type="video/mp4" />
    </video>
  );
}
