// Status badges now live in ui/. Re-exported here so existing admin imports keep
// working; VoteTally (jurying-specific) stays below.
export { StatusBadge, BoothFeeBadge, SendBadge, Badge } from "@/components/ui/badge";
import type { ComponentType } from "react";
import { ThumbsUpIcon, ThumbsDownIcon, MaybeIcon } from "@/components/icons";

export type Tally = { yes: number; maybe: number; no: number };
export type VoteValue = "yes" | "maybe" | "no";

/**
 * Single source of truth for vote states — thumbs-up (yes), mouthless (maybe),
 * thumbs-down (no) with the established green/amber/red palette. `hue` is the
 * bright icon color; `text` the AA-safe deep sibling for text/counts on tints.
 */
export const VOTE_STATES: Record<
  VoteValue,
  { label: string; Icon: ComponentType<{ size?: number; "aria-hidden"?: boolean }>; hue: string; text: string }
> = {
  yes: { label: "Yes", Icon: ThumbsUpIcon, hue: "var(--color-fern-deep)", text: "var(--color-fern-deeper)" },
  maybe: { label: "Maybe", Icon: MaybeIcon, hue: "var(--color-tangerine)", text: "var(--color-tangerine-deep)" },
  no: { label: "No", Icon: ThumbsDownIcon, hue: "var(--color-poppy)", text: "var(--color-poppy-deep)" },
};

/** Compact vote tally: thumbs-up / maybe / thumbs-down counts on soft tints. */
export function VoteTally({ tally }: { tally: Tally }) {
  const item = (v: VoteValue, n: number) => {
    const s = VOTE_STATES[v];
    return (
      <span
        title={s.label}
        className="inline-flex min-w-6 items-center justify-center gap-1 rounded-lg px-1.5 py-0.5 text-xs font-bold tabular-nums"
        style={{ backgroundColor: `${s.hue}1a`, color: s.text }}
      >
        <s.Icon size={13} aria-hidden />
        {n}
      </span>
    );
  };
  return (
    <span className="inline-flex gap-1">
      {item("yes", tally.yes)}
      {item("maybe", tally.maybe)}
      {item("no", tally.no)}
    </span>
  );
}
