"use client";

import { useEffect, useRef, useState } from "react";
import { MOTION_EVENT, motionEnabled } from "@/lib/motion";

/**
 * A foreground video feature for the About page. Honors the site motion
 * preference exactly like HeroVideo — it never autoplays via the attribute and
 * only plays (muted, looping) when motion is enabled; otherwise the poster
 * shows. A tap-for-sound control lets visitors actually hear the live music
 * (unmuting counts as the gesture browsers require for audio).
 */
export function AboutVideo({
  src,
  poster,
  label,
}: {
  src: string;
  poster: string;
  label: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const sync = () => {
      if (motionEnabled()) v.play().catch(() => {});
      else v.pause();
    };
    sync();
    window.addEventListener(MOTION_EVENT, sync);
    return () => window.removeEventListener(MOTION_EVENT, sync);
  }, []);

  function toggleSound() {
    const v = ref.current;
    if (!v) return;
    const next = !muted;
    setMuted(next);
    v.muted = next;
    if (!next) v.play().catch(() => {}); // unmute is a user gesture → audio allowed
  }

  return (
    <figure className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-ink shadow-[var(--shadow-lift)] sm:aspect-[16/10]">
      <video
        ref={ref}
        className="absolute inset-0 h-full w-full object-cover"
        muted
        loop
        playsInline
        preload="metadata"
        poster={poster}
        aria-label={label}
      >
        <source src={src} type="video/mp4" />
      </video>
      <button
        type="button"
        onClick={toggleSound}
        aria-pressed={!muted}
        aria-label={muted ? "Turn sound on" : "Mute"}
        className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-ink/70 px-3 py-1.5 text-sm font-semibold text-paper backdrop-blur-sm transition-colors hover:bg-ink"
      >
        <span aria-hidden>{muted ? "🔇" : "🔊"}</span>
        {muted ? "Tap for sound" : "Sound on"}
      </button>
    </figure>
  );
}
