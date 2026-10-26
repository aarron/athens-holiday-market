"use client";

import { useState, useTransition } from "react";
import { approveArtistSubmission, returnArtistSubmission } from "@/lib/admin-actions";
import { Button } from "@/components/ui/button";
import { StatusMessage } from "@/components/ui/status-message";

/**
 * Approve or return an artist's submitted page. Approving is two-step: the
 * first click swaps the buttons for an inline confirm in the same row, since
 * it publishes the page and emails the artist.
 */
export function ReviewControls({ artistId }: { artistId: number }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState("");
  const [armed, setArmed] = useState(false);

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      {armed ? (
        <>
          <span className="text-sm font-semibold text-ink">Publish the page and email the artist?</span>
          <Button
            variant="confirm"
            size="sm"
            loading={pending}
            loadingLabel="Publishing…"
            onClick={() =>
              start(async () => {
                const r = await approveArtistSubmission(artistId);
                setArmed(false);
                setMsg(r && "ok" in r && r.ok ? "Approved and published ✓" : r?.error || "Failed");
              })
            }
          >
            Yes, publish
          </Button>
          <Button variant="ghost" size="sm" disabled={pending} onClick={() => setArmed(false)}>
            Cancel
          </Button>
        </>
      ) : (
        <>
          <Button variant="confirm" size="sm" disabled={pending} onClick={() => setArmed(true)}>
            Approve &amp; publish
          </Button>
          <Button
            variant="secondary"
            size="sm"
            loading={pending}
            loadingLabel="Returning…"
            onClick={() =>
              start(async () => {
                const r = await returnArtistSubmission(artistId);
                setMsg(r && "ok" in r && r.ok ? "Returned to the artist." : "Failed");
              })
            }
          >
            Return without publishing
          </Button>
        </>
      )}
      {msg && <StatusMessage>{msg}</StatusMessage>}
    </div>
  );
}
