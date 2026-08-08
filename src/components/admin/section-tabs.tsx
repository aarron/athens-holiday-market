"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export type TabDef = { id: string; label: string; badge?: number; content: ReactNode };

/**
 * Lightweight client tab shell. Panels are server-rendered and passed in as
 * `content`, so each tab keeps its own server data — the shell only toggles
 * which one is visible.
 *
 * The active tab is mirrored in the URL hash (e.g. `#email`) so tabs are
 * deep-linkable and bookmarkable — landing on `/admin/broadcasts#email` opens
 * the Email tab directly.
 */
export function SectionTabs({ tabs, initial }: { tabs: TabDef[]; initial?: string }) {
  const [active, setActive] = useState(initial ?? tabs[0]?.id);
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const ids = tabs.map((t) => t.id).join(",");

  // Sync from the URL hash on mount and on back/forward (hashchange). Done in an
  // effect (not initial state) to keep the first client render matching SSR.
  useEffect(() => {
    const valid = new Set(ids.split(","));
    const apply = () => {
      const h = window.location.hash.replace(/^#/, "");
      if (h && valid.has(h)) setActive(h);
    };
    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, [ids]);

  function select(id: string) {
    setActive(id);
    if (typeof window !== "undefined" && window.location.hash.replace(/^#/, "") !== id) {
      history.replaceState(null, "", `#${id}`);
    }
  }

  // Roving arrow-key navigation (ARIA tabs pattern, automatic activation).
  function onKeyDown(e: React.KeyboardEvent, i: number) {
    const last = tabs.length - 1;
    let next = -1;
    if (e.key === "ArrowRight") next = i === last ? 0 : i + 1;
    else if (e.key === "ArrowLeft") next = i === 0 ? last : i - 1;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = last;
    if (next === -1) return;
    e.preventDefault();
    select(tabs[next].id);
    btnRefs.current[next]?.focus();
  }

  return (
    <div>
      <div
        role="tablist"
        aria-label="Sections"
        className="flex gap-6 overflow-x-auto border-b border-ink/12 [-ms-overflow-style:none] [scrollbar-width:none]"
      >
        {tabs.map((t, i) => {
          const on = t.id === active;
          return (
            <button
              key={t.id}
              id={`tab-${t.id}`}
              ref={(el) => { btnRefs.current[i] = el; }}
              role="tab"
              aria-selected={on}
              aria-controls={`panel-${t.id}`}
              tabIndex={on ? 0 : -1}
              onClick={() => select(t.id)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className={`relative -mb-px shrink-0 border-b-2 px-1 pb-3 text-sm font-display font-bold transition-colors ${
                on ? "border-fern-deep text-fern-deep" : "border-transparent text-ink-soft hover:text-ink"
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
          <div
            key={t.id}
            id={`panel-${t.id}`}
            role="tabpanel"
            aria-labelledby={`tab-${t.id}`}
            tabIndex={0}
            hidden={t.id !== active}
          >
            {/* Only the active panel renders. Keeping inactive panels mounted
                duplicated masked icons (Central Icons reuse a fixed mask id per
                icon), and a display:none copy breaks the visible one's mask. */}
            {t.id === active ? t.content : null}
          </div>
        ))}
      </div>
    </div>
  );
}
