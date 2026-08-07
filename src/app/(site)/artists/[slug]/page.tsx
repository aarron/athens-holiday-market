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
    `${artist.name} — ${artist.medium} at the ${site.name}.`;
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
            <p className="mt-2 text-lg font-bold text-fern-deep">{artist.medium}</p>
          )}

          {artist.statement && (
            <p className="mt-5 whitespace-pre-line text-lg leading-relaxed text-ink-soft">
              {artist.statement}
            </p>
          )}

          {artist.bio && (
            <div className="mt-6 border-t border-ink/10 pt-5">
              <h2 className="font-display text-sm font-bold uppercase tracking-[0.16em] text-teal">
                About {artist.name.split(" ")[0]}
              </h2>
              <p className="mt-2 whitespace-pre-line leading-relaxed text-ink-soft">{artist.bio}</p>
            </div>
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
              {socialEntries.map(([key, url]) => {
                const s = SOCIALS[key];
                const Icon = s?.Icon ?? GlobeIcon;
                return (
                  <a
                    key={key}
                    href={url.startsWith("http") ? url : `https://${url}`}
                    target="_blank"
                    rel="noreferrer"
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

          <ArtistShareButtons url={`${site.url}/artists/${artist.slug}`} name={artist.name} />

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
