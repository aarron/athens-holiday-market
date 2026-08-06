import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin-auth";
import { listBroadcasts } from "@/lib/broadcast-data";

export const metadata: Metadata = { title: "Broadcasts", robots: { index: false } };
export const dynamic = "force-dynamic";

const SEGMENT_LABEL: Record<string, string> = {
  all: "Everyone",
  artists: "Artists",
  non_artists: "Non-artists",
};

export default async function BroadcastsPage() {
  await requireAdmin();
  const broadcasts = await listBroadcasts();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold">Broadcasts</h1>
          <p className="mt-1 text-ink-soft">Email announcements to your list.</p>
        </div>
        <Link
          href="/admin/broadcasts/new"
          className="rounded-md bg-fuchsia px-5 py-2.5 font-display font-bold text-white hover:opacity-90"
        >
          + New broadcast
        </Link>
      </div>

      {broadcasts.length === 0 ? (
        <div className="rounded-xl bg-white p-10 text-center shadow-[var(--shadow-card)]">
          <p className="text-ink-soft">No broadcasts yet. Compose your first announcement.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {broadcasts.map((b) => (
            <li key={b.id}>
              <Link
                href={`/admin/broadcasts/${b.id}`}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white p-4 shadow-[var(--shadow-card)] transition-transform hover:-translate-y-0.5"
              >
                <div>
                  <p className="font-display text-lg font-bold">{b.subject}</p>
                  <p className="text-sm text-ink-soft">
                    {SEGMENT_LABEL[b.segment] ?? b.segment} · {b.recipientCount} recipients
                    {b.sentAt && ` · ${new Date(b.sentAt).toLocaleDateString()}`}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                    b.status === "sent" ? "bg-fern-soft text-fern-deep" : "bg-cream text-ink-soft"
                  }`}
                >
                  {b.status}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
