"use client";

import { useState } from "react";
import { makeShareCard, type ShareCardKind } from "@/lib/share-card";

export type SpotlightArtist = {
  name: string;
  medium: string;
  slug: string;
  photoUrl: string | null;
};

function SpotlightCard({ artist }: { artist: SpotlightArtist }) {
  const [busy, setBusy] = useState<ShareCardKind | null>(null);
  const [err, setErr] = useState(false);

  async function download(kind: ShareCardKind) {
    setErr(false);
    setBusy(kind);
    try {
      const blob = await makeShareCard(kind, artist.photoUrl, artist.name, artist.medium);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ahm-${artist.slug}-${kind}.jpg`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setErr(true);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="overflow-hidden rounded-xl bg-white shadow-[var(--shadow-card)] ring-1 ring-ink/5">
      <div className="aspect-square bg-cream">
        {artist.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={artist.photoUrl} alt={artist.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-ink-soft/60">No photo</div>
        )}
      </div>
      <div className="p-3">
        <p className="truncate font-display font-bold leading-tight">{artist.name}</p>
        {artist.medium && <p className="truncate text-xs text-ink-soft">{artist.medium}</p>}
        <div className="mt-2.5 flex gap-2">
          <button
            type="button"
            onClick={() => download("square")}
            disabled={busy !== null}
            className="flex-1 rounded-md bg-fern-deep px-2 py-1.5 text-xs font-bold text-white hover:opacity-90 disabled:opacity-60"
          >
            {busy === "square" ? "…" : "Feed"}
          </button>
          <button
            type="button"
            onClick={() => download("story")}
            disabled={busy !== null}
            className="flex-1 rounded-md border-2 border-ink/15 px-2 py-1.5 text-xs font-semibold hover:bg-cream disabled:opacity-60"
          >
            {busy === "story" ? "…" : "Story"}
          </button>
        </div>
        {err && <p className="mt-1 text-xs font-medium text-poppy">Couldn&apos;t generate — retry.</p>}
      </div>
    </div>
  );
}

export function SpotlightDownloader({ artists }: { artists: SpotlightArtist[] }) {
  if (!artists.length) {
    return (
      <p className="rounded-xl bg-cream-soft p-8 text-center text-ink-soft">
        No published artists yet. Spotlight images appear here once artist pages go live.
      </p>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {artists.map((a) => (
        <SpotlightCard key={a.slug} artist={a} />
      ))}
    </div>
  );
}
