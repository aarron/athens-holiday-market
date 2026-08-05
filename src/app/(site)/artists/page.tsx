import type { Metadata } from "next";
import Link from "next/link";
import { listPublishedArtists } from "@/lib/artists-data";
import { SafeImg } from "@/components/admin/safe-img";
import { Flower } from "@/components/brand";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Artists",
  description:
    "Meet the local artists and makers of the Athens Holiday Market — ceramics, textiles, jewelry, candles, prints and more, all handmade.",
  alternates: { canonical: "/artists" },
};

export const revalidate = 300;

export default async function ArtistsPage() {
  const artists = await listPublishedArtists();

  return (
    <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20">
      <div className="max-w-2xl">
        <p className="font-display text-sm font-bold uppercase tracking-[0.18em] text-fern-deep">
          The lineup
        </p>
        <h1 className="mt-3 text-4xl font-extrabold sm:text-6xl">Meet the artists.</h1>
        <p className="mt-5 text-lg text-ink-soft">
          Every booth at the {site.event.year} {site.name} is a local artist or maker. Here&apos;s
          who you&apos;ll meet in the courtyard.
        </p>
      </div>

      {artists.length === 0 ? (
        <div className="mt-12 rounded-xl bg-cream-soft p-12 text-center">
          <Flower size={56} color="var(--color-fuchsia)" spin className="mx-auto" />
          <h2 className="mt-6 text-2xl font-extrabold">The lineup is coming soon</h2>
          <p className="mx-auto mt-2 max-w-md text-ink-soft">
            Our jury is still curating this year&apos;s artists. Subscribe on the{" "}
            <Link href="/" className="font-semibold text-fern-deep underline underline-offset-4">
              home page
            </Link>{" "}
            to be the first to see the full roster.
          </p>
        </div>
      ) : (
        <ul className="mt-12 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
          {artists.map((a) => (
            <li key={a.id}>
              <Link href={`/artists/${a.slug}`} className="group block">
                <div className="overflow-hidden rounded-lg shadow-[var(--shadow-card)]">
                  <SafeImg
                    src={a.photos[0]?.url ?? null}
                    alt={`Work by ${a.name}`}
                    flowerSize={32}
                    className="aspect-square w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <h2 className="mt-3 font-display text-lg font-bold leading-tight group-hover:text-fern-deep">
                  {a.name}
                </h2>
                {a.medium && <p className="text-sm text-ink-soft">{a.medium}</p>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
