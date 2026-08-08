import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin-auth";
import { listSubscribers, subscriberStats } from "@/lib/broadcast-data";
import { SubscribersTable, type SubRow } from "@/components/admin/subscribers-table";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = { title: "Subscribers", robots: { index: false } };
export const dynamic = "force-dynamic";

function Tile({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <Card>
      <div className="font-display text-4xl font-extrabold tabular-nums" style={{ color: accent }}>
        {value}
      </div>
      <div className="mt-1 text-sm font-medium text-ink-soft">{label}</div>
    </Card>
  );
}

export default async function SubscribersPage() {
  await requireAdmin();
  const [subs, stats] = await Promise.all([listSubscribers(), subscriberStats()]);

  const rows: SubRow[] = subs.map((s) => ({
    id: s.id,
    email: s.email,
    name: s.name,
    isArtist: s.isArtist,
    status: s.status,
    source: s.source,
    createdAt: s.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold">Subscribers</h1>
        <p className="mt-1 text-ink-soft">Manage the mailing list.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Tile label="Total" value={stats.total} accent="var(--color-ink)" />
        <Tile label="Active" value={stats.subscribed} accent="var(--color-fern-deep)" />
        <Tile label="Artists" value={stats.artists} accent="var(--color-fuchsia)" />
        <Tile label="Unsubscribed" value={stats.unsubscribed} accent="var(--color-poppy)" />
      </div>

      <SubscribersTable rows={rows} />
    </div>
  );
}
