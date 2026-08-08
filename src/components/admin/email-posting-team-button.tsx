"use client";

import { useState, useTransition } from "react";
import { emailPostingTeam } from "@/lib/admin-actions";
import { Button } from "@/components/ui/button";
import { StatusMessage } from "@/components/ui/status-message";

export function EmailPostingTeamButton() {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState("");
  const [armed, setArmed] = useState(false);

  return (
    <div className="flex flex-wrap items-center gap-3">
      {!armed ? (
        <Button variant="secondary" size="sm" onClick={() => { setArmed(true); setMsg(""); }}>
          Email the posting team
        </Button>
      ) : (
        <span className="inline-flex flex-wrap items-center gap-2 rounded-lg border-2 border-ink/15 bg-cream-soft px-3 py-2 text-sm text-ink-soft">
          Send the social kit to the posting team?
          <Button
            variant="confirm"
            size="sm"
            loading={pending}
            loadingLabel="Sending…"
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
          >
            Confirm
          </Button>
          <button type="button" disabled={pending} onClick={() => setArmed(false)} className="font-semibold text-ink-soft underline underline-offset-2 disabled:opacity-60">
            Cancel
          </button>
        </span>
      )}
      {msg && <StatusMessage>{msg}</StatusMessage>}
    </div>
  );
}
