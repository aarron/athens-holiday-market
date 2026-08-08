"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { startProspectResearch } from "@/lib/prospect-actions";
import type { ResearchBatchRow } from "@/lib/prospect-data";
import { SparkleIcon } from "@/components/icons";

const SCOPES = [
  { value: "athens", label: "Athens + NE Georgia" },
  { value: "southeast", label: "Broader Southeast" },
  { value: "none", label: "No geographic limit" },
] as const;

const STATUS_STYLE: Record<string, string> = {
  queued: "bg-sky-soft text-sky-deep",
  running: "bg-tangerine-soft text-tangerine-deep",
  complete: "bg-fern-soft text-fern-deeper",
  failed: "bg-poppy/10 text-poppy-deep",
};

export function ResearchPanel({ batches }: { batches: ResearchBatchRow[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState<(typeof SCOPES)[number]["value"]>("southeast");
  const [target, setTarget] = useState(60);
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();

  const active = batches.some((b) => b.status === "queued" || b.status === "running");

  // While a run is in flight, refresh periodically so progress updates.
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => router.refresh(), 8000);
    return () => clearInterval(t);
  }, [active, router]);

  function onStart() {
    setMsg("");
    start(async () => {
      const r = await startProspectResearch({ geoScope: scope, targetCount: target });
      if (r && "ok" in r && r.ok) {
        setMsg("Scouting started — new prospects will appear as they're found.");
        setOpen(false);
        router.refresh();
      } else {
        setMsg(r?.error ?? "Couldn't start research.");
      }
    });
  }

  return (
    <div className="rounded-xl bg-white p-4 shadow-[var(--shadow-card)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <SparkleIcon size={18} aria-hidden />
          <div>
            <h2 className="font-display font-bold leading-tight">Auto-scout</h2>
            <p className="text-xs text-ink-soft">
              Claude searches the web for makers who fit, then adds them here to triage.
            </p>
          </div>
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          disabled={active}
          className="rounded-lg bg-ink px-4 py-2 text-sm font-display font-bold text-paper hover:bg-ink-soft disabled:opacity-50"
        >
          {active ? "Scouting…" : "Find more artists"}
        </button>
      </div>

      {open && !active && (
        <div className="mt-4 flex flex-wrap items-end gap-4 border-t border-ink/10 pt-4">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-soft">Where</label>
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value as typeof scope)}
              className="h-10 rounded-lg border-2 border-ink/15 bg-paper px-3 text-sm outline-none focus:border-fern-deep"
            >
              {SCOPES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-soft">How many</label>
            <input
              type="number"
              min={10}
              max={120}
              value={target}
              onChange={(e) => setTarget(Number(e.target.value))}
              className="h-10 w-24 rounded-lg border-2 border-ink/15 bg-paper px-3 text-sm outline-none focus:border-fern-deep"
            />
          </div>
          <button
            onClick={onStart}
            disabled={pending}
            className="h-10 rounded-lg bg-fern-deep px-4 text-sm font-display font-bold text-white hover:bg-fern-deeper disabled:opacity-60"
          >
            Start scouting
          </button>
        </div>
      )}

      {msg && <p className="mt-3 text-sm text-ink-soft">{msg}</p>}

      {batches.length > 0 && (
        <ul className="mt-4 space-y-1.5 border-t border-ink/10 pt-3 text-sm">
          {batches.map((b) => (
            <li key={b.id} className="flex items-center justify-between gap-3">
              <span className="text-ink-soft">
                {new Date(b.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })} · {b.label}
              </span>
              <span className="flex items-center gap-2">
                <span className="font-semibold tabular-nums">
                  {b.added}
                  {b.target ? ` / ${b.target}` : ""}
                </span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${STATUS_STYLE[b.status] ?? "bg-cream text-ink-soft"}`}>
                  {b.status}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
