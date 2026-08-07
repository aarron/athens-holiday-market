"use client";

import { useState, useTransition } from "react";
import { approveArtistSubmission, returnArtistSubmission } from "@/lib/admin-actions";

export function ReviewControls({ artistId }: { artistId: number }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState("");
  const [armed, setArmed] = useState(false);

  return (
    <div className="flex flex-wrap items-center gap-3">
      {!armed ? (
        <button
          onClick={() => setArmed(true)}
          className="rounded-lg bg-fern-deep px-5 py-2.5 font-display font-bold text-white transition-opacity hover:opacity-90"
        >
          Approve &amp; publish
        </button>
      ) : (
        <span className="inline-flex flex-wrap items-center gap-2 rounded-lg border-2 border-fern-deep/30 bg-fern-soft/50 px-3 py-2 text-sm text-ink-soft">
          Publishes the page and emails the artist.
          <button
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await approveArtistSubmission(artistId);
                setArmed(false);
                setMsg(r && "ok" in r && r.ok ? "Approved and published ✓" : r?.error || "Failed");
              })
            }
            className="rounded-lg bg-fern-deep px-4 py-1.5 font-display font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {pending ? "Working…" : "Confirm"}
          </button>
          <button disabled={pending} onClick={() => setArmed(false)} className="font-semibold text-ink-soft underline underline-offset-2 disabled:opacity-60">
            Cancel
          </button>
        </span>
      )}
      <button
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await returnArtistSubmission(artistId);
            setMsg(r && "ok" in r && r.ok ? "Returned to the artist." : "Failed");
          })
        }
        className="rounded-lg border-2 border-ink/15 px-5 py-2.5 font-display font-semibold hover:bg-cream disabled:opacity-60"
      >
        Return without publishing
      </button>
      {msg && <span role="status" className="text-sm font-medium text-ink-soft">{msg}</span>}
    </div>
  );
}
