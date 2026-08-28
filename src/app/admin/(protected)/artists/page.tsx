import type { Metadata } from "next";
import Link from "next/link";
import { listArtistsForAdmin } from "@/lib/admin-data";
import { getSessionUser } from "@/lib/admin-auth";
import { SafeImg } from "@/components/admin/safe-img";
import { AddArtistForm } from "@/components/admin/add-artist-form";
import { EditMyArtistPageButton } from "@/components/admin/edit-my-artist-page-button";
import { ArtistRowActions } from "@/components/admin/artist-row-actions";

export const metadata: Metadata = { title: "Artists", robots: { index: false } };
export const dynamic = "force-dynamic";

function stateOf(a: { submittedAt: Date | null; published: boolean }) {
  if (a.submittedAt) return { label: "Needs review", cls: "bg-tangerine-soft text-tangerine-deep" };
  if (a.published) return { label: "Live", cls: "bg-fern-soft text-fern-deeper" };
  return { label: "Draft", cls: "bg-cream text-ink-soft" };
}

type Tab = "all" | "review" | "live" | "draft";

export default async function AdminArtists({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const artists = await listArtistsForAdmin();
  const me = await getSessionUser();
  const isAdmin = me?.role === "admin";

  // Buckets are mutually exclusive: a submission awaiting review takes priority
  // over its published/draft state (mirrors stateOf's ordering).
  const inReview = (a: (typeof artists)[number]) => a.submittedAt != null;
  const isLive = (a: (typeof artists)[number]) => !a.submittedAt && a.published;
  const isDraft = (a: (typeof artists)[number]) => !a.submittedAt && !a.published;

  const TABS: { key: Tab; label: string; items: typeof artists }[] = [
    { key: "all", label: "All", items: artists },
    { key: "review", label: "To review", items: artists.filter(inReview) },
    { key: "live", label: "Live", items: artists.filter(isLive) },
    { key: "draft", label: "Draft", items: artists.filter(isDraft) },
  ];
  const active = TABS.find((t) => t.key === tab) ?? TABS[0];
  const shown = active.items;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <h1 className="text-3xl font-extrabold">Artist pages</h1>
        <EditMyArtistPageButton />
      </div>

      {isAdmin && <AddArtistForm />}

      {/* Filter tabs */}
      <nav className="flex flex-wrap items-center gap-1 border-b-2 border-ink/10" aria-label="Filter artist pages">
        {TABS.map((t) => {
          const on = t.key === active.key;
          return (
            <Link
              key={t.key}
              href={t.key === "all" ? "/admin/artists" : `/admin/artists?tab=${t.key}`}
              aria-current={on ? "page" : undefined}
              className={`-mb-0.5 flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-display font-bold transition-colors ${
                on ? "border-fern-deep text-ink" : "border-transparent text-ink-soft hover:text-ink"
              }`}
            >
              {t.label}
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                  on ? "bg-fern-soft text-fern-deeper" : "bg-cream text-ink-soft"
                }`}
              >
                {t.items.length}
              </span>
            </Link>
          );
        })}
      </nav>

      {shown.length === 0 ? (
        <div className="rounded-xl bg-white p-10 text-center shadow-[var(--shadow-card)]">
          <p className="text-ink-soft">
            {active.key === "all"
              ? "No artist pages yet. Accepted artists build their pages via a magic link."
              : active.key === "review"
                ? "No submissions awaiting review."
                : active.key === "live"
                  ? "No live artist pages yet."
                  : "No drafts."}
          </p>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {shown.map((a) => {
            const s = stateOf(a);
            return (
              <li
                key={a.id}
                className="relative flex items-center gap-4 rounded-xl bg-white p-4 shadow-[var(--shadow-card)] transition-transform hover:-translate-y-0.5"
              >
                {/* Stretched link: covers the whole card, so any non-interactive
                    area opens the detail page. Interactive controls below sit
                    above it via z-10. */}
                <Link
                  href={`/admin/artists/${a.id}`}
                  aria-label={`Open ${a.name}`}
                  className="absolute inset-0 rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fern-deep"
                />
                <SafeImg
                  src={a.photos[0]?.url ?? null}
                  alt=""
                  flowerSize={20}
                  className="h-14 w-14 shrink-0 rounded-lg object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display font-bold">{a.name}</p>
                  <p className="truncate text-sm text-ink-soft">{a.medium}</p>
                </div>
                <div className="relative z-10 flex flex-wrap items-center justify-end gap-2">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${s.cls}`}>
                    {s.label}
                  </span>
                  <ArtistRowActions artistId={a.id} published={a.published} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
