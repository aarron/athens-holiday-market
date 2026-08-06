import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { requireArtist } from "@/lib/admin-auth";
import { db } from "@/db";
import { artists } from "@/db/schema";
import { ArtistEditor } from "@/components/artist/artist-editor";

export const metadata: Metadata = { title: "Your page", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function ArtistPortalPage() {
  const user = await requireArtist();
  const artist = await db.query.artists.findFirst({
    where: eq(artists.id, user.artistId!),
    with: { photos: { orderBy: (p, { asc }) => [asc(p.position)] } },
  });

  if (!artist) {
    return (
      <div className="rounded-xl bg-white p-8 text-center shadow-[var(--shadow-card)]">
        <p className="text-ink-soft">We couldn&apos;t find your artist profile. Please contact us.</p>
      </div>
    );
  }

  const pc = artist.pendingContent;
  const initial = {
    name: artist.name,
    medium: artist.medium ?? "",
    bio: pc?.bio ?? artist.bio ?? "",
    website: pc?.website ?? artist.website ?? "",
    socials: pc?.socials ?? ((artist.socials as Record<string, string>) ?? {}),
    logoUrl: pc?.logoUrl ?? artist.logoUrl ?? null,
    photoUrls: pc?.photoUrls ?? artist.photos.map((p) => p.url),
  };

  const status: "draft" | "pending" | "published" = artist.pendingContent
    ? "pending"
    : artist.published
      ? "published"
      : "draft";

  return (
    <ArtistEditor initial={initial} status={status} slug={artist.slug} published={artist.published} />
  );
}
