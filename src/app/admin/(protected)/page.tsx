import type { Metadata } from "next";
import { getJudgingCycle, listApplications, tally } from "@/lib/admin-data";
import { ApplicationsTable, type Row } from "@/components/admin/applications-table";

export const metadata: Metadata = { title: "Dashboard", robots: { index: false } };
export const dynamic = "force-dynamic";

function StatTile({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="rounded-xl bg-white p-5 shadow-[var(--shadow-card)]">
      <div className="font-display text-4xl font-extrabold tabular-nums" style={{ color: accent }}>
        {value}
      </div>
      <div className="mt-1 text-sm font-medium text-ink-soft">{label}</div>
    </div>
  );
}

export default async function AdminDashboard() {
  const cycle = await getJudgingCycle();

  if (!cycle || cycle.count === 0) {
    return (
      <div className="rounded-xl bg-white p-10 text-center shadow-[var(--shadow-card)]">
        <h1 className="text-2xl font-extrabold">No applications yet</h1>
        <p className="mt-2 text-ink-soft">
          Once artists start applying, submissions will appear here for the jury to review.
        </p>
      </div>
    );
  }

  const apps = await listApplications(cycle.id);

  const stats = {
    total: apps.length,
    accepted: apps.filter((a) => a.status === "accepted").length,
    waitlisted: apps.filter((a) => a.status === "waitlisted").length,
    rejected: apps.filter((a) => a.status === "rejected").length,
    pending: apps.filter((a) => a.status === "submitted" || a.status === "under_review").length,
    paid: apps.filter((a) => a.boothFeePaid).length,
  };

  const rows: Row[] = apps.map((a) => ({
    id: a.id,
    name: a.name,
    medium: a.medium,
    submittedAt: a.createdAt.toISOString(),
    tally: tally(a.votes),
    status: a.status,
    boothFeePaid: a.boothFeePaid,
    photo: a.photos[0]?.url ?? null,
  }));

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold">Applications</h1>
          <p className="mt-1 text-ink-soft">{cycle.name}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <StatTile label="Submissions" value={stats.total} accent="var(--color-ink)" />
        <StatTile label="To review" value={stats.pending} accent="var(--color-sky)" />
        <StatTile label="Accepted" value={stats.accepted} accent="var(--color-fern-deep)" />
        <StatTile label="Waitlisted" value={stats.waitlisted} accent="var(--color-tangerine)" />
        <StatTile label="Rejected" value={stats.rejected} accent="var(--color-poppy)" />
        <StatTile label="Fees paid" value={stats.paid} accent="var(--color-berry)" />
      </div>

      <ApplicationsTable rows={rows} />
    </div>
  );
}
