import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getArtistForAdmin } from "@/lib/admin-data";
import { SafeImg } from "@/components/admin/safe-img";
import { ReviewControls } from "@/components/admin/review-controls";

export const metadata: Metadata = { title: "Review artist", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AdminArtistReview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const artist = await getArtistForAdmin(Number(id));
  if (!artist) notFound();

  const pc = artist.pendingContent;
  const socialEntries = Object.entries((pc?.socials ?? {}) as Record<string, string>).filter(
    ([, v]) => v,
  );

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/admin/artists" className="text-sm font-semibold text-ink-soft hover:text-fern-deep">
        ← All artist pages
      </Link>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold">{artist.name}</h1>
          <p className="text-ink-soft">{artist.medium}</p>
        </div>
        {artist.published && (
          <a
            href={`/artists/${artist.slug}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-md bg-fern-soft px-4 py-2 text-sm font-display font-bold text-fern-deep"
          >
            View live page ↗
          </a>
        )}
      </div>

      {pc ? (
        <div className="mt-6 space-y-6">
          <div className="rounded-xl border-2 border-tangerine/40 bg-[#fdf0e0]/40 p-5">
            <p className="font-display font-bold text-tangerine">Submitted for review</p>
            <p className="mt-1 text-sm text-ink-soft">
              Review the artist&apos;s submission below. Approving replaces their live page.
            </p>
            <div className="mt-4">
              <ReviewControls artistId={artist.id} />
            </div>
          </div>

          {/* Photos */}
          {pc.photoUrls && pc.photoUrls.length > 0 && (
            <section className="rounded-xl bg-white p-5 shadow-[var(--shadow-card)]">
              <h2 className="font-display text-sm font-bold uppercase tracking-wide text-ink-soft">
                Photos
              </h2>
              <div className="mt-3 grid grid-cols-3 gap-3">
                {pc.photoUrls.map((url) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={url} src={url} alt="" className="aspect-square w-full rounded-lg object-cover" />
                ))}
              </div>
            </section>
          )}

          {pc.logoUrl && (
            <section className="rounded-xl bg-white p-5 shadow-[var(--shadow-card)]">
              <h2 className="font-display text-sm font-bold uppercase tracking-wide text-ink-soft">Logo</h2>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={pc.logoUrl} alt="Logo" className="mt-3 h-24 w-24 rounded-lg object-contain" />
            </section>
          )}

          <section className="rounded-xl bg-white p-5 shadow-[var(--shadow-card)]">
            <h2 className="font-display text-sm font-bold uppercase tracking-wide text-ink-soft">
              Artist statement
            </h2>
            <p className="mt-2 whitespace-pre-line leading-relaxed">{pc.bio || "—"}</p>
          </section>

          <section className="rounded-xl bg-white p-5 shadow-[var(--shadow-card)]">
            <h2 className="font-display text-sm font-bold uppercase tracking-wide text-ink-soft">Links</h2>
            <ul className="mt-2 space-y-1 text-sm">
              <li>Website: {pc.website || "—"}</li>
              {socialEntries.map(([k, v]) => (
                <li key={k}>
                  {k}: {v}
                </li>
              ))}
            </ul>
          </section>
        </div>
      ) : (
        <div className="mt-6 rounded-xl bg-white p-6 shadow-[var(--shadow-card)]">
          <p className="text-ink-soft">
            {artist.published
              ? "This page is live with no pending changes."
              : "No submission yet. The artist hasn't submitted their page for review."}
          </p>
          {artist.photos.length > 0 && (
            <div className="mt-4 grid grid-cols-3 gap-3">
              {artist.photos.map((p) => (
                <SafeImg key={p.id} src={p.url} alt="" className="aspect-square w-full rounded-lg object-cover" />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
