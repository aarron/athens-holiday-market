import type { Metadata } from "next";
import { getCyclesWithCounts, listApplications, tally } from "@/lib/admin-data";
import { ApplicationsTable, type Row } from "@/components/admin/applications-table";
import { MediumBlend, type BlendRow } from "@/components/admin/medium-blend";
import { CycleSelector } from "@/components/admin/cycle-selector";

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

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const { year } = await searchParams;
  const cyclesList = await getCyclesWithCounts();

  if (cyclesList.length === 0) {
    return (
      <div className="rounded-xl bg-white p-10 text-center shadow-[var(--shadow-card)]">
        <h1 className="text-2xl font-extrabold">No market cycles yet</h1>
      </div>
    );
  }

  // Resolve the cycle to show: requested year → active-with-apps → most-recent-with-apps.
  const withApps = cyclesList.filter((c) => c.count > 0);
  const activeWithApps = cyclesList.find((c) => c.isActive && c.count > 0);
  const current =
    (year && cyclesList.find((c) => String(c.year) === year)) ||
    activeWithApps ||
    withApps[0] ||
    cyclesList.find((c) => c.isActive) ||
    cyclesList[0];

  const isArchive = !current.isActive;
  const apps = current.count > 0 ? await listApplications(current.id) : [];

  const stats = {
    total: apps.length,
    accepted: apps.filter((a) => a.status === "accepted").length,
    waitlisted: apps.filter((a) => a.status === "waitlisted").length,
    rejected: apps.filter((a) => a.status === "rejected").length,
    pending: apps.filter((a) => a.status === "submitted" || a.status === "under_review").length,
    paid: apps.filter((a) => a.boothFeePaid).length,
  };

  const blendMap = new Map<string, { total: number; accepted: number }>();
  for (const a of apps) {
    const cat = a.mediumCategory ?? "Uncategorized";
    const e = blendMap.get(cat) ?? { total: 0, accepted: 0 };
    e.total += 1;
    if (a.status === "accepted") e.accepted += 1;
    blendMap.set(cat, e);
  }
  const blend: BlendRow[] = [...blendMap.entries()]
    .map(([category, v]) => ({ category, ...v }))
    .sort((a, b) => b.accepted - a.accepted || b.total - a.total);

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
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold">Applications</h1>
            {isArchive && (
              <span className="rounded-full bg-cream px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-ink-soft">
                Archive
              </span>
            )}
          </div>
          <p className="mt-1 text-ink-soft">{current.name}</p>
        </div>
        <CycleSelector
          cycles={cyclesList.map((c) => ({ year: c.year, isActive: c.isActive, count: c.count }))}
          current={current.year}
        />
      </div>

      {apps.length === 0 ? (
        <div className="rounded-xl bg-white p-10 text-center shadow-[var(--shadow-card)]">
          <h2 className="text-xl font-extrabold">No applications in {current.year} yet</h2>
          <p className="mt-2 text-ink-soft">
            {current.isActive
              ? "Once artists start applying, submissions will appear here for the jury."
              : "This year has no recorded applications."}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <StatTile label="Submissions" value={stats.total} accent="var(--color-ink)" />
            <StatTile label="To review" value={stats.pending} accent="var(--color-sky)" />
            <StatTile label="Accepted" value={stats.accepted} accent="var(--color-fern-deep)" />
            <StatTile label="Waitlisted" value={stats.waitlisted} accent="var(--color-tangerine)" />
            <StatTile label="Rejected" value={stats.rejected} accent="var(--color-poppy)" />
            <StatTile label="Fees paid" value={stats.paid} accent="var(--color-berry)" />
          </div>

          <MediumBlend blend={blend} />
          <ApplicationsTable rows={rows} />
        </>
      )}
    </div>
  );
}
