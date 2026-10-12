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

  return (
    <div>
      <button
        type="button"
        aria-pressed={active}
        onClick={() => {
          window.dispatchEvent(new CustomEvent(APPLY_FILTER_EVENT, { detail: filter }));
          document.getElementById("applications-table")?.scrollIntoView({ behavior: "smooth", block: "start" });
        }}
        className={`-mx-2 -my-1 w-[calc(100%+1rem)] rounded-lg px-2 py-1 text-left transition-colors hover:bg-cream focus-visible:outline focus-visible:outline-2 focus-visible:outline-berry ${
          active ? "bg-cream ring-2 ring-ink/15" : ""
        }`}
      >
        <span className="block font-display text-4xl font-extrabold tabular-nums" style={{ color: accent }}>
          {value}
        </span>
        <span className="mt-1 block text-sm font-medium text-ink-soft">{label}</span>
      </button>
      {children && <div className="mt-1.5 space-y-0.5 text-xs text-ink-soft">{children}</div>}
    </div>
  );
}
