"use client";

import { useEffect, useState } from "react";
import { site } from "@/lib/site";

// Event start: 5pm ET on the first market evening (ET is EST/-05:00 in December).
const TARGET = new Date(`${site.event.days[0].date}T17:00:00-05:00`).getTime();

type Parts = { months: number; days: number; hours: number; minutes: number; seconds: number };

/** Calendar-aware breakdown: full months, then remaining days/hours/minutes/seconds. */
function compute(now: number): Parts | null {
  if (TARGET <= now) return null;
  let months = 0;
  const cursor = new Date(now);
  for (;;) {
    const next = new Date(cursor);
    next.setMonth(next.getMonth() + 1);
    if (next.getTime() <= TARGET) {
      cursor.setTime(next.getTime());
      months += 1;
    } else break;
  }
  let ms = TARGET - cursor.getTime();
  const days = Math.floor(ms / 86_400_000);
  ms -= days * 86_400_000;
  const hours = Math.floor(ms / 3_600_000);
  ms -= hours * 3_600_000;
  const minutes = Math.floor(ms / 60_000);
  ms -= minutes * 60_000;
  const seconds = Math.floor(ms / 1_000);
  return { months, days, hours, minutes, seconds };
}

const UNITS: { key: keyof Parts; label: string; color: string }[] = [
  { key: "months", label: "Months", color: "var(--color-fuchsia)" },
  { key: "days", label: "Days", color: "var(--color-tangerine)" },
  { key: "hours", label: "Hours", color: "var(--color-teal)" },
  { key: "minutes", label: "Minutes", color: "var(--color-fern-deep)" },
  { key: "seconds", label: "Seconds", color: "var(--color-berry)" },
];

export function CountdownClock() {
  // Start null so server and first client render match; fill in after mount.
  const [parts, setParts] = useState<Parts | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setParts(compute(Date.now()));
    const id = setInterval(() => setParts(compute(Date.now())), 1000);
    return () => clearInterval(id);
  }, []);

  // Event is here or has passed.
  if (mounted && parts === null) {
    return (
      <p className="text-center font-display text-2xl font-extrabold text-fern-deep sm:text-3xl">
        The market is here — come on by! 🎄
      </p>
    );
  }

  return (
    <div className="mx-auto grid max-w-3xl grid-cols-5 gap-2 sm:gap-4">
      {UNITS.map(({ key, label, color }) => (
        <div
          key={key}
          className="rounded-xl bg-white px-1 py-4 text-center shadow-[var(--shadow-card)] sm:py-6"
        >
          <div
            className="font-display text-3xl font-extrabold tabular-nums leading-none sm:text-6xl"
            style={{ color }}
          >
            {parts ? String(parts[key]).padStart(2, "0") : "––"}
          </div>
          <div className="mt-1.5 text-[0.6rem] font-bold uppercase tracking-wide text-ink-soft sm:mt-2 sm:text-xs">
            {label}
          </div>
        </div>
      ))}
    </div>
  );
}
