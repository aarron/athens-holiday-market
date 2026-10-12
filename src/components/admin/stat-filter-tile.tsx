"use client";

import { useEffect, useState } from "react";

/**
 * Dashboard filter wiring. The stat tiles and the applications table are
 * separate components, so they talk through two window events: a tile asks
 * the table to apply a filter, and the table announces its current filters so
 * the matching tile can show as selected.
 */
export type QuickFilter = {
  status?: "all" | "pending" | "accepted" | "waitlisted" | "rejected";
  payment?: "all" | "paid" | "unpaid";
};
export const APPLY_FILTER_EVENT = "ahm:apply-filter";
export const FILTERS_CHANGED_EVENT = "ahm:filters-changed";

const matches = (want: QuickFilter, cur: Required<QuickFilter> & { other: boolean }) =>
  !cur.other && (want.status ?? "all") === cur.status && (want.payment ?? "all") === cur.payment;

export function StatFilterTile({
  label,
  value,
  accent,
  filter,
  children,
}: {
  label: string;
  value: number;
  accent: string;
  filter: QuickFilter;
  children?: React.ReactNode;
}) {
  const [active, setActive] = useState(false);
  useEffect(() => {
    const on = (e: Event) => setActive(matches(filter, (e as CustomEvent).detail));
    window.addEventListener(FILTERS_CHANGED_EVENT, on);
    return () => window.removeEventListener(FILTERS_CHANGED_EVENT, on);
  }, [filter]);

  // The highlight lives inside each grid cell (padding, no negative margins),
  // so it can never spill into the gap or crowd the neighbouring tile. The
  // grid offsets the padding with a matching negative margin so the numbers
  // still line up with the section's left edge.
  return (
    <div>
      <button
        type="button"
        aria-pressed={active}
        onClick={() => {
          window.dispatchEvent(new CustomEvent(APPLY_FILTER_EVENT, { detail: filter }));
          document.getElementById("applications-table")?.scrollIntoView({ behavior: "smooth", block: "start" });
        }}
        style={
          active
            ? {
                backgroundColor: `color-mix(in srgb, ${accent} 9%, transparent)`,
                boxShadow: `inset 0 -3px 0 ${accent}`,
              }
            : undefined
        }
        className={`block w-full rounded-lg px-3 pb-2.5 pt-2 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-berry ${
          active ? "" : "hover:bg-ink/[0.04]"
        }`}
      >
        <span className="block font-display text-4xl font-extrabold tabular-nums" style={{ color: accent }}>
          {value}
        </span>
        <span className={`mt-1 block text-sm font-medium ${active ? "text-ink" : "text-ink-soft"}`}>{label}</span>
      </button>
      {children && <div className="mt-1.5 space-y-0.5 px-3 text-xs text-ink-soft">{children}</div>}
    </div>
  );
}
