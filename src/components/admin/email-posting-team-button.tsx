"use client";

import { useState, useTransition } from "react";
import { emailPostingTeam } from "@/lib/admin-actions";

export function EmailPostingTeamButton() {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState("");

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setMsg("");
            const r = await emailPostingTeam();
            setMsg(
              r && "ok" in r
                ? `Sent to ${r.count} people ✓`
                : (r && "error" in r && r.error) || "Couldn't send.",
            );
          })
        }
        className="rounded-lg border-2 border-ink/15 px-4 py-2 text-sm font-semibold hover:bg-cream disabled:opacity-60"
      >
        {pending ? "Sending…" : "Email the posting team"}
      </button>
      {msg && <span className="text-sm font-medium text-ink-soft">{msg}</span>}
    </div>
  );
}
