"use client";

import { useState, useTransition } from "react";
import { emailAcceptedArtistsLogistics } from "@/lib/admin-actions";
import { Button } from "@/components/ui/button";
import { StatusMessage } from "@/components/ui/status-message";

export function EmailLogisticsButton({ count = 0 }: { count?: number }) {
  const [pending, start] = useTransition();
  const [armed, setArmed] = useState(false);
  const [msg, setMsg] = useState("");

  return (
    <div className="rounded-xl bg-cream-soft p-4">
      <p className="mb-2 text-sm text-ink-soft">
        Email event-day logistics (setup times, booth info, ordering) to every accepted artist
        {count > 0 ? ` (${count})` : ""}.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant={armed ? "danger" : "confirm"}
          size="sm"
          loading={pending}
          loadingLabel="Sending…"
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
        >
          {armed
            ? `Confirm — email ${count > 0 ? count : "all"} accepted artist${count === 1 ? "" : "s"}`
            : "Email logistics to artists"}
        </Button>
        {armed && !pending && (
          <button type="button" onClick={() => setArmed(false)} className="text-sm font-semibold text-ink-soft hover:text-ink">
            Cancel
          </button>
        )}
        {msg && <StatusMessage>{msg}</StatusMessage>}
      </div>
    </div>
  );
}
