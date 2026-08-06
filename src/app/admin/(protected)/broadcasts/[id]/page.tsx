import type { Metadata } from "next";
import Link from "next/link";
import { BackIcon } from "@/components/icons";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin-auth";
import { getBroadcast, broadcastReceipts } from "@/lib/broadcast-data";
import { renderMarkdown } from "@/lib/email-template";

export const metadata: Metadata = { title: "Broadcast", robots: { index: false } };
export const dynamic = "force-dynamic";

const SEGMENT_LABEL: Record<string, string> = {
  all: "Everyone",
  artists: "Artists",
  non_artists: "Non-artists",
};

const RECEIPTS: { key: string; label: string; accent: string }[] = [
  { key: "sent", label: "Sent", accent: "var(--color-ink)" },
  { key: "delivered", label: "Delivered", accent: "var(--color-sky)" },
  { key: "opened", label: "Opened", accent: "var(--color-fern-deep)" },
  { key: "clicked", label: "Clicked", accent: "var(--color-teal)" },
  { key: "bounced", label: "Bounced", accent: "var(--color-tangerine)" },
  { key: "complained", label: "Complaints", accent: "var(--color-poppy)" },
];

export default async function BroadcastDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const broadcast = await getBroadcast(Number(id));
  if (!broadcast) notFound();

  const receipts = await broadcastReceipts(broadcast.id);
  // "Sent" tile = total recipients (all delivered/opened are also sent).
  const totalSent = Object.values(receipts).reduce((a, b) => a + b, 0) || broadcast.recipientCount;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/admin/broadcasts" className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-soft hover:text-fern-deep">
          <BackIcon size={16} aria-hidden />
          Broadcasts
        </Link>
        <h1 className="mt-2 text-3xl font-extrabold">{broadcast.subject}</h1>
        <p className="mt-1 text-ink-soft">
          {SEGMENT_LABEL[broadcast.segment] ?? broadcast.segment} · {broadcast.recipientCount}{" "}
          recipients
          {broadcast.sentAt && ` · sent ${new Date(broadcast.sentAt).toLocaleString()}`}
        </p>
      </div>

      {/* Receipts */}
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        {RECEIPTS.map((r) => (
          <div key={r.key} className="rounded-xl bg-white p-4 text-center shadow-[var(--shadow-card)]">
            <div className="font-display text-2xl font-extrabold tabular-nums" style={{ color: r.accent }}>
              {r.key === "sent" ? totalSent : receipts[r.key] ?? 0}
            </div>
            <div className="mt-0.5 text-xs font-medium text-ink-soft">{r.label}</div>
          </div>
        ))}
      </div>
      <p className="-mt-2 text-xs text-ink-soft">
        Delivered/opened update as recipients&apos; mail clients report back (requires the Resend
        webhook).
      </p>

      {/* Content */}
      <div className="rounded-xl bg-white p-6 shadow-[var(--shadow-card)]">
        <h2 className="font-display text-sm font-bold uppercase tracking-wide text-ink-soft">Message</h2>
        <div
          className="prose-broadcast mt-3 leading-relaxed [&_a]:text-teal [&_a]:underline [&_ul]:ml-5 [&_ul]:list-disc"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(broadcast.body) }}
        />
      </div>
    </div>
  );
}
