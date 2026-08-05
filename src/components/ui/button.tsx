import Link from "next/link";
import type { ComponentProps } from "react";

type Variant = "primary" | "ink" | "outline" | "ghost";
type Size = "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 font-display font-semibold tracking-tight rounded-md transition-all duration-200 ease-out focus-visible:outline-3 focus-visible:outline-offset-2 disabled:opacity-50 disabled:pointer-events-none active:translate-y-px";

const variants: Record<Variant, string> = {
  primary:
    "bg-fuchsia text-white shadow-[0_4px_0_0_var(--color-berry)] hover:-translate-y-0.5 hover:shadow-[0_6px_0_0_var(--color-berry)] active:shadow-[0_2px_0_0_var(--color-berry)]",
  ink: "bg-ink text-paper hover:bg-ink-soft hover:-translate-y-0.5",
  outline:
    "border-2 border-ink text-ink bg-transparent hover:bg-ink hover:text-paper",
  ghost: "text-ink hover:bg-cream",
};

const sizes: Record<Size, string> = {
  md: "h-11 px-5 text-[0.95rem]",
  lg: "h-14 px-8 text-lg",
};

type ButtonProps = {
  variant?: Variant;
  size?: Size;
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ButtonProps & ComponentProps<"button">) {
  return (
    <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props} />
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
