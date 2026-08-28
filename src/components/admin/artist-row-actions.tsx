"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { unpublishArtistById, deleteArtistPage } from "@/lib/admin-actions";
import { Button } from "@/components/ui/button";

/**
 * Per-row actions in the Artist pages list: unpublish (live pages only) and
 * delete. Both are two-step (arm → confirm) so a misclick in a dense list
 * can't take a page down or delete it. Delete removes the page and its photos
 * but keeps the application, so it can be rebuilt (see deleteArtistPage).
 */
export function ArtistRowActions({
  artistId,
  published,
}: {
  artistId: number;
  published: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [mode, setMode] = useState<"idle" | "unpublish" | "delete">("idle");

  const compact = "h-8 gap-1 px-2.5 text-xs";

  if (mode === "unpublish") {
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
              setMode("idle");
              router.refresh();
            })
          }
        >
          Take down
        </Button>
        <Button variant="ghost" size="sm" className={compact} disabled={pending} onClick={() => setMode("idle")}>
          Cancel
        </Button>
      </div>
    );
  }

  if (mode === "delete") {
    return (
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-semibold text-poppy-deep">Delete page?</span>
        <Button
          variant="danger"
          size="sm"
          className={compact}
          loading={pending}
          loadingLabel="Deleting…"
          onClick={() =>
            start(async () => {
              await deleteArtistPage(artistId);
              router.refresh();
            })
          }
        >
          Delete
        </Button>
        <Button variant="ghost" size="sm" className={compact} disabled={pending} onClick={() => setMode("idle")}>
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      {published && (
        <Button variant="secondary" size="sm" className={compact} onClick={() => setMode("unpublish")}>
          Unpublish
        </Button>
      )}
      <Button
        variant="ghost"
        size="sm"
        className={`${compact} text-poppy-deep hover:bg-poppy-soft`}
        onClick={() => setMode("delete")}
        aria-label="Delete artist page"
      >
        Delete
      </Button>
    </div>
  );
}
