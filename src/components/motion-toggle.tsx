"use client";

import { useEffect, useState } from "react";
import { MOTION_EVENT, motionEnabled, setMotion } from "@/lib/motion";
import { PauseIcon, PlayIcon } from "@/components/icons";

/**
 * Footer control to pause/resume decorative motion (WCAG 2.2.2). Reflects the
 * current preference onto <html data-motion> on mount so CSS animations and the
 * JS-driven pieces (snow, hero video) stay in sync.
 */
export function MotionToggle() {
  const [on, setOn] = useState(true);

  useEffect(() => {
    const sync = () => {
      const enabled = motionEnabled();
      setOn(enabled);
      // Keep <html> in sync so the CSS-driven animations match the preference.
      document.documentElement.dataset.motion = enabled ? "on" : "off";
    };
    sync();
    window.addEventListener(MOTION_EVENT, sync);
    return () => window.removeEventListener(MOTION_EVENT, sync);
  }, []);

  return (
    <button
      type="button"
      onClick={() => setMotion(!on)}
      aria-pressed={!on}
      className="inline-flex items-center gap-1.5 text-paper/50 transition-colors hover:text-fern"
    >
      {on ? <PauseIcon size={16} aria-hidden /> : <PlayIcon size={16} aria-hidden />}
      {on ? "Reduce motion" : "Resume motion"}
    </button>
  );
}
