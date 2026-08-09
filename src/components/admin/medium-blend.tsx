"use client";

import { useState } from "react";

export type BlendRow = { category: string; total: number; accepted: number };

const BAR_COLORS = [
  "var(--color-teal)",
  "var(--color-fern)",
  "var(--color-fuchsia)",
  "var(--color-tangerine)",
  "var(--color-sky)",
  "var(--color-berry)",
  "var(--color-chartreuse)",
  "var(--color-poppy)",
];

export function MediumBlend({ blend }: { blend: BlendRow[] }) {
  const [open, setOpen] = useState(false);
  if (blend.length === 0) return null;

  const maxTotal = Math.max(...blend.map((b) => b.total), 1);
  const totalAccepted = blend.reduce((a, b) => a + b.accepted, 0);
  const totalApplied = blend.reduce((a, b) => a + b.total, 0);

  return (
    <div className="rounded-xl bg-white shadow-[var(--shadow-card)]">
      {/* Compact header (always visible) */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left sm:px-6"
        aria-expanded={open}
      >
        <div className="flex items-baseline gap-3">
          <h2 className="font-display text-lg font-extrabold">Mediums</h2>
          <span className="hidden text-sm text-ink-soft sm:inline">
            {totalAccepted}/{totalApplied} accepted across {blend.length} mediums
          </span>
        </div>
        <span className="flex items-center gap-1.5 text-sm font-semibold text-ink-soft">
          {open ? "Hide" : "Show"}
          <span className={`transition-transform ${open ? "rotate-180" : ""}`}>▾</span>
        </span>
      </button>

      {open && (
        <div className="border-t border-ink/10 px-5 pb-6 pt-5 sm:px-6">
          <p className="mb-4 text-sm text-ink-soft">
            Accepted / applied — balance the mix of work as votes come in.
          </p>
          <ul className="grid gap-x-8 gap-y-3.5 sm:grid-cols-2">
            {blend.map((b, i) => {
              const color = BAR_COLORS[i % BAR_COLORS.length];
              const totalPct = (b.total / maxTotal) * 100;
              const acceptedPct = b.total > 0 ? (b.accepted / b.total) * 100 : 0;
              return (
                <li key={b.category}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="font-display font-bold">{b.category}</span>
                    <span className="tabular-nums text-ink-soft">
                      <span className="font-bold" style={{ color }}>
                        {b.accepted}
                      </span>{" "}
                      / {b.total}
                    </span>
                  </div>
                  <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-cream">
                    <div className="h-full rounded-full" style={{ width: `${totalPct}%`, backgroundColor: `${color}33` }}>
                      <div className="h-full rounded-full" style={{ width: `${acceptedPct}%`, backgroundColor: color }} />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
