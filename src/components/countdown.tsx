"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { site } from "@/lib/site";
import { TreeIcon } from "@/components/icons";

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

const UNITS: { key: keyof Parts; label: string }[] = [
  { key: "months", label: "Months" },
  { key: "days", label: "Days" },
  { key: "hours", label: "Hours" },
  { key: "minutes", label: "Minutes" },
  { key: "seconds", label: "Seconds" },
];

/** One split-flap digit that flips the old value away to reveal the new one. */
function FlapDigit({ value }: { value: string }) {
  const [display, setDisplay] = useState(value);
  const [prev, setPrev] = useState(value);
  const [flipping, setFlipping] = useState(false);
  const current = useRef(value);

  useEffect(() => {
    if (value === current.current) return;
    setPrev(current.current);
    setDisplay(value);
    current.current = value;
    setFlipping(true);
    const t = setTimeout(() => setFlipping(false), 580);
    return () => clearTimeout(t);
  }, [value]);

  return (
    <span className="flap-digit">
      {/* Static halves: top = new; bottom = old until the unfold covers it. */}
      <span className="flap-face flap-top">
        <span className="n">{display}</span>
      </span>
      <span className="flap-face flap-bottom">
        <span className="n">{flipping ? prev : display}</span>
      </span>
      {flipping && (
        <>
          <span className="flap-face flap-top flap-fold">
            <span className="n">{prev}</span>
          </span>
          <span className="flap-face flap-bottom flap-unfold">
            <span className="n">{display}</span>
          </span>
        </>
      )}
    </span>
  );
}

function FlapPair({ value }: { value: number }) {
  const s = String(value).padStart(2, "0");
  return (
    <span className="flex gap-1">
      <FlapDigit value={s[0]} />
      <FlapDigit value={s[1]} />
    </span>
  );
}

function Separator() {
  return (
    <span className="flex h-[1.28em] flex-col items-center justify-center gap-[0.26em] self-start">
      <span className="block h-[0.11em] w-[0.11em] rounded-full bg-ink/25" />
      <span className="block h-[0.11em] w-[0.11em] rounded-full bg-ink/25" />
    </span>
  );
}

export function CountdownClock() {
  // Start at zeros so server and first client render match; fill in after mount.
  const [parts, setParts] = useState<Parts>({ months: 0, days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [over, setOver] = useState(false);

  useEffect(() => {
    const tick = () => {
      const p = compute(Date.now());
      if (p) setParts(p);
      else setOver(true);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  if (over) {
    return (
      <p className="flex items-center justify-center gap-2.5 text-center font-display text-2xl font-extrabold text-fern-deep sm:text-3xl">
        <TreeIcon size={30} className="text-fern-deep" aria-hidden />
        The market is here — come on by!
      </p>
    );
  }

  return (
    <div className="mx-auto flex w-fit max-w-full items-start justify-center gap-2 overflow-x-auto px-2 py-2 sm:gap-3">
      {UNITS.map((u, i) => (
        <Fragment key={u.key}>
          <span className="flex flex-col items-center gap-2.5">
            <span className="font-display text-3xl font-extrabold sm:text-6xl">
              <FlapPair value={parts[u.key]} />
            </span>
            <span className="text-[0.6rem] font-bold uppercase tracking-wide text-ink-soft sm:text-xs">
              {u.label}
            </span>
          </span>
          {i < UNITS.length - 1 && <Separator />}
        </Fragment>
      ))}
    </div>
  );
}
