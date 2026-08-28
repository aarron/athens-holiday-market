"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { unpublishArtistById } from "@/lib/admin-actions";
import { Button } from "@/components/ui/button";

/**
 * Take a live artist page down from the public directory, straight from the
 * Artist pages list. Two-step (arm → confirm) so a misclick in a dense list
 * can't pull a page offline. The record is kept — this only flips `published`.
 * Keyed by artist id so it works for every published page, including artists
 * with no linked application.
 */
export function UnpublishArtistButton({ artistId }: { artistId: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [armed, setArmed] = useState(false);

  const compact = "h-8 gap-1 px-2.5 text-xs";

  if (!armed) {
    return (
      <Button
        variant="secondary"
        size="sm"
        className={compact}
        onClick={() => setArmed(true)}
      >
        Unpublish
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <Button
        variant="danger"
        size="sm"
        className={compact}
        loading={pending}
        loadingLabel="Taking down…"
        onClick={() =>
          start(async () => {
            await unpublishArtistById(artistId);
            setArmed(false);
            router.refresh();
          })
        }
      >
        Take down
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className={compact}
        disabled={pending}
        onClick={() => setArmed(false)}
      >
        Cancel
      </Button>
    </div>
  );
}
