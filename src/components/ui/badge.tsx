import type { StatusStyle } from "./status";
import { APPLICATION_STATUS, SEND_STATUS, BOOTH_FEE_STATUS } from "./status";

/** Generic status pill. Always driven by a `StatusStyle` from `ui/status`. */
export function Badge({ style, className = "" }: { style: StatusStyle; className?: string }) {
  const { label, cls, Icon } = style;
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-bold ${cls} ${className}`}
    >
      {Icon && <Icon size={12} aria-hidden />}
      {label}
    </span>
  );
}

/** Application lifecycle: submitted / under review / accepted / waitlisted / rejected. */
export function StatusBadge({ status }: { status: string }) {
  return <Badge style={APPLICATION_STATUS[status] ?? APPLICATION_STATUS.submitted} />;
}

/** Composed-email lifecycle: draft / scheduled / sending / sent / failed / canceled. */
export function SendBadge({ status }: { status: string }) {
  return <Badge style={SEND_STATUS[status] ?? SEND_STATUS.draft} />;
}

/** Booth fee — only meaningful once accepted. */
export function BoothFeeBadge({ paid, status }: { paid: boolean; status: string }) {
  if (status !== "accepted") return <span className="text-ink-soft/40">—</span>;
  return <Badge style={paid ? BOOTH_FEE_STATUS.paid : BOOTH_FEE_STATUS.unpaid} />;
}
