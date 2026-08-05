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
          <ellipse
            key={deg}
            cx="50"
            cy="21"
            rx="13"
            ry="16"
            transform={`rotate(${deg} 50 50)`}
          />
        ))}
      </g>
      <circle cx="50" cy="50" r="13" fill={color} />
      <circle cx="50" cy="50" r="6.5" fill="var(--color-white)" />
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
