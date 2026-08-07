"use client";

import { useEffect } from "react";

// Dedup within a page load (guards against Strict Mode / re-mounts).
const logged = new Set<string>();

/** Fire-and-forget beacon that records the path that 404'd, for later fixing. */
export function NotFoundLogger() {
  useEffect(() => {
    try {
      const path = window.location.pathname + window.location.search;
      if (logged.has(path)) return;
      logged.add(path);
      fetch("/api/log-404", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path, referrer: document.referrer }),
        keepalive: true,
      }).catch(() => {});
    } catch {
      /* never let logging break the page */
    }
  }, []);
  return null;
}
