import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin-auth";
import { listAdminEvents } from "@/lib/audit";

export const metadata: Metadata = { title: "Activity", robots: { index: false } };
export const dynamic = "force-dynamic";

const ACTION_STYLE: Record<string, string> = {
  "decision.send": "bg-fern-soft text-fern-deeper",
  "broadcast.send": "bg-sky-soft text-sky-deep",
  "broadcast.schedule": "bg-sky-soft text-sky-deep",
  "sms.send": "bg-fuchsia-soft text-fuchsia-deep",
  "status.change": "bg-cream text-ink-soft",
  "artist.publish": "bg-fern-soft text-fern-deeper",
  "artist.approve": "bg-fern-soft text-fern-deeper",
  "artist.unpublish": "bg-tangerine-soft text-tangerine-deep",
  "application.delete": "bg-poppy/10 text-poppy-deep",
  "artist.invite": "bg-cream text-ink-soft",
};

export default async function ActivityPage() {
  await requireAdmin();
  const events = await listAdminEvents(300);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold">Activity</h1>
        <p className="mt-1 text-ink-soft">
          An append-only log of outward and irreversible actions — decisions, sends, publishes,
          and deletions — with who did each and when.
        </p>
      </div>

      {events.length === 0 ? (
        <div className="rounded-xl bg-white p-10 text-center shadow-[var(--shadow-card)]">
          <p className="text-ink-soft">No activity recorded yet.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl bg-white shadow-[var(--shadow-card)]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-ink/10 text-xs uppercase tracking-wide text-ink-soft">
                  <th className="px-5 py-4 font-semibold">When</th>
                  <th className="px-5 py-4 font-semibold">Who</th>
                  <th className="px-5 py-4 font-semibold">Action</th>
                  <th className="px-5 py-4 font-semibold">Details</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e) => (
                  <tr key={e.id} className="border-b border-ink/5 align-top last:border-0">
                    <td className="whitespace-nowrap px-5 py-3 text-ink-soft">
                      {new Date(e.createdAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3">{e.actorEmail}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-bold ${ACTION_STYLE[e.action] ?? "bg-cream text-ink-soft"}`}>
                        {e.action}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-ink-soft">{e.summary}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
