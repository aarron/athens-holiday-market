import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getArtistBySlug, allPublishedSlugs } from "@/lib/artists-data";
import { SafeImg } from "@/components/admin/safe-img";
import { Flower } from "@/components/brand";
import { BackIcon, ExternalIcon } from "@/components/icons";
import { site } from "@/lib/site";

export const revalidate = 300;

export async function generateStaticParams() {
  const slugs = await allPublishedSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const artist = await getArtistBySlug(slug);
  if (!artist || !artist.published) return { title: "Artist not found" };
  const desc = artist.bio?.slice(0, 155) ?? `${artist.name} — ${artist.medium} at the ${site.name}.`;
  return {
    title: artist.name,
    description: desc,
    alternates: { canonical: `/artists/${artist.slug}` },
    openGraph: {
      title: `${artist.name} · ${site.name}`,
      description: desc,
      images: artist.photos[0]?.url ? [{ url: artist.photos[0].url }] : undefined,
    },
  };
}

const SOCIAL_LABELS: Record<string, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
  etsy: "Etsy",
  youtube: "YouTube",
  x: "X",
  twitter: "X",
};

export default async function ArtistPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const artist = await getArtistBySlug(slug);
  if (!artist || !artist.published) notFound();

  const socials = (artist.socials ?? {}) as Record<string, string>;
  const socialEntries = Object.entries(socials).filter(([, v]) => v);

  return (
    <div className="mx-auto max-w-6xl px-5 pb-12 pt-24 sm:px-8 sm:pb-16 sm:pt-28">
      <Link href="/artists" className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-soft hover:text-fern-deep">
        <BackIcon size={16} aria-hidden />
        All artists
      </Link>

      <div className="mt-6 grid gap-10 lg:grid-cols-[1.3fr_1fr] lg:items-start">
        {/* Photo gallery */}
        <div className="grid grid-cols-2 gap-3">
          {artist.photos.slice(0, 6).map((p, i) => (
            <div
              key={p.id}
              className={`overflow-hidden rounded-lg shadow-[var(--shadow-card)] ${
                i === 0 ? "col-span-2 aspect-[4/3]" : "aspect-square"
              }`}
            >
              <SafeImg src={p.url} alt={`Work by ${artist.name}`} flowerSize={36} className="h-full w-full object-cover" />
            </div>
          ))}
          {artist.photos.length === 0 && (
            <div className="col-span-2 flex aspect-[4/3] items-center justify-center rounded-lg bg-cream">
              <Flower size={48} color="var(--color-fuchsia)" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="lg:sticky lg:top-24">
          <h1 className="text-4xl font-extrabold sm:text-5xl">{artist.name}</h1>
          {artist.medium && (
            <p className="mt-2 text-lg text-ink-soft">{artist.medium}</p>
          )}

          {artist.bio && (
            <p className="mt-5 whitespace-pre-line text-lg leading-relaxed text-ink-soft">
              {artist.bio}
            </p>
          )}

          {(artist.website || socialEntries.length > 0) && (
            <div className="mt-7 flex flex-wrap gap-2.5">
              {artist.website && (
                <a
                  href={artist.website.startsWith("http") ? artist.website : `https://${artist.website}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-sm font-display font-semibold text-paper transition-colors hover:bg-ink-soft"
                >
                  Visit website
                  <ExternalIcon size={15} aria-hidden />
                </a>
              )}
              {socialEntries.map(([key, url]) => (
                <a
                  key={key}
                  href={url.startsWith("http") ? url : `https://${url}`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border-2 border-ink/15 px-4 py-2 text-sm font-display font-semibold transition-colors hover:bg-cream"
                >
                  {SOCIAL_LABELS[key] ?? key}
                </a>
              ))}
            </div>
          )}

          <div className="mt-8 rounded-xl bg-cream-soft p-5">
            <p className="text-sm text-ink-soft">
              Find {artist.name.split(" ")[0]} at the {site.event.year} {site.name} —{" "}
              {site.location.name}, {site.event.days[0].label} &amp; {site.event.days[1].label}.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
