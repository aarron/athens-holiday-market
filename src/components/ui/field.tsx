import { forwardRef, type ComponentProps, type ReactNode } from "react";
import { ChevronDownIcon } from "@/components/icons";

// The one field recipe — h-11, rounded-lg (8px), 2px ink/15 border, fern focus.
const field =
  "w-full rounded-lg border-2 border-ink/15 bg-white px-3 text-sm outline-none transition-colors focus:border-fern-deep disabled:opacity-60";

export const Input = forwardRef<HTMLInputElement, ComponentProps<"input">>(
  function Input({ className = "", ...props }, ref) {
    return <input ref={ref} className={`h-11 ${field} ${className}`} {...props} />;
  },
);

export const Textarea = forwardRef<HTMLTextAreaElement, ComponentProps<"textarea">>(
  function Textarea({ className = "", ...props }, ref) {
    return <textarea ref={ref} className={`${field} py-2 ${className}`} {...props} />;
  },
);

export const Select = forwardRef<HTMLSelectElement, ComponentProps<"select">>(
  function Select({ className = "", children, ...props }, ref) {
    return (
      <div className="relative">
        <select ref={ref} className={`h-11 ${field} appearance-none pr-9 ${className}`} {...props}>
          {children}
        </select>
        <ChevronDownIcon
          size={16}
          aria-hidden
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft"
        />
      </div>
    );
  },
);

/**
 * Label + control + optional hint/error. Renders the error with a stable id so
 * the caller can point the control's `aria-describedby` at `${htmlFor}-error`.
 */
export function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  className = "",
  children,
}: {
  label: ReactNode;
  htmlFor?: string;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-1 block text-sm font-semibold text-ink-soft">
        {label}
        {required && <span className="text-poppy-deep"> *</span>}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-ink-soft/70">{hint}</p>}
      {error && (
        <p id={htmlFor ? `${htmlFor}-error` : undefined} role="alert" className="mt-1 text-xs font-medium text-poppy-deep">
          {error}
        </p>
      )}
    </div>
  );
}
