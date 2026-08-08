import type { ComponentProps, ReactNode } from "react";

/**
 * The white surface used everywhere in the admin/portal:
 * `rounded-xl bg-white p-5 shadow-card`. Optional `title`/`hint` render the
 * standard header — `titleSize="sm"` is the dense admin uppercase label,
 * `"lg"` is the friendly large portal heading. Override padding via `className`
 * and the body wrapper via `bodyClassName`.
 */
export function Card({
  title,
  hint,
  titleSize = "sm",
  className = "",
  bodyClassName = "",
  children,
  ...props
}: {
  title?: ReactNode;
  hint?: ReactNode;
  titleSize?: "sm" | "lg";
  bodyClassName?: string;
} & ComponentProps<"div">) {
  const hasHeader = title || hint;
  return (
    <div className={`rounded-xl bg-white p-5 shadow-[var(--shadow-card)] ${className}`} {...props}>
      {hasHeader && (
        <div className={children ? "mb-3" : ""}>
          {title &&
            (titleSize === "lg" ? (
              <h2 className="font-display text-lg font-extrabold">{title}</h2>
            ) : (
              <h2 className="font-display text-sm font-bold uppercase tracking-wide text-ink-soft">{title}</h2>
            ))}
          {hint && <p className={`text-sm text-ink-soft ${titleSize === "lg" ? "mt-0.5" : "mt-1"}`}>{hint}</p>}
        </div>
      )}
      {children && (bodyClassName ? <div className={bodyClassName}>{children}</div> : children)}
    </div>
  );
}
