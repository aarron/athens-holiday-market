import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { requireArtistAccess } from "@/lib/admin-auth";
import { db } from "@/db";
import { artists } from "@/db/schema";
import { site } from "@/lib/site";
import { ArtistEditor } from "@/components/artist/artist-editor";
import { SharePanel } from "@/components/artist/share-panel";
import { ClockIcon, MapPinIcon, ExternalIcon, GiftIcon } from "@/components/icons";

export const metadata: Metadata = { title: "Your page", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function ArtistPortalPage() {
  const { artist: base } = await requireArtistAccess();
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

  const first = artist.name.split(" ")[0];
  const info = site.artistInfo;
  const pill = "inline-flex items-center gap-1.5 rounded-full border-2 border-ink/15 px-3.5 py-1.5 text-sm font-semibold transition-colors hover:bg-cream";
  const sectionTitle = "flex items-center gap-1.5 font-display text-sm font-bold uppercase tracking-[0.14em] text-teal-deep";

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
          {artist.published && (
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
      <div className="rounded-xl bg-white p-5 shadow-[var(--shadow-card)] sm:p-6">
        <h2 className="font-display text-lg font-extrabold">Event-day essentials</h2>

        <div className="mt-4 grid gap-6 sm:grid-cols-2">
          <div>
            <h3 className={sectionTitle}>
              <ClockIcon size={16} aria-hidden /> When &amp; where
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">
              {site.event.days[0].label} &amp; {site.event.days[1].label}, {site.event.timeLabel}
              <br />
              {site.location.name}
              <br />
              {site.location.street}, {site.location.city}, {site.location.state}
            </p>
          </div>

          <div>
            <h3 className={sectionTitle}>
              <MapPinIcon size={16} aria-hidden /> Your booth
            </h3>
            {info.boothMapUrl ? (
              <a href={info.boothMapUrl} target="_blank" rel="noreferrer" className="mt-2 block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={info.boothMapUrl}
                  alt="Booth layout map"
                  className="w-full rounded-lg border border-ink/10"
                />
              </a>
            ) : (
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                We&apos;ll post the booth layout here as the market gets closer, along with your
                assigned space.
              </p>
            )}
          </div>
        </div>

        <div className="mt-6">
          <h3 className={sectionTitle}>
            <ClockIcon size={16} aria-hidden /> Setup &amp; load-in
          </h3>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-ink-soft">
            {info.setup.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>

        <div className="mt-6">
          <h3 className={sectionTitle}>
            <GiftIcon size={16} aria-hidden /> Order from Big City Bread
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">{info.menuNote}</p>
          {info.menuUrl ? (
            <a
              href={info.menuUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex items-center gap-1.5 font-semibold link"
            >
              View the event menu
              <ExternalIcon size={14} aria-hidden />
            </a>
          ) : (
            <p className="mt-1 text-sm text-ink-soft/70">Event menu link coming soon.</p>
          )}
        </div>
      </div>

      {/* Share your work */}
      {artist.published && (
        <div id="share" className="scroll-mt-20">
          <SharePanel
            name={artist.name}
            medium={artist.medium ?? ""}
            slug={artist.slug}
            photoUrl={artist.photos[0]?.url ?? null}
          />
        </div>
      )}

      {/* Your page (editor) */}
      <div id="edit" className="scroll-mt-20">
        <ArtistEditor initial={initial} status={status} slug={artist.slug} published={artist.published} />
      </div>
    </div>
  );
}
