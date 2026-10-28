import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { requireArtistAccess } from "@/lib/admin-auth";
import { isStaff } from "@/lib/roles";
import { isNonprofitMedium } from "@/lib/nonprofit";
import { db } from "@/db";
import { artists } from "@/db/schema";
import { site } from "@/lib/site";
import { ArtistEditor } from "@/components/artist/artist-editor";
import { SharePanel } from "@/components/artist/share-panel";
import { ExternalIcon } from "@/components/icons";
import { EventDayEssentials } from "@/components/artist/event-day-essentials";

export const metadata: Metadata = { title: "Your page", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function ArtistPortalPage() {
  const { user, artist: base } = await requireArtistAccess();
  const artist = await db.query.artists.findFirst({
    where: eq(artists.id, base.id),
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
    statement: pc?.statement ?? artist.statement ?? "",
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

  // The share kit only needs a photo, not a published page — so an artist who's
  // mid-edit (or waiting on approval) can still grab their promo images when the
  // "your kit is ready" email lands.
  const heroPhoto = initial.photoUrls[0] ?? null;
  const canShare = !!heroPhoto;

  const nonprofit = isNonprofitMedium(artist.medium);
  // An organization is greeted by its full name ("Welcome, Sweet Olive Farm").
  const first = nonprofit ? artist.name : artist.name.split(" ")[0];
  const pill = "inline-flex items-center gap-1.5 rounded-full border-2 border-ink/15 px-3.5 py-1.5 text-sm font-semibold transition-colors hover:bg-cream";

  return (
    <div className="space-y-6">
      {/* Welcome + quick links */}
      <div className="rounded-xl bg-white p-5 shadow-[var(--shadow-card)] sm:p-6">
        <h1 className="text-2xl font-extrabold sm:text-3xl">Welcome, {first} 👋</h1>
        <p className="mt-1.5 text-ink-soft">
          Everything you need for the {site.event.year} {site.name} lives here — your page,
          event-day details, and ready-made images to share.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {artist.published && (
            <a href={`/artists/${artist.slug}`} target="_blank" rel="noreferrer" className={pill}>
              View your live page
              <ExternalIcon size={14} aria-hidden />
            </a>
          )}
          {canShare && (
            <a href="#share" className={pill}>
              Get share images
            </a>
          )}
          <a href="#edit" className={pill}>
            Edit your page
          </a>
        </div>
      </div>

      {/* Event-day essentials */}
      <EventDayEssentials />

      {/* Share your work */}
      {canShare && (
        <div id="share" className="scroll-mt-20">
          <SharePanel
            name={artist.name}
            medium={artist.medium ?? ""}
            slug={artist.slug}
            photoUrl={heroPhoto}
            published={artist.published}
          />
        </div>
      )}

      {/* Your page (editor) */}
      <div id="edit" className="scroll-mt-20">
        <ArtistEditor initial={initial} status={status} slug={artist.slug} published={artist.published} selfPublish={isStaff(user.role)} nonprofit={nonprofit} />
      </div>
    </div>
  );
}
