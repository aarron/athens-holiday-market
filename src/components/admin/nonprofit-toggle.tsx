"use client";

import { useState, useTransition } from "react";
import { setNonprofit } from "@/lib/admin-actions";
import { StatusMessage } from "@/components/ui/status-message";

/** Admin switch: "Non-profit booth — no fee". */
export function NonprofitToggle({ applicationId, on: initial }: { applicationId: number; on: boolean }) {
  const [on, setOn] = useState(initial);
  const [pending, start] = useTransition();
  const [err, setErr] = useState("");
  return (
    <div>
      <label className="flex cursor-pointer items-start gap-2.5 text-sm">
        <input
          type="checkbox"
          checked={on}
          disabled={pending}
          onChange={(e) => {
            const next = e.target.checked;
            setErr("");
            setOn(next);
            start(async () => {
              const r = await setNonprofit(applicationId, next);
              if (!(r && "ok" in r && r.ok)) {
                setOn(!next);
                setErr((r && "error" in r && r.error) || "Couldn't save.");
              }
            });
          }}
          className="mt-0.5 h-4.5 w-4.5 accent-sky-deep"
        />
        <span>
          <span className="font-semibold">Non-profit booth</span>
          <span className="block text-ink-soft">
            No booth fee, never invoiced, and gets the non-profit acceptance email.
          </span>
        </span>
      </label>
      {err && <StatusMessage tone="error" className="mt-2">{err}</StatusMessage>}
    </div>
  );
}
