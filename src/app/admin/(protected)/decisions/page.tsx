import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin-auth";
import { getCyclesWithCounts, getDecisionGroups } from "@/lib/admin-data";

export const metadata: Metadata = { title: "Send decisions", robots: { index: false } };
export const dynamic = "force-dynamic";

function resolveCycle(list: Awaited<ReturnType<typeof getCyclesWithCounts>>, year?: string) {
  const withApps = list.filter((c) => c.count > 0);
  return (
    (year && list.find((c) => String(c.year) === year)) ||
    list.find((c) => c.isActive && c.count > 0) ||
    withApps[0] ||
    list.find((c) => c.isActive) ||
    list[0]
  );
}

function GroupCard({
  href,
  title,
  desc,
  total,
  notified,
  accent,
}: {
  href: string;
  title: string;
  desc: string;
  total: number;
  notified: number;
  accent: string;
}) {
  return (
    <Link
      href={href}
      className="block rounded-xl bg-white p-6 shadow-[var(--shadow-card)] transition-transform hover:-translate-y-0.5"
    >
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-xl font-extrabold">{title}</h2>
        <span className="font-display text-3xl font-extrabold tabular-nums" style={{ color: accent }}>
          {total}
        </span>
      </div>
      <p className="mt-1 text-sm text-ink-soft">{desc}</p>
      <p className="mt-4 text-sm font-semibold">
        {notified === 0 ? (
          <span className="text-tangerine">None notified yet →</span>
        ) : notified < total ? (
          <span className="text-tangerine">
            {notified}/{total} notified — {total - notified} to send →
          </span>
        ) : (
          <span className="text-fern-deep">All {total} notified ✓ — review →</span>
        )}
      </p>
    </Link>
  );
}

export default async function DecisionsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  await requireAdmin();
  const { year } = await searchParams;
  const list = await getCyclesWithCounts();
  const cycle = resolveCycle(list, year);
  if (!cycle) return <p className="text-ink-soft">No cycles.</p>;

  const groups = await getDecisionGroups(cycle.id);
  const yq = `?year=${cycle.year}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold">Send decisions</h1>
        <p className="mt-1 text-ink-soft">
          {cycle.name} · Notify applicants of their result. You&apos;ll review the full list and votes
          before anything sends.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <GroupCard
          href={`/admin/decisions/accepted${yq}`}
          title="Accepted"
          desc="Artists accepted into the market."
          total={groups.accepted.total}
          notified={groups.accepted.notified}
          accent="var(--color-fern-deep)"
        />
        <GroupCard
          href={`/admin/decisions/waitlist${yq}`}
          title="Waitlist"
          desc="Everyone not accepted goes on the waitlist."
          total={groups.waitlist.total}
          notified={groups.waitlist.notified}
          accent="var(--color-tangerine)"
        />
      </div>

      <p className="text-sm text-ink-soft">
        General announcements (applications open, market news) go out from{" "}
        <Link href="/admin/broadcasts" className="font-semibold text-fern-deep underline underline-offset-4">
          Email
        </Link>{" "}
        instead.
      </p>
    </div>
  );
}
