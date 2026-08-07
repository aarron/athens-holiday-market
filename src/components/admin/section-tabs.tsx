"use client";

import { useState, type ReactNode } from "react";

export type TabDef = { id: string; label: string; badge?: number; content: ReactNode };

/**
 * Lightweight client tab shell. Panels are server-rendered and passed in as
 * `content`, so each tab keeps its own server data — the shell only toggles
 * which one is visible. Inactive panels stay mounted (hidden) so their state
 * and scroll position survive tab switches.
 */
export function SectionTabs({ tabs, initial }: { tabs: TabDef[]; initial?: string }) {
  const [active, setActive] = useState(initial ?? tabs[0]?.id);

  return (
    <div>
      <div
        role="tablist"
        aria-label="Sections"
        className="flex gap-1 overflow-x-auto rounded-xl bg-white p-1.5 shadow-[var(--shadow-card)] [-ms-overflow-style:none] [scrollbar-width:none]"
      >
        {tabs.map((t) => {
          const on = t.id === active;
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={on}
              onClick={() => setActive(t.id)}
              className={`shrink-0 rounded-lg px-4 py-2 text-sm font-display font-bold transition-colors ${
                on ? "bg-fern-soft text-fern-deep" : "text-ink-soft hover:bg-cream"
              }`}
            >
              {t.label}
              {t.badge ? (
                <span className="ml-1.5 rounded-full bg-tangerine px-1.5 py-0.5 text-xs font-bold text-white">
                  {t.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="mt-6">
        {tabs.map((t) => (
          <div key={t.id} role="tabpanel" hidden={t.id !== active}>
            {t.content}
          </div>
        ))}
      </div>
    </div>
  );
}
