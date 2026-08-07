import type { Metadata } from "next";
import Link from "next/link";
import { listArtistsForAdmin } from "@/lib/admin-data";
import { SafeImg } from "@/components/admin/safe-img";
import { EmailLogisticsButton } from "@/components/admin/email-logistics-button";

export const metadata: Metadata = { title: "Artists", robots: { index: false } };
export const dynamic = "force-dynamic";

function stateOf(a: { submittedAt: Date | null; published: boolean }) {
  if (a.submittedAt) return { label: "Needs review", cls: "bg-[#fdf0e0] text-tangerine-deep" };
  if (a.published) return { label: "Live", cls: "bg-fern-soft text-fern-deep" };
  return { label: "Draft", cls: "bg-cream text-ink-soft" };
}

export default async function AdminArtists() {
  const artists = await listArtistsForAdmin();
  const pending = artists.filter((a) => a.submittedAt);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold">Artist pages</h1>
        <p className="mt-1 text-ink-soft">
          {pending.length > 0
            ? `${pending.length} submission${pending.length === 1 ? "" : "s"} awaiting review.`
            : "No submissions awaiting review."}
        </p>
      </div>

      <EmailLogisticsButton />

      {artists.length === 0 ? (
        <div className="rounded-xl bg-white p-10 text-center shadow-[var(--shadow-card)]">
          <p className="text-ink-soft">
            No artist pages yet. Accepted artists build their pages via a magic link.
          </p>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {artists.map((a) => {
            const s = stateOf(a);
            return (
              <li key={a.id}>
                <Link
                  href={`/admin/artists/${a.id}`}
                  className="flex items-center gap-4 rounded-xl bg-white p-4 shadow-[var(--shadow-card)] transition-transform hover:-translate-y-0.5"
                >
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
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${s.cls}`}>
                    {s.label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
