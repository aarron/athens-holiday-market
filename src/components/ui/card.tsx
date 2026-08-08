import type { ComponentProps, ReactNode } from "react";

/**
 * The white surface used everywhere in the admin/portal:
 * `rounded-xl bg-white p-5 shadow-card`. Optional `title`/`hint` render the
 * standard uppercase section header. Override padding etc. via `className`.
 */
export function Card({
  title,
  hint,
  className = "",
  children,
  ...props
}: { title?: ReactNode; hint?: ReactNode } & ComponentProps<"div">) {
  return (
    <div className={`rounded-xl bg-white p-5 shadow-[var(--shadow-card)] ${className}`} {...props}>
      {(title || hint) && (
        <div className="mb-3">
          {title && (
            <h2 className="font-display text-sm font-bold uppercase tracking-wide text-ink-soft">{title}</h2>
          )}
          {hint && <p className="mt-1 text-sm text-ink-soft">{hint}</p>}
        </div>
      )}
      {children}
    </div>
  );
}
