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
import { inviteCounts, listInvitableProspects, inviteEmailHtml } from "@/lib/prospect-invite";
import { ResearchPanel } from "@/components/admin/research-panel";
import { ProspectGrid } from "@/components/admin/prospect-grid";
import { InvitePanel } from "@/components/admin/invite-panel";

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

  // Default view is the "To review" inbox — the pile of untriaged prospects that
  // shrinks as you work. Explicit ?status=all shows everything.
  const view: ProspectStatus | "all" =
    status === "all"
      ? "all"
      : (["new", "shortlisted", "maybe", "passed"] as ProspectStatus[]).find((s) => s === status) ??
        "new";
  const [summary, cards, batches, invCounts, inviteRecipients] = await Promise.all([
    getProspectSummary(cycle.id),
    listProspects(cycle.id, view === "all" ? {} : { status: view }),
    listResearchBatches(cycle.id),
    inviteCounts(cycle.id),
    listInvitableProspects(cycle.id),
  ]);
  const invitePreview = inviteEmailHtml({ name: "there", token: "preview" });

  const filters: { key: ProspectStatus | "all"; label: string; n: number }[] = [
    { key: "new", label: "To review", n: summary.new },
    { key: "shortlisted", label: "Invite", n: summary.shortlisted },
    { key: "maybe", label: "Maybe", n: summary.maybe },
    { key: "passed", label: "Ignore", n: summary.passed },
    { key: "all", label: "All", n: summary.total },
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
        <Stat label="To review" value={summary.new} />
        <Stat label="Invite" value={summary.shortlisted} tone="text-fern-deep" />
        <Stat label="Maybe" value={summary.maybe} tone="text-tangerine-deep" />
        <Stat label="Ignore" value={summary.passed} tone="text-ink-soft" />
        <Stat label="Emailed" value={summary.invited} tone="text-fuchsia-deep" />
      </div>

      <ResearchPanel batches={batches} />

      <InvitePanel
        ready={invCounts.ready}
        emailed={invCounts.invited}
        shortlisted={summary.shortlisted}
        previewHtml={invitePreview}
        recipients={inviteRecipients}
      />

      <div className="flex flex-wrap gap-1.5">
        {filters.map((f) => {
          const active = f.key === view;
          return (
            <Link
              key={f.key}
              href={`/admin/prospects?status=${f.key}`}
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
          <p className="text-ink-soft">
            {view === "new"
              ? "🎉 Inbox zero — every prospect has been triaged."
              : "No prospects in this view."}
          </p>
        </div>
      ) : (
        <ProspectGrid cards={cards} viewStatus={view} />
      )}
    </div>
  );
}
