"use client";

import { useState, useTransition } from "react";
import { emailPostingTeam } from "@/lib/admin-actions";

export function EmailPostingTeamButton() {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState("");
  const [armed, setArmed] = useState(false);

  return (
    <div className="flex flex-wrap items-center gap-3">
      {!armed ? (
        <button
          type="button"
          onClick={() => { setArmed(true); setMsg(""); }}
          className="rounded-lg border-2 border-ink/15 px-4 py-2 text-sm font-semibold hover:bg-cream"
        >
          Email the posting team
        </button>
      ) : (
        <span className="inline-flex flex-wrap items-center gap-2 rounded-lg border-2 border-ink/15 bg-cream-soft px-3 py-2 text-sm text-ink-soft">
          Send the social kit to the posting team?
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await emailPostingTeam();
                setArmed(false);
                setMsg(
                  r && "ok" in r
                    ? `Sent to ${r.count} people ✓`
                    : (r && "error" in r && r.error) || "Couldn't send.",
                );
              })
            }
            className="rounded-lg bg-fern-deep px-4 py-1.5 text-sm font-display font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {pending ? "Sending…" : "Confirm"}
          </button>
          <button type="button" disabled={pending} onClick={() => setArmed(false)} className="font-semibold text-ink-soft underline underline-offset-2 disabled:opacity-60">
            Cancel
          </button>
        </span>
      )}
      {msg && <span role="status" className="text-sm font-medium text-ink-soft">{msg}</span>}
    </div>
  );
}
