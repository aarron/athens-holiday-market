import type { Metadata } from "next";
import { getCyclesWithCounts, listApplications, listStaff, tally } from "@/lib/admin-data";
import { countBooths, pairSharedBooths } from "@/lib/booths";
import { getJudgesExhibiting } from "@/lib/judges-exhibiting";
import { JudgesExhibitingInput } from "@/components/admin/judges-exhibiting-input";
import { StatFilterTile } from "@/components/admin/stat-filter-tile";
import { displayStatus } from "@/lib/applications";
import { getSessionUser } from "@/lib/admin-auth";
import { ApplicationsTable, type Row } from "@/components/admin/applications-table";
import { MediumBlend, type BlendRow } from "@/components/admin/medium-blend";
import { CycleSelector } from "@/components/admin/cycle-selector";
import { AdminSearch } from "@/components/admin/admin-search";

export const metadata: Metadata = { title: "Dashboard", robots: { index: false } };
export const dynamic = "force-dynamic";


export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const { year } = await searchParams;
  const cyclesList = await getCyclesWithCounts();

  const [me, staff] = await Promise.all([getSessionUser(), listStaff()]);
  const myUserId = staff.find((u) => u.email.toLowerCase() === me?.email.toLowerCase())?.id ?? null;
  const staffEmails = new Set(staff.map((u) => u.email.toLowerCase()));

  if (cyclesList.length === 0) {
    return (
      <div className="rounded-xl bg-white p-10 text-center shadow-[var(--shadow-card)]">
        <h1 className="text-2xl font-extrabold">No market cycles yet</h1>
      </div>
    );
  }

  // Resolve the cycle to show: requested year → current (active) year → most-recent-with-apps.
  const withApps = cyclesList.filter((c) => c.count > 0);
  const current =
    (year && cyclesList.find((c) => String(c.year) === year)) ||
    cyclesList.find((c) => c.isActive) ||
    withApps[0] ||
    cyclesList[0];

  const isArchive = !current.isActive;
  // Direct-adds (dropout replacements / exhibiting judges) never went through
  // the jury, so they stay out of the review table, stats, and medium blend.
  const allApps = (current.count > 0 ? await listApplications(current.id) : []).map((a) => ({
    ...a,
    status: displayStatus(a.status, current.year),
  }));
  const apps = allApps.filter((a) => !a.directAdd);

  // Booths, not heads: accepted artists sharing a booth count once. Pair across
  // everyone accepted (judges can share with a juried artist too), then add the
  // direct-adds — judges who exhibit and anyone added by hand — for the total.
  const allAccepted = allApps.filter((a) => a.status === "accepted");
  const partner = pairSharedBooths(allAccepted);
  const juried = countBooths(apps.filter((a) => a.status === "accepted"), partner);
  const directAccepted = allAccepted.filter((a) => a.directAdd);
  const judgesRecorded = directAccepted.filter((a) => staffEmails.has(a.email.toLowerCase())).length;
  const addedArtists = directAccepted.length - judgesRecorded;
  // Admins can enter how many judges are exhibiting before those judges build
  // their pages; use the larger of that and the judges actually recorded, and
  // count each not-yet-recorded judge as a booth.
  const judgesEntered = await getJudgesExhibiting(current.id);
  const judgesExhibiting = Math.max(judgesRecorded, judgesEntered ?? 0);

  const stats = {
    total: apps.length,
    waitlisted: apps.filter((a) => a.status === "waitlisted").length,
    rejected: apps.filter((a) => a.status === "rejected").length,
    pending: apps.filter((a) => a.status === "submitted" || a.status === "under_review").length,
    paid: apps.filter((a) => a.status === "accepted" && a.boothFeePaid).length,
    unpaid: apps.filter((a) => a.status === "accepted" && !a.boothFeePaid).length,
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
    category: a.mediumCategory ?? "Uncategorized",
    myVote: a.votes.find((v) => v.userId === myUserId)?.value ?? null,
    sharesBoothWith: partner.has(a.id)
      ? (allApps.find((o) => o.id === partner.get(a.id))?.name ?? null)
      : null,
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
            <h1 className="text-3xl font-extrabold">Dashboard</h1>
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

      <AdminSearch />

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
        <section className="rounded-xl bg-white shadow-[var(--shadow-card)]">
          <div className="p-5 sm:p-6">
            <h2 className="font-display text-lg font-extrabold">Applications</h2>
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
              <StatFilterTile label="Submissions" value={stats.total} accent="var(--color-ink)" filter={{}} />
              <StatFilterTile label="To review" value={stats.pending} accent="var(--color-sky)" filter={{ status: "pending" }} />
              <StatFilterTile label="Accepted booths" value={juried.booths} accent="var(--color-fern-deep)" filter={{ status: "accepted" }}>
                {juried.sharedPairs > 0 && (
                  <p>
                    {juried.artists} artists · {juried.sharedPairs} shared
                  </p>
                )}
                <p>
                  {me?.role === "admin" && !isArchive ? (
                    <JudgesExhibitingInput cycleId={current.id} value={judgesExhibiting} />
                  ) : (
                    <>
                      + {judgesExhibiting} {judgesExhibiting === 1 ? "judge" : "judges"} exhibiting
                    </>
                  )}
                </p>
                {addedArtists > 0 && (
                  <p>
                    + {addedArtists} added {addedArtists === 1 ? "artist" : "artists"}
                  </p>
                )}
              </StatFilterTile>
              <StatFilterTile label="Waitlisted" value={stats.waitlisted} accent="var(--color-tangerine)" filter={{ status: "waitlisted" }} />
              <StatFilterTile label="Rejected" value={stats.rejected} accent="var(--color-poppy-deep)" filter={{ status: "rejected" }} />
              <StatFilterTile label="Fees paid" value={stats.paid} accent="var(--color-berry)" filter={{ payment: "paid" }} />
              <StatFilterTile label="Fees unpaid" value={stats.unpaid} accent="var(--color-ink-soft)" filter={{ payment: "unpaid" }} />
            </div>
          </div>

          <MediumBlend blend={blend} bare />
          <ApplicationsTable rows={rows} canDecide={me?.role === "admin"} bare />
        </section>
      )}
    </div>
  );
}
