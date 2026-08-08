import Link from "next/link";
import type { ComponentProps } from "react";

/**
 * The one button. `primary` is the marketing raised-ledge fill; `create` /
 * `confirm` / `danger` are the flat admin action fills (fuchsia / fern / poppy)
 * that used to be hand-rolled inline. All variants share the berry focus ring
 * and disabled treatment.
 */
type Variant = "primary" | "ink" | "outline" | "ghost" | "secondary" | "create" | "confirm" | "danger";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 font-display font-semibold tracking-tight rounded-lg transition-all duration-200 ease-out focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-berry disabled:opacity-50 disabled:pointer-events-none active:translate-y-px";

const variants: Record<Variant, string> = {
  primary:
    "bg-fern-deep text-white shadow-[0_4px_0_0_var(--color-fern-deeper)] hover:-translate-y-0.5 hover:shadow-[0_6px_0_0_var(--color-fern-deeper)] active:shadow-[0_2px_0_0_var(--color-fern-deeper)]",
  ink: "bg-ink text-paper hover:bg-ink-soft hover:-translate-y-0.5",
  outline: "border-2 border-ink text-ink bg-transparent hover:bg-ink hover:text-paper",
  ghost: "text-ink hover:bg-cream",
  // Light admin outline (Send test, Save draft, cancel-ish).
  secondary: "border-2 border-ink/15 text-ink hover:bg-cream",
  // Flat admin fills.
  create: "bg-fuchsia text-white hover:opacity-90",
  confirm: "bg-fern-deep text-white hover:opacity-90",
  danger: "bg-poppy text-white hover:opacity-90",
};

const sizes: Record<Size, string> = {
  sm: "h-10 px-4 text-sm",
  md: "h-11 px-5 text-[0.95rem]",
  lg: "h-14 px-8 text-lg",
};

type ButtonProps = {
  variant?: Variant;
  size?: Size;
  /** Disables the button and swaps the label for `loadingLabel` while pending. */
  loading?: boolean;
  loadingLabel?: string;
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  loadingLabel = "Working…",
  className = "",
  children,
  disabled,
  ...props
}: ButtonProps & ComponentProps<"button">) {
  return (
    <button
      // Default to a non-submitting button so controls inside a <form> (e.g. the
      // proofread helpers) don't accidentally submit it. Real submit buttons
      // pass type="submit" explicitly, which wins via the spread below.
      type="button"
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? loadingLabel : children}
    </button>
  );
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ButtonProps & ComponentProps<typeof Link>) {
  return (
    <Link className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props} />
  );
}
