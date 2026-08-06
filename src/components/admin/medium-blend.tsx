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
  if (blend.length === 0) return null;
  const maxTotal = Math.max(...blend.map((b) => b.total), 1);

  return (
    <div className="rounded-xl bg-white p-5 shadow-[var(--shadow-card)] sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-lg font-extrabold">Blend by medium</h2>
        <p className="text-sm text-ink-soft">Accepted / applied — balance the mix of work</p>
      </div>

      <ul className="mt-5 grid gap-x-8 gap-y-3.5 sm:grid-cols-2">
        {blend.map((b, i) => {
          const color = BAR_COLORS[i % BAR_COLORS.length];
          const totalPct = (b.total / maxTotal) * 100;
          const acceptedPct = b.total > 0 ? (b.accepted / b.total) * 100 : 0;
          return (
            <li key={b.category}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="font-display font-bold">{b.category}</span>
                <span className="tabular-nums text-ink-soft">
                  <span className="font-bold text-ink" style={{ color }}>
                    {b.accepted}
                  </span>{" "}
                  / {b.total}
                </span>
              </div>
              {/* track scaled to the busiest category; fill = accepted share */}
              <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-cream">
                <div className="h-full rounded-full" style={{ width: `${totalPct}%`, backgroundColor: `${color}33` }}>
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${acceptedPct}%`, backgroundColor: color }}
                  />
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
