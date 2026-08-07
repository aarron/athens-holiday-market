import type { getScheduledSends, SendStatus } from "@/lib/scheduled-sends";
import { CancelSendButton } from "@/components/admin/cancel-send-button";
import { ClockIcon } from "@/components/icons";

type Data = Awaited<ReturnType<typeof getScheduledSends>>;

const STATUS: Record<SendStatus, { cls: string; label: string }> = {
  sent: { cls: "bg-fern-soft text-fern-deep", label: "Sent" },
  scheduled: { cls: "bg-cream text-ink-soft", label: "Scheduled" },
  window: { cls: "bg-[#fdf0e0] text-tangerine-deep", label: "Send window open" },
  missed: { cls: "bg-[#fdeceb] text-poppy-deep", label: "Not sent" },
  "pending-decision": { cls: "bg-cream text-ink-soft", label: "After acceptance" },
  canceled: { cls: "bg-ink/10 text-ink-soft", label: "Canceled" },
};

function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function StatusPill({ status, sentAt }: { status: SendStatus; sentAt: string | null }) {
  const s = STATUS[status];
  const label = status === "sent" && sentAt ? `Sent ${shortDate(sentAt)}` : s.label;
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-bold ${s.cls}`}>
      {status === "scheduled" && <ClockIcon size={12} aria-hidden />}
      {label}
    </span>
  );
}

function ChannelPill({ channel }: { channel: string }) {
  return (
    <span className="inline-block whitespace-nowrap rounded-full border-2 border-ink/12 px-2 py-0.5 text-xs font-semibold text-ink-soft">
      {channel}
    </span>
  );
}

export function ScheduledSends({ data }: { data: Data }) {
  const { announcements, artistReminders, artistReminderSubject, cronSchedule } = data;

  return (
    <section>
      <div className="mb-4">
        <h2 className="font-display text-xl font-extrabold">Scheduled &amp; automated sends</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Everything that can go out on its own, so nothing sends without your awareness. {cronSchedule}
          {" "}— most days nothing is due. Everything else on this page only sends when you press a button.
        </p>
      </div>

      {/* Announcements — date-driven */}
      <div className="overflow-hidden rounded-xl bg-white shadow-[var(--shadow-card)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-ink/10 text-xs uppercase tracking-wide text-ink-soft">
                <th className="px-5 py-4 font-semibold">When</th>
                <th className="px-5 py-4 font-semibold">Channel</th>
                <th className="px-5 py-4 font-semibold">To whom</th>
                <th className="px-5 py-4 font-semibold">Subject / topic</th>
                <th className="px-5 py-4 font-semibold">Status</th>
                <th className="px-5 py-4 font-semibold sr-only">Actions</th>
              </tr>
            </thead>
            <tbody>
              {announcements.map((a) => (
                <tr key={a.id} className="border-b border-ink/5 last:border-0 align-top">
                  <td className="whitespace-nowrap px-5 py-4 font-semibold">{a.when}</td>
                  <td className="px-5 py-4"><ChannelPill channel={a.channel} /></td>
                  <td className="px-5 py-4 text-ink-soft">{a.audience}</td>
                  <td className="px-5 py-4">{a.topic}</td>
                  <td className="px-5 py-4"><StatusPill status={a.status} sentAt={a.sentAt} /></td>
                  <td className="px-5 py-4 text-right"><CancelSendButton id={a.id} status={a.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Artist-page reminders — per artist, rolling */}
      <div className="mt-6">
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="font-display text-sm font-bold uppercase tracking-wide text-ink-soft">
            Artist-page reminders
          </h3>
          <p className="text-xs text-ink-soft">
            Email · “{artistReminderSubject}” · one-time, 7 days after acceptance
          </p>
        </div>
        {artistReminders.length === 0 ? (
          <div className="rounded-xl bg-white p-6 text-center text-sm text-ink-soft shadow-[var(--shadow-card)]">
            No artist-page reminders queued. They appear here once artists are accepted.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl bg-white shadow-[var(--shadow-card)]">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead>
                  <tr className="border-b border-ink/10 text-xs uppercase tracking-wide text-ink-soft">
                    <th className="px-5 py-4 font-semibold">Artist</th>
                    <th className="px-5 py-4 font-semibold">Scheduled</th>
                    <th className="px-5 py-4 font-semibold">Status</th>
                    <th className="px-5 py-4 font-semibold sr-only">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {artistReminders.map((r) => (
                    <tr key={r.email} className="border-b border-ink/5 last:border-0">
                      <td className="px-5 py-4">
                        <span className="font-display font-bold">{r.name}</span>
                        <span className="block text-xs text-ink-soft">{r.email}</span>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-ink-soft">{r.when}</td>
                      <td className="px-5 py-4"><StatusPill status={r.status} sentAt={r.sentAt} /></td>
                      <td className="px-5 py-4 text-right"><CancelSendButton id={r.id} status={r.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
