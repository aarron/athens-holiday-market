import type { ReactNode } from "react";

/**
 * Inline status line for form/action feedback — a polite live region so screen
 * readers announce it. Lightweight by design (no toast/portal); tone sets color.
 */
export function StatusMessage({
  tone = "neutral",
  className = "",
  children,
}: {
  tone?: "neutral" | "success" | "error";
  className?: string;
  children: ReactNode;
}) {
  const color =
    tone === "error" ? "text-poppy-deep" : tone === "success" ? "text-fern-deep" : "text-ink-soft";
  return (
    <p role="status" aria-live="polite" className={`text-sm font-medium ${color} ${className}`}>
      {children}
    </p>
  );
}
