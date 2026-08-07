"use client";

import { useState } from "react";

/** Click-to-copy chip for a token / hex / class name — handy when running audits. */
export function CopyToken({ value, className = "" }: { value: string; className?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      title="Copy"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setDone(true);
          setTimeout(() => setDone(false), 1200);
        } catch {
          /* clipboard unavailable */
        }
      }}
      className={`group inline-flex items-center gap-1 rounded-md bg-ink/5 px-1.5 py-0.5 font-mono text-xs text-ink-soft transition-colors hover:bg-ink/10 ${className}`}
    >
      <span>{value}</span>
      <span className={done ? "text-fern-deep" : "text-ink-soft/40 group-hover:text-ink-soft"}>
        {done ? "✓" : "⧉"}
      </span>
    </button>
  );
}
