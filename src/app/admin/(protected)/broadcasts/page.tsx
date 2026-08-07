import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin-auth";
import { listBroadcasts } from "@/lib/broadcast-data";
import { getActiveCycle, getDecisionGroups } from "@/lib/admin-data";
import { getTextRecipients } from "@/lib/sms-actions";
import { TextArtists } from "@/components/admin/text-artists";

export const metadata: Metadata = { title: "Email", robots: { index: false } };
export const dynamic = "force-dynamic";

const SEGMENT_LABEL: Record<string, string> = {
  all: "Everyone",
  artists: "Artists",
  non_artists: "Non-artists",
};

function DecisionCard({
  href,
  title,
  total,
  notified,
  accent,
}: {
  href: string;
  title: string;
  total: number;
  notified: number;
  accent: string;
}) {
  return (
    <Link
      href={href}
      className="block rounded-xl bg-white p-5 shadow-[var(--shadow-card)] transition-transform hover:-translate-y-0.5"
    >
      <div className="flex items-baseline justify-between">
        <h3 className="font-display text-lg font-extrabold">{title}</h3>
        <span className="font-display text-3xl font-extrabold tabular-nums" style={{ color: accent }}>
          {total}
        </span>
      </div>
      <p className="mt-3 text-sm font-semibold">
        {notified === 0 ? (
          <span className="text-tangerine">None notified yet →</span>
        ) : notified < total ? (
          <span className="text-tangerine">
            {total - notified} still to notify →
          </span>
        ) : (
          <span className="text-fern-deep">All {total} notified ✓</span>
        )}
      </p>
    </Link>
  );
}

export default async function EmailHubPage() {
  await requireAdmin();
  const [broadcasts, cycle, texts] = await Promise.all([
    listBroadcasts(),
    getActiveCycle(),
    getTextRecipients(),
  ]);

  const groups = cycle ? await getDecisionGroups(cycle.id) : null;
  const totalToNotify = groups
    ? groups.accepted.total - groups.accepted.notified + (groups.waitlist.total - groups.waitlist.notified)
    : 0;
  const hasDecisions = !!groups && groups.accepted.total + groups.waitlist.total > 0;
  const yq = cycle ? `?year=${cycle.year}` : "";

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-extrabold">Email &amp; messaging</h1>
        <p className="mt-1 text-ink-soft">Decisions, announcements, and event-day texts.</p>
      </div>

      {/* Decisions — prominent when there are people left to notify, muted once done */}
      {hasDecisions && totalToNotify > 0 && groups && (
        <section className="rounded-xl border-2 border-tangerine/40 bg-tangerine/5 p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-xl font-extrabold">Send decisions</h2>
            <span className="rounded-full bg-tangerine px-3 py-1 text-sm font-bold text-white">
              {totalToNotify} to notify
            </span>
          </div>
          <p className="mt-1 text-sm text-ink-soft">
            {cycle?.name} — applicants are waiting to hear back. You&apos;ll review the full list and
            votes before anything sends.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <DecisionCard href={`/admin/decisions/accepted${yq}`} title="Accepted" total={groups.accepted.total} notified={groups.accepted.notified} accent="var(--color-fern-deep)" />
            <DecisionCard href={`/admin/decisions/waitlist${yq}`} title="Waitlist" total={groups.waitlist.total} notified={groups.waitlist.notified} accent="var(--color-tangerine)" />
          </div>
        </section>
      )}
      {hasDecisions && totalToNotify === 0 && groups && (
        <section className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-fern-soft px-5 py-3 text-sm">
          <span className="font-semibold text-fern-deep">
            ✓ All decisions sent — {groups.accepted.total} accepted, {groups.waitlist.total} waitlisted notified.
          </span>
          <Link href={`/admin/decisions/accepted${yq}`} className="font-semibold text-fern-deep underline underline-offset-4">
            Review
          </Link>
        </section>
      )}

      {/* Broadcasts */}
      <section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-extrabold">Broadcasts</h2>
            <p className="text-sm text-ink-soft">Email announcements to your list.</p>
          </div>
          <Link
            href="/admin/broadcasts/new"
            className="rounded-lg bg-fuchsia px-5 py-2.5 font-display font-bold text-white hover:opacity-90"
          >
            + New broadcast
          </Link>
        </div>

        {broadcasts.length === 0 ? (
          <div className="mt-4 rounded-xl bg-white p-10 text-center shadow-[var(--shadow-card)]">
            <p className="text-ink-soft">No broadcasts yet. Compose your first announcement.</p>
          </div>
        ) : (
          <ul className="mt-4 space-y-3">
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
      </section>

      {/* Text artists (SMS) */}
      <section>
        <TextArtists
          recipientCount={texts.recipients.length}
          noPhoneCount={texts.noPhone.length}
          configured={texts.configured}
        />
      </section>
    </div>
  );
}
