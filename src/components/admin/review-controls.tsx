"use client";

import { useState, useTransition } from "react";
import { approveArtistSubmission, returnArtistSubmission } from "@/lib/admin-actions";

export function ReviewControls({ artistId }: { artistId: number }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState("");

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await approveArtistSubmission(artistId);
            setMsg(r && "ok" in r && r.ok ? "Approved and published ✓" : r?.error || "Failed");
          })
        }
        className="rounded-md bg-fern-deep px-5 py-2.5 font-display font-bold text-white hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Working…" : "Approve & publish"}
      </button>
      <button
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await returnArtistSubmission(artistId);
            setMsg(r && "ok" in r && r.ok ? "Returned to the artist." : "Failed");
          })
        }
        className="rounded-md border-2 border-ink/15 px-5 py-2.5 font-display font-semibold hover:bg-cream disabled:opacity-60"
      >
        Return without publishing
      </button>
      {msg && <span className="text-sm font-medium text-ink-soft">{msg}</span>}
    </div>
  );
}
