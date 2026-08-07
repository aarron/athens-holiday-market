/**
 * Site-wide motion preference. Auto-playing motion (marquee, hero video, snow,
 * logo spin) needs a user-operable pause control to satisfy WCAG 2.2.2. This is
 * the single source of truth, shared by the footer toggle and the JS-driven
 * animations. CSS handles the pure-CSS animations via [data-motion="off"].
 *
 * Default follows the OS `prefers-reduced-motion` setting; the footer toggle
 * lets anyone override it, persisted to localStorage.
 */
export const MOTION_KEY = "ahm-motion";
export const MOTION_EVENT = "ahm-motionchange";

/** Whether decorative motion should currently run. Safe to call on the client. */
export function motionEnabled(): boolean {
  if (typeof window === "undefined") return true;
  const stored = localStorage.getItem(MOTION_KEY);
  if (stored === "on") return true;
  if (stored === "off") return false;
  return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Persist the preference, reflect it on <html>, and notify listeners. */
export function setMotion(on: boolean): void {
  localStorage.setItem(MOTION_KEY, on ? "on" : "off");
  document.documentElement.dataset.motion = on ? "on" : "off";
  window.dispatchEvent(new CustomEvent(MOTION_EVENT, { detail: { on } }));
}
