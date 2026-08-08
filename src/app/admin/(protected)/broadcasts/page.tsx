import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin-auth";
import { listBroadcasts, broadcastReceiptSummaries } from "@/lib/broadcast-data";
import { getActiveCycle, getDecisionGroups } from "@/lib/admin-data";
import { getTextRecipients } from "@/lib/sms-actions";
import { getScheduledSends } from "@/lib/scheduled-sends";
import { TextArtists } from "@/components/admin/text-artists";
import { ScheduledSends } from "@/components/admin/scheduled-sends";
import { SectionTabs } from "@/components/admin/section-tabs";
import { CancelBroadcastButton } from "@/components/admin/cancel-broadcast-button";
import { DeleteDraftButton } from "@/components/admin/delete-draft-button";
import { ButtonLink } from "@/components/ui/button";
import { ClockIcon, CheckCircleIcon, DraftIcon, SendingIcon } from "@/components/icons";
import type { ComponentType } from "react";

export const metadata: Metadata = { title: "Email", robots: { index: false } };
export const dynamic = "force-dynamic";

const SEGMENT_LABEL: Record<string, string> = {
  all: "Everyone",
  artists: "Artists",
  non_artists: "Non-artists",
  accepted: "Accepted artists",
  waitlisted: "Waitlisted",
  applicants: "All applicants",
};

const STATUS_PILL: Record<string, { cls: string; label: string; Icon: ComponentType<{ size?: number; "aria-hidden"?: boolean }> }> = {
  draft: { cls: "bg-cream text-ink-soft", label: "Draft", Icon: DraftIcon },
  scheduled: { cls: "bg-sky-soft text-sky-deep", label: "Scheduled", Icon: ClockIcon },
  sending: { cls: "bg-cream text-ink-soft", label: "Sending", Icon: SendingIcon },
  sent: { cls: "bg-fern-soft text-fern-deep", label: "Sent", Icon: CheckCircleIcon },
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
          <span className="text-tangerine-deep">None notified yet →</span>
        ) : notified < total ? (
          <span className="text-tangerine-deep">
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
  const [broadcasts, cycle, texts, scheduled, receipts] = await Promise.all([
    listBroadcasts(),
    getActiveCycle(),
    getTextRecipients(),
    getScheduledSends(),
    broadcastReceiptSummaries(),
  ]);

  const groups = cycle ? await getDecisionGroups(cycle.id) : null;
  const totalToNotify = groups
    ? groups.accepted.total - groups.accepted.notified + (groups.waitlist.total - groups.waitlist.notified)
    : 0;
  const hasDecisions = !!groups && groups.accepted.total + groups.waitlist.total > 0;
  const yq = cycle ? `?year=${cycle.year}` : "";

  const decisionsPanel = hasDecisions && groups && (
    <>
      {totalToNotify > 0 ? (
        <section>
          <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="font-display text-xl font-extrabold">Send decisions</h2>
              <p className="mt-1 text-sm text-ink-soft">
                {cycle?.name} — applicants are waiting to hear back. You&apos;ll review the full list
                and votes before anything sends.
              </p>
            </div>
            <span className="rounded-full bg-tangerine px-3 py-1 text-sm font-bold text-white">
              {totalToNotify} to notify
            </span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <DecisionCard href={`/admin/decisions/accepted${yq}`} title="Accepted" total={groups.accepted.total} notified={groups.accepted.notified} accent="var(--color-fern-deep)" />
            <DecisionCard href={`/admin/decisions/waitlist${yq}`} title="Waitlist" total={groups.waitlist.total} notified={groups.waitlist.notified} accent="var(--color-tangerine)" />
          </div>
        </section>
      ) : (
        <section className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-fern-soft px-5 py-3 text-sm">
          <span className="font-semibold text-fern-deep">
            ✓ All decisions sent — {groups.accepted.total} accepted, {groups.waitlist.total} waitlisted notified.
          </span>
          <Link href={`/admin/decisions/accepted${yq}`} className="font-semibold text-fern-deep underline underline-offset-4">
            Review
          </Link>
        </section>
      )}
    </>
  );

  const emailPanel = (
    <section>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <h2 className="font-display text-xl font-extrabold">Email</h2>
        <ButtonLink href="/admin/broadcasts/new" variant="create" size="sm">
          + New email
        </ButtonLink>
      </div>

      {broadcasts.length === 0 ? (
        <div className="rounded-xl bg-white p-10 text-center shadow-[var(--shadow-card)]">
          <p className="text-ink-soft">No emails yet. Compose your first announcement.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl bg-white shadow-[var(--shadow-card)]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-ink/10 text-xs uppercase tracking-wide text-ink-soft">
                  <th className="px-5 py-4 font-semibold">Subject</th>
                  <th className="px-5 py-4 font-semibold">To whom</th>
                  <th className="px-5 py-4 font-semibold">When</th>
                  <th className="px-5 py-4 font-semibold">Status</th>
                  <th className="px-5 py-4 font-semibold sr-only">Actions</th>
                </tr>
              </thead>
              <tbody>
                {broadcasts.map((b) => {
                  const st = STATUS_PILL[b.status] ?? STATUS_PILL.draft;
                  const href = b.status === "draft" ? `/admin/broadcasts/new?draft=${b.id}` : `/admin/broadcasts/${b.id}`;
                  const when =
                    b.status === "scheduled" && b.scheduledFor
                      ? new Date(b.scheduledFor).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })
                      : b.sentAt
                        ? new Date(b.sentAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                        : "—";
                  const rate = receipts[b.id];
                  return (
                    <tr key={b.id} className="border-b border-ink/5 align-top last:border-0">
                      <td className="px-5 py-4">
                        <Link href={href} className="font-display font-bold hover:text-fern-deep">
                          {b.subject || "Untitled draft"}
                        </Link>
                        {b.status === "sent" && rate?.openRate != null && (
                          <span className="mt-0.5 block text-xs text-ink-soft">
                            <span className="font-semibold text-fern-deep">{rate.openRate}% opened</span>
                            {rate.clickRate != null && (
                              <>
                                {" · "}
                                <span className="font-semibold text-teal-deep">{rate.clickRate}% clicked</span>
                              </>
                            )}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-ink-soft">
                        {SEGMENT_LABEL[b.segment] ?? b.segment}
                        {b.status !== "draft" && (
                          <span className="block text-xs">{b.recipientCount} recipients</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-ink-soft">{when}</td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-bold ${st.cls}`}>
                          <st.Icon size={12} aria-hidden />
                          {st.label}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        {b.status === "scheduled" && <CancelBroadcastButton id={b.id} />}
                        {b.status === "draft" && <DeleteDraftButton id={b.id} />}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );

  const textPanel = (
    <section>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="font-display text-xl font-extrabold">Text artists</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Event-day heads-ups (load-in time, weather, reminders) sent straight to phones via SMS.
          </p>
        </div>
        {texts.configured && (
          <span className="text-sm text-ink-soft">
            {texts.recipients.length} accepted {texts.recipients.length === 1 ? "artist" : "artists"}{" "}
            opted in to texts
            {texts.noPhone.length > 0 && ` · ${texts.noPhone.length} without a number/opt-in`}
          </span>
        )}
      </div>
      <TextArtists
        recipientCount={texts.recipients.length}
        noPhoneCount={texts.noPhone.length}
        configured={texts.configured}
      />
    </section>
  );

  const tabs = [
    ...(hasDecisions
      ? [{ id: "decisions", label: "Decisions", badge: totalToNotify || undefined, content: decisionsPanel }]
      : []),
    { id: "email", label: "Email", content: emailPanel },
    { id: "text", label: "Text", content: textPanel },
    { id: "scheduled", label: "Automations", content: <ScheduledSends data={scheduled} /> },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold">Email &amp; messaging</h1>
        <p className="mt-1 text-ink-soft">Decisions, announcements, and event-day texts.</p>
      </div>

      <SectionTabs tabs={tabs} initial={hasDecisions && totalToNotify > 0 ? "decisions" : "email"} />
    </div>
  );
}
