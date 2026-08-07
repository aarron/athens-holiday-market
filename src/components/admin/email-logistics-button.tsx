"use client";

import { useState, useTransition } from "react";
import { emailAcceptedArtistsLogistics } from "@/lib/admin-actions";

export function EmailLogisticsButton() {
  const [pending, start] = useTransition();
  const [armed, setArmed] = useState(false);
  const [msg, setMsg] = useState("");

  return (
    <div className="rounded-2xl bg-cream-soft p-4">
      <p className="mb-2 text-sm text-ink-soft">
        Email event-day logistics (setup times, booth info, ordering) to every accepted artist.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (!armed) {
              setArmed(true);
              setMsg("");
              return;
            }
            start(async () => {
              const r = await emailAcceptedArtistsLogistics();
              setArmed(false);
              setMsg(
                r && "ok" in r
                  ? `Sent to ${r.sent} of ${r.total} accepted artists ✓`
                  : (r && "error" in r && r.error) || "Couldn't send.",
              );
            });
          }}
          className={`rounded-lg px-4 py-2 text-sm font-bold text-white disabled:opacity-60 ${
            armed ? "bg-poppy hover:opacity-90" : "bg-fern-deep hover:opacity-90"
          }`}
        >
          {pending ? "Sending…" : armed ? "Confirm — send to all accepted artists" : "Email logistics to artists"}
        </button>
        {armed && !pending && (
          <button
            type="button"
            onClick={() => setArmed(false)}
            className="text-sm font-semibold text-ink-soft hover:text-ink"
          >
            Cancel
          </button>
        )}
        {msg && <span className="text-sm font-medium text-ink-soft">{msg}</span>}
      </div>
    </div>
  );
}
