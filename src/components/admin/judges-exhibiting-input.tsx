"use client";

import { useState, useTransition } from "react";
import { setJudgesExhibiting } from "@/lib/judges-exhibiting";

/** Inline admin control: "+ [4] judges exhibiting". Saves on blur or Enter. */
export function JudgesExhibitingInput({ cycleId, value }: { cycleId: number; value: number }) {
  const [v, setV] = useState(String(value));
  const [pending, start] = useTransition();
  const [err, setErr] = useState("");

  function save() {
    const n = Number(v);
    if (String(n) === String(value)) return;
    start(async () => {
      const r = await setJudgesExhibiting(cycleId, n);
      if (r && "error" in r) {
        setErr(r.error ?? "Couldn't save.");
        setV(String(value));
      } else setErr("");
    });
  }

  return (
    <>
    <span className="inline-flex items-center gap-1 whitespace-nowrap">
      +
      <input
        type="number"
        min={0}
        max={50}
        inputMode="numeric"
        aria-label="Judges exhibiting this year"
        value={v}
        disabled={pending}
        onChange={(e) => setV(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
        className="w-9 rounded border border-ink/20 bg-white px-1 py-0 text-center tabular-nums disabled:opacity-60"
      />
      {Number(v) === 1 ? "judge" : "judges"} exhibiting
    </span>
    {err && <span className="block whitespace-normal text-poppy-deep">{err}</span>}
    </>
  );
}
