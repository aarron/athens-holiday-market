import Link from "next/link";
import { site } from "@/lib/site";

// The logo's atomic pinwheel-flower: eight round bulbs on pinched necks around a
// transparent center hole. One petal, pointing up, in a 0–100 box centered at 50,50.
const FLOWER_PETAL =
  "M45 47 C44 40 44 33 44 28 A 13 13 0 1 0 56 28 C56 33 56 40 55 47 Z";
const FLOWER_ANGLES = Array.from({ length: 8 }, (_, i) => (i * 360) / 8);
const FLOWER_MASK_ID = "ahm-flower-mask";

/**
 * Shared mask definition for the flower mark — render once (in the root layout).
 * White = petals + hub, black = the center hole, so the mark reads as a real
 * cut-out on any background at any size. Referenced by every <Flower/>.
 */
export function FlowerDefs() {
  return (
    <svg width="0" height="0" aria-hidden className="absolute">
      <defs>
        <mask id={FLOWER_MASK_ID} maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100">
          <g fill="#fff">
            {FLOWER_ANGLES.map((deg) => (
              <path key={deg} d={FLOWER_PETAL} transform={`rotate(${deg} 50 50)`} />
            ))}
            <circle cx="50" cy="50" r="14" />
          </g>
          <circle cx="50" cy="50" r="9" fill="#000" />
        </mask>
      </defs>
    </svg>
  );
}

/**
 * The atomic pinwheel-flower mark from the logo. Color + size configurable; the
 * center hole is a true cut-out so it sits cleanly on any background.
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
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role="img"
      aria-label="Athens Holiday Market flower mark"
      className={`${spin ? "ahm-spin" : ""} ${className}`}
    >
      <rect width="100" height="100" fill={color} mask={`url(#${FLOWER_MASK_ID})`} />
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
