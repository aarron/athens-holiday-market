import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getArtistBySlug, allPublishedSlugs } from "@/lib/artists-data";
import { SafeImg } from "@/components/admin/safe-img";
import { ArtistShareButtons } from "@/components/artist/artist-share-buttons";
import { Flower } from "@/components/brand";
import {
  BackIcon,
  ExternalIcon,
  InstagramIcon,
  FacebookIcon,
  TiktokIcon,
  YoutubeIcon,
  XIcon,
  GlobeIcon,
} from "@/components/icons";
import { categorizeMedium } from "@/lib/mediums";
import { cleanName, cleanUrl, sanitizeSocials } from "@/lib/clean";

type IconType = typeof InstagramIcon;
const SOCIALS: Record<string, { label: string; Icon: IconType }> = {
  instagram: { label: "Instagram", Icon: InstagramIcon },
  facebook: { label: "Facebook", Icon: FacebookIcon },
  tiktok: { label: "TikTok", Icon: TiktokIcon },
  youtube: { label: "YouTube", Icon: YoutubeIcon },
  x: { label: "X", Icon: XIcon },
  twitter: { label: "X", Icon: XIcon },
  etsy: { label: "Etsy", Icon: GlobeIcon },
};
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
  const desc =
    (artist.statement ?? artist.bio)?.slice(0, 155) ??
    `${cleanName(artist.name)} — ${categorizeMedium(artist.medium)} at the ${site.name}.`;
  return {
    title: cleanName(artist.name),
    description: desc,
    alternates: { canonical: `/artists/${artist.slug}` },
    openGraph: {
      title: `${cleanName(artist.name)} · ${site.name}`,
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

  // Sanitize on render too (defense in depth): known platforms + safe URLs only.
  const socialEntries = Object.entries(sanitizeSocials(artist.socials as Record<string, string>));

  return (
    <div className="mx-auto max-w-7xl px-5 pb-12 pt-24 sm:px-8 sm:pb-16 sm:pt-28">
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
          <h1 className="text-4xl font-extrabold sm:text-5xl">{cleanName(artist.name)}</h1>
          {categorizeMedium(artist.medium) !== "Other" && (
            <p className="mt-2 text-lg font-bold text-fern-deep">{categorizeMedium(artist.medium)}</p>
          )}

          {artist.statement && (
            <p className="mt-5 whitespace-pre-line text-lg leading-relaxed text-ink-soft">
              {artist.statement}
            </p>
          )}

          {artist.bio && (
            <div className="mt-6 border-t border-ink/10 pt-5">
              <h2 className="font-display text-sm font-bold uppercase tracking-[0.16em] text-teal-deep">
                About {artist.name.split(" ")[0]}
              </h2>
              <p className="mt-2 whitespace-pre-line leading-relaxed text-ink-soft">{artist.bio}</p>
            </div>
          )}

          {(cleanUrl(artist.website) || socialEntries.length > 0) && (
            <div className="mt-7 flex flex-wrap gap-2.5">
              {cleanUrl(artist.website) && (
                <a
                  href={cleanUrl(artist.website)!}
                  target="_blank"
                  rel="noreferrer nofollow"
                  className="inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-sm font-display font-semibold text-paper transition-colors hover:bg-ink-soft"
                >
                  Visit website
                  <ExternalIcon size={15} aria-hidden />
                </a>
              )}
              {socialEntries.map(([key, url]) => {
                const s = SOCIALS[key];
                const Icon = s?.Icon ?? GlobeIcon;
                // url is already sanitized (https, safe host) by sanitizeSocials;
                // key is guaranteed to be a known platform, so the label is real.
                return (
                  <a
                    key={key}
                    href={url}
                    target="_blank"
                    rel="noreferrer nofollow"
                    aria-label={s?.label ?? key}
                    className="inline-flex items-center gap-1.5 rounded-full border-2 border-ink/15 px-4 py-2 text-sm font-display font-semibold transition-colors hover:bg-cream"
                  >
                    <Icon size={16} aria-hidden />
                    {s?.label ?? key}
                  </a>
                );
              })}
            </div>
          )}

          <ArtistShareButtons url={`${site.url}/artists/${artist.slug}`} name={cleanName(artist.name)} />

          <div className="mt-8 border-t border-ink/10 pt-5">
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
