import type { Metadata } from "next";
import Link from "next/link";
import { BackIcon } from "@/components/icons";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin-auth";
import { getBroadcast, broadcastReceipts } from "@/lib/broadcast-data";
import { renderMarkdown } from "@/lib/email-template";

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

export default async function BroadcastDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const broadcast = await getBroadcast(Number(id));
  if (!broadcast) notFound();

  const receipts = await broadcastReceipts(broadcast.id);
  const sent = receipts.total || broadcast.recipientCount;

  // Cumulative funnel — each stage rolls up into the earlier ones.
  const tiles: { label: string; value: number; sub?: string; accent: string }[] = [
    { label: "Sent", value: sent, accent: "var(--color-ink)" },
    {
      label: "Delivered",
      value: receipts.delivered,
      sub: sent > 0 ? `${Math.round((receipts.delivered / sent) * 100)}% of sent` : undefined,
      accent: "var(--color-sky-deep)",
    },
    {
      label: "Opened",
      value: receipts.opened,
      sub: receipts.openRate != null ? `${receipts.openRate}% open rate` : undefined,
      accent: "var(--color-fern-deep)",
    },
    {
      label: "Clicked",
      value: receipts.clicked,
      sub: receipts.clickRate != null ? `${receipts.clickRate}% click rate` : undefined,
      accent: "var(--color-teal-deep)",
    },
    { label: "Bounced", value: receipts.bounced, accent: "var(--color-tangerine-deep)" },
    { label: "Complaints", value: receipts.complained, accent: "var(--color-poppy-deep)" },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/admin/broadcasts" className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-soft hover:text-fern-deep">
          <BackIcon size={16} aria-hidden />
          Email
        </Link>
        <h1 className="mt-2 text-3xl font-extrabold">{broadcast.subject}</h1>
        <p className="mt-1 text-ink-soft">
          {SEGMENT_LABEL[broadcast.segment] ?? broadcast.segment} · {broadcast.recipientCount}{" "}
          recipients
          {broadcast.sentAt && ` · sent ${new Date(broadcast.sentAt).toLocaleString()}`}
        </p>
      </div>

      {/* Engagement funnel */}
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-xl bg-white p-4 text-center shadow-[var(--shadow-card)]">
            <div className="font-display text-2xl font-extrabold tabular-nums" style={{ color: t.accent }}>
              {t.value}
            </div>
            <div className="mt-0.5 text-xs font-medium text-ink-soft">{t.label}</div>
            {t.sub && <div className="mt-0.5 text-[0.65rem] leading-tight text-ink-soft/70">{t.sub}</div>}
          </div>
        ))}
      </div>
      <p className="-mt-2 text-xs text-ink-soft">
        Delivered, opens, and clicks roll up cumulatively and update as recipients&apos; mail clients
        report back (requires the Resend webhook). Open tracking misses clients that block remote
        images, so real opens run a little higher.
      </p>

      {/* Content */}
      <div className="rounded-xl bg-white p-6 shadow-[var(--shadow-card)]">
        <h2 className="font-display text-sm font-bold uppercase tracking-wide text-ink-soft">Message</h2>
        <div
          className="prose-broadcast mt-3 leading-relaxed [&_a]:text-teal-deep [&_a]:underline [&_ul]:ml-5 [&_ul]:list-disc"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(broadcast.body) }}
        />
      </div>
    </div>
  );
}
