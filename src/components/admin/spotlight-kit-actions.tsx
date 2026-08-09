"use client";

import { useState, useTransition } from "react";
import { emailPostingTeam, rebuildSpotlightKit } from "@/lib/admin-actions";
import { Button } from "@/components/ui/button";
import { StatusMessage } from "@/components/ui/status-message";

/**
 * Admin controls for the branded spotlight zip: rebuild it on demand, grab the
 * download link, or (re-)email the posting team. Both actions render every
 * accepted artist's card server-side, so they show a "building…" state.
 */
export function SpotlightKitActions() {
  const [pending, start] = useTransition();
  const [armed, setArmed] = useState(false);
  const [msg, setMsg] = useState("");
  const [zipUrl, setZipUrl] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        {!armed ? (
          <Button variant="secondary" size="sm" onClick={() => { setArmed(true); setMsg(""); }}>
            Email the posting team
          </Button>
        ) : (
          <span className="inline-flex flex-wrap items-center gap-2 rounded-lg border-2 border-ink/15 bg-cream-soft px-3 py-2 text-sm text-ink-soft">
            Rebuild the kit and send it to the posting team?
            <Button
              variant="confirm"
              size="sm"
              loading={pending}
              loadingLabel="Building &amp; sending…"
              onClick={() =>
                start(async () => {
                  const r = await emailPostingTeam();
                  setArmed(false);
                  setMsg(
                    r && "ok" in r
                      ? `Sent to the posting team ✓`
                      : (r && "error" in r && r.error) || "Couldn't send.",
                  );
                })
              }
            >
              Confirm
            </Button>
            <button
              type="button"
              disabled={pending}
              onClick={() => setArmed(false)}
              className="font-semibold text-ink-soft underline underline-offset-2 disabled:opacity-60"
            >
              Cancel
            </button>
          </span>
        )}

        <Button
          variant="ghost"
          size="sm"
          loading={pending}
          loadingLabel="Building…"
          onClick={() =>
            start(async () => {
              setMsg("");
              const r = await rebuildSpotlightKit();
              if ("ok" in r) {
                setZipUrl(r.url);
                setMsg(`Rebuilt ${r.count} artist${r.count === 1 ? "" : "s"} ✓`);
              } else {
                setMsg(r.error);
              }
            })
          }
        >
          Rebuild images
        </Button>

        {zipUrl && (
          <a
            href={zipUrl}
            className="inline-flex items-center gap-1.5 rounded-lg border-2 border-fern-deep/30 px-3 py-1.5 text-sm font-semibold text-fern-deep hover:bg-fern-deep/5"
          >
            Download zip ↓
          </a>
        )}
      </div>
      {msg && <StatusMessage>{msg}</StatusMessage>}
    </div>
  );
}
