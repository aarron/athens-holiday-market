import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin-auth";
import { getActiveCycle } from "@/lib/admin-data";
import {
  getProspectSummary,
  listProspects,
  listResearchBatches,
  type ProspectStatus,
} from "@/lib/prospect-data";
import { ResearchPanel } from "@/components/admin/research-panel";
import { ProspectGrid } from "@/components/admin/prospect-grid";

export const metadata: Metadata = { title: "Scouting", robots: { index: false } };
export const dynamic = "force-dynamic";

function Stat({ label, value, tone = "" }: { label: string; value: number; tone?: string }) {
  return (
    <div className="rounded-xl bg-white px-4 py-3 shadow-[var(--shadow-card)]">
      <div className={`font-display text-2xl font-extrabold ${tone}`}>{value}</div>
      <div className="text-xs font-semibold uppercase tracking-wide text-ink-soft">{label}</div>
    </div>
  );
}

export default async function ProspectsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireAdmin();
  const { status } = await searchParams;
  const cycle = await getActiveCycle();

  if (!cycle) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-extrabold">Scouting</h1>
        <div className="rounded-xl bg-white p-10 text-center shadow-[var(--shadow-card)]">
          <p className="text-ink-soft">Set an active cycle to start scouting artists.</p>
        </div>
      </div>
    );
  }

  const filterStatus = (["new", "shortlisted", "maybe", "passed"] as ProspectStatus[]).find(
    (s) => s === status,
  );
  const [summary, cards, batches] = await Promise.all([
    getProspectSummary(cycle.id),
    listProspects(cycle.id, filterStatus ? { status: filterStatus } : {}),
    listResearchBatches(cycle.id),
  ]);

  const filters: { key: ProspectStatus | "all"; label: string; n: number }[] = [
    { key: "all", label: "All", n: summary.total },
    { key: "new", label: "New", n: summary.new },
    { key: "shortlisted", label: "Shortlisted", n: summary.shortlisted },
    { key: "maybe", label: "Maybe", n: summary.maybe },
    { key: "passed", label: "Passed", n: summary.passed },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold">Scouting</h1>
          <p className="mt-1 text-ink-soft">
            Artists we could invite to apply for {cycle.year}. Research is internal — these are
            prospects, not applicants.
          </p>
        </div>
        {summary.new > 0 && (
          <Link
            href="/admin/prospects/review"
            className="rounded-lg bg-ink px-4 py-2.5 text-sm font-display font-bold text-paper hover:bg-ink-soft"
          >
            Review {summary.new} new →
          </Link>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Total" value={summary.total} />
        <Stat label="New" value={summary.new} />
        <Stat label="Shortlisted" value={summary.shortlisted} tone="text-fern-deep" />
        <Stat label="Maybe" value={summary.maybe} tone="text-tangerine-deep" />
        <Stat label="Passed" value={summary.passed} tone="text-ink-soft" />
        <Stat label="Invited" value={summary.invited} tone="text-fuchsia-deep" />
      </div>

      <ResearchPanel batches={batches} />

      <div className="flex flex-wrap gap-1.5">
        {filters.map((f) => {
          const active = (f.key === "all" && !filterStatus) || f.key === filterStatus;
          const href = f.key === "all" ? "/admin/prospects" : `/admin/prospects?status=${f.key}`;
          return (
            <Link
              key={f.key}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${
                active ? "bg-ink text-paper" : "bg-cream text-ink-soft hover:bg-cream/70"
              }`}
            >
              {f.label} <span className="opacity-70">{f.n}</span>
            </Link>
          );
        })}
      </div>

      {cards.length === 0 ? (
        <div className="rounded-xl bg-white p-10 text-center shadow-[var(--shadow-card)]">
          <p className="text-ink-soft">No prospects in this view.</p>
        </div>
      ) : (
        <ProspectGrid cards={cards} />
      )}
    </div>
  );
}
