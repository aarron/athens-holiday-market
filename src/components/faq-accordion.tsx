import type { ReactNode } from "react";
import { ChevronDownIcon } from "@/components/icons";

export type FaqItem = { q: string; a: ReactNode };

/**
 * Accessible FAQ accordion built on native <details>/<summary> — keyboard- and
 * screen-reader-friendly with zero client JS. Multiple items can be open at once
 * (the native default). The chevron rotates via the `open` state.
 */
export function FaqAccordion({ items }: { items: FaqItem[] }) {
  return (
    <div className="divide-y divide-ink/10 overflow-hidden rounded-xl border border-ink/10 bg-white shadow-[var(--shadow-card)]">
      {items.map((item, i) => (
        <details key={i} className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-display text-lg font-bold text-ink transition-colors hover:bg-cream-soft [&::-webkit-details-marker]:hidden">
            <span>{item.q}</span>
            <span className="faq-chevron inline-flex shrink-0 text-fern-deep transition-transform duration-200">
              <ChevronDownIcon size={20} aria-hidden />
            </span>
          </summary>
          <div className="space-y-3 px-5 pb-5 text-ink-soft [&_a]:font-semibold">{item.a}</div>
        </details>
      ))}
    </div>
  );
}
