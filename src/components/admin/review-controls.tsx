"use client";

import { useState, useTransition } from "react";
import { approveArtistSubmission, returnArtistSubmission } from "@/lib/admin-actions";
import { Button } from "@/components/ui/button";
import { StatusMessage } from "@/components/ui/status-message";

export function ReviewControls({ artistId }: { artistId: number }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState("");
  const [armed, setArmed] = useState(false);

  return (
    <div className="flex flex-wrap items-center gap-3">
      {!armed ? (
        <Button variant="confirm" size="sm" onClick={() => setArmed(true)}>
          Approve &amp; publish
        </Button>
      ) : (
        <span className="inline-flex flex-wrap items-center gap-2 rounded-lg border-2 border-fern-deep/30 bg-fern-soft/50 px-3 py-2 text-sm text-ink-soft">
          Publishes the page and emails the artist.
          <Button
            variant="confirm"
            size="sm"
            loading={pending}
            onClick={() =>
              start(async () => {
                const r = await approveArtistSubmission(artistId);
                setArmed(false);
                setMsg(r && "ok" in r && r.ok ? "Approved and published ✓" : r?.error || "Failed");
              })
            }
          >
            Confirm
          </Button>
          <button disabled={pending} onClick={() => setArmed(false)} className="font-semibold text-ink-soft underline underline-offset-2 disabled:opacity-60">
            Cancel
          </button>
        </span>
      )}
      <Button
        variant="secondary"
        size="sm"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await returnArtistSubmission(artistId);
            setMsg(r && "ok" in r && r.ok ? "Returned to the artist." : "Failed");
          })
        }
      >
        Return without publishing
      </Button>
      {msg && <StatusMessage>{msg}</StatusMessage>}
    </div>
  );
}
