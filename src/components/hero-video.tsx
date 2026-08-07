"use client";

import { useEffect, useRef } from "react";
import { MOTION_EVENT, motionEnabled } from "@/lib/motion";

/**
 * Background hero video that honors the motion preference: it never sets
 * `autoPlay`, and only plays when motion is enabled (OS reduced-motion off and
 * the footer toggle on). Otherwise the static poster shows.
 */
export function HeroVideo() {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const sync = () => {
      if (motionEnabled()) {
        v.play().catch(() => {
          /* autoplay may be blocked; poster stays — fine */
        });
      } else {
        v.pause();
      }
    };
    sync();
    window.addEventListener(MOTION_EVENT, sync);
    return () => window.removeEventListener(MOTION_EVENT, sync);
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
