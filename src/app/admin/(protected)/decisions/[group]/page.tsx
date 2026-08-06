import type { Metadata } from "next";
import Link from "next/link";
import { BackIcon } from "@/components/icons";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin-auth";
import { getCyclesWithCounts, getDecisionRecipients } from "@/lib/admin-data";
import { getBroadcastTemplates } from "@/lib/email-templates";
import { DecisionSender } from "@/components/admin/decision-sender";

export const metadata: Metadata = { title: "Send decisions", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function DecisionGroupPage({
  params,
  searchParams,
}: {
  params: Promise<{ group: string }>;
  searchParams: Promise<{ year?: string }>;
}) {
  await requireAdmin();
  const { group } = await params;
  const { year } = await searchParams;
  if (group !== "accepted" && group !== "waitlist") notFound();

  const list = await getCyclesWithCounts();
  const withApps = list.filter((c) => c.count > 0);
  const cycle =
    (year && list.find((c) => String(c.year) === year)) ||
    list.find((c) => c.isActive && c.count > 0) ||
    withApps[0] ||
    list[0];
  if (!cycle) notFound();

  const recipients = await getDecisionRecipients(cycle.id, group);
  const templateId = group === "accepted" ? "accepted" : "waitlist";
  const template = getBroadcastTemplates().find((t) => t.id === templateId)!;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/admin/decisions" className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-soft hover:text-fern-deep">
          <BackIcon size={16} aria-hidden />
          Send decisions
        </Link>
        <h1 className="mt-2 text-3xl font-extrabold">
          {group === "accepted" ? "Acceptance" : "Waitlist"} emails
        </h1>
        <p className="mt-1 text-ink-soft">{cycle.name}</p>
      </div>

      {recipients.length === 0 ? (
        <div className="rounded-xl bg-white p-8 text-center shadow-[var(--shadow-card)]">
          <p className="text-ink-soft">
            No applicants in this group yet. Set decisions on the applications first.
          </p>
        </div>
      ) : (
        <DecisionSender
          cycleId={cycle.id}
          group={group}
          recipients={recipients}
          subject={template.subject}
          body={template.body}
        />
      )}
    </div>
  );
}
