// Status badges now live in ui/. Re-exported here so existing admin imports keep
// working; VoteTally (jurying-specific) stays below.
export { StatusBadge, BoothFeeBadge, SendBadge, Badge } from "@/components/ui/badge";

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
