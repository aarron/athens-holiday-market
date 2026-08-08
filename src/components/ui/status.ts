import type { ComponentType } from "react";
import { ClockIcon, CheckCircleIcon, DraftIcon, SendingIcon } from "@/components/icons";

/** One status entry: a label, a `bg + text` class pair, and an optional icon. */
export type StatusStyle = {
  label: string;
  cls: string;
  Icon?: ComponentType<{ size?: number; "aria-hidden"?: boolean }>;
};

/**
 * The single source of truth for status colors across the product. Every
 * badge/pill/banner reads from these maps — do not hand-roll status colors.
 * Text colors are the AA-safe "deep" siblings on the matching soft tint.
 */
export const APPLICATION_STATUS: Record<string, StatusStyle> = {
  submitted: { label: "Submitted", cls: "bg-cream text-ink-soft" },
  under_review: { label: "Under review", cls: "bg-sky-soft text-sky-deep" },
  accepted: { label: "Accepted", cls: "bg-fern-soft text-fern-deeper" },
  waitlisted: { label: "Waitlisted", cls: "bg-tangerine-soft text-tangerine-deep" },
  rejected: { label: "Rejected", cls: "bg-poppy-soft text-poppy-deep" },
};

export const BOOTH_FEE_STATUS: Record<"paid" | "unpaid", StatusStyle> = {
  paid: { label: "Paid", cls: "bg-fern-soft text-fern-deeper" },
  unpaid: { label: "Unpaid", cls: "bg-tangerine-soft text-tangerine-deep" },
};

/** Composed-email lifecycle (broadcasts) — carries icons. */
export const SEND_STATUS: Record<string, StatusStyle> = {
  draft: { label: "Draft", cls: "bg-cream text-ink-soft", Icon: DraftIcon },
  scheduled: { label: "Scheduled", cls: "bg-sky-soft text-sky-deep", Icon: ClockIcon },
  sending: { label: "Sending", cls: "bg-cream text-ink-soft", Icon: SendingIcon },
  sent: { label: "Sent", cls: "bg-fern-soft text-fern-deep", Icon: CheckCircleIcon },
  failed: { label: "Failed", cls: "bg-poppy-soft text-poppy-deep" },
  canceled: { label: "Canceled", cls: "bg-ink/10 text-ink-soft" },
};

/** Artist-page publication lifecycle. */
export const ARTIST_STATUS: Record<string, StatusStyle> = {
  draft: { label: "Draft", cls: "bg-cream text-ink-soft" },
  pending: { label: "Pending review", cls: "bg-sky-soft text-sky-deep" },
  published: { label: "Published", cls: "bg-fern-soft text-fern-deeper" },
};
