const STATUS_STYLES: Record<string, { label: string; cls: string }> = {
  submitted: { label: "Submitted", cls: "bg-cream text-ink-soft" },
  under_review: { label: "Under review", cls: "bg-sky-soft text-sky-deep" },
  accepted: { label: "Accepted", cls: "bg-fern-soft text-fern-deeper" },
  waitlisted: { label: "Waitlisted", cls: "bg-[#fdf0e0] text-tangerine-deep" },
  rejected: { label: "Rejected", cls: "bg-[#fde7e6] text-poppy-deep" },
};

export function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES.submitted;
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${s.cls}`}>
      {s.label}
    </span>
  );
}

export function BoothFeeBadge({ paid, status }: { paid: boolean; status: string }) {
  if (status !== "accepted") return <span className="text-ink-soft/40">—</span>;
  return paid ? (
    <span className="inline-block rounded-full bg-fern-soft px-2.5 py-0.5 text-xs font-bold text-fern-deeper">
      Paid
    </span>
  ) : (
    <span className="inline-block rounded-full bg-[#fdf0e0] px-2.5 py-0.5 text-xs font-bold text-tangerine-deep">
      Unpaid
    </span>
  );
}

export type Tally = { yes: number; maybe: number; no: number };

/** Compact vote tally: green/amber/red counts. The text uses the AA-safe deep
 *  sibling on the 10% tint; the dot keeps the bright hue. */
export function VoteTally({ tally }: { tally: Tally }) {
  const item = (n: number, text: string, dot: string, title: string) => (
    <span
      title={title}
      className="inline-flex min-w-6 items-center justify-center gap-1 rounded-lg px-1.5 py-0.5 text-xs font-bold tabular-nums"
      style={{ backgroundColor: `${dot}1a`, color: text }}
    >
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: dot }} />
      {n}
    </span>
  );
  return (
    <span className="inline-flex gap-1">
      {item(tally.yes, "var(--color-fern-deeper)", "var(--color-fern-deep)", "Yes")}
      {item(tally.maybe, "var(--color-tangerine-deep)", "var(--color-tangerine)", "Maybe")}
      {item(tally.no, "var(--color-poppy-deep)", "var(--color-poppy)", "No")}
    </span>
  );
}
