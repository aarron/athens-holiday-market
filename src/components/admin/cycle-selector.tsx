"use client";

import { useRouter } from "next/navigation";

export type CycleOption = { year: number; isActive: boolean; count: number };

export function CycleSelector({ cycles, current }: { cycles: CycleOption[]; current: number }) {
  const router = useRouter();
  return (
    <label className="flex items-center gap-2">
      <span className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Year</span>
      <select
        value={current}
        onChange={(e) => router.push(`/admin?year=${e.target.value}`)}
        className="h-10 rounded-lg border-2 border-ink/15 bg-white px-2.5 text-sm font-display font-bold text-ink outline-none focus:border-fern-deep"
      >
        {cycles.map((c) => (
          <option key={c.year} value={c.year}>
            {c.year}
            {c.isActive ? " · current" : ""} — {c.count} {c.count === 1 ? "app" : "apps"}
          </option>
        ))}
      </select>
    </label>
  );
}
