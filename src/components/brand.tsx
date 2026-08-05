import Link from "next/link";
import { site } from "@/lib/site";

/**
 * The atomic flower-burst mark from the logo: eight rounded petals around a
 * white center. Pure MCM/atomic-age geometry. Color + size are configurable.
 */
export function Flower({
  size = 40,
  className = "",
  color = "var(--color-fuchsia)",
  spin = false,
}: {
  size?: number;
  className?: string;
  color?: string;
  spin?: boolean;
}) {
  const petals = Array.from({ length: 8 }, (_, i) => (i * 360) / 8);
  // Bulb-with-neck petal (rounded outer lobe pinching to a narrow neck at the
  // center) — the mid-century atomic-flower shape from the logo.
  const petal =
    "M41 30 C39 22 39 6 50 6 C61 6 61 22 59 30 C58 35 55 39 54 44 L46 44 C45 39 42 35 41 30 Z";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role="img"
      aria-label="Athens Holiday Market flower mark"
      className={`${spin ? "ahm-spin" : ""} ${className}`}
    >
      <g fill={color}>
        {petals.map((deg) => (
          <path key={deg} d={petal} transform={`rotate(${deg} 50 50)`} />
        ))}
        <circle cx="50" cy="50" r="9" />
      </g>
      <circle cx="50" cy="50" r="4.5" fill="var(--color-white)" />
    </svg>
  );
}

// H-o-l-i-d-a-y — the logo's exact per-letter color sequence.
const HOLIDAY_COLORS = [
  "var(--color-fern)",
  "var(--color-tangerine)",
  "var(--color-teal)",
  "var(--color-chartreuse)",
  "var(--color-sky)",
  "var(--color-berry)",
  "var(--color-tangerine)",
];

/** Renders a word with each letter in the brand's rotating bright palette. */
export function ColorWord({
  word = "Holiday",
  className = "",
}: {
  word?: string;
  className?: string;
}) {
  return (
    <span className={className} aria-label={word}>
      {word.split("").map((ch, i) => (
        <span key={i} aria-hidden style={{ color: HOLIDAY_COLORS[i % HOLIDAY_COLORS.length] }}>
          {ch}
        </span>
      ))}
    </span>
  );
}

/** Header lockup: flower + stacked wordmark. */
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`group inline-flex items-center gap-3 ${className}`}>
      <Flower size={40} className="transition-transform duration-500 group-hover:rotate-45" />
      <span className="font-display font-extrabold leading-none tracking-tight">
        <span className="block text-[0.7rem] uppercase tracking-[0.18em] text-ink-soft">
          Athens
        </span>
        <span className="block text-lg">
          <ColorWord /> <span className="text-ink">Market</span>
        </span>
      </span>
      <span className="sr-only">{site.name}</span>
    </Link>
  );
}
