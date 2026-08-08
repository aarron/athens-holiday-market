import type { Metadata } from "next";
import Link from "next/link";
import { BackIcon } from "@/components/icons";
import { requireAdmin } from "@/lib/admin-auth";
import { segmentCounts, getBroadcast, type Segment } from "@/lib/broadcast-data";
import { Composer } from "@/components/admin/composer";

export const metadata: Metadata = { title: "New email", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function NewBroadcastPage({
  searchParams,
}: {
  searchParams: Promise<{ draft?: string }>;
}) {
  await requireAdmin();
  const { draft: draftParam } = await searchParams;
  const counts = await segmentCounts();

  // Continue editing a saved draft when ?draft=<id> is present.
  let draft: { id: number; subject: string; body: string; segment: Segment } | undefined;
  if (draftParam) {
    const row = await getBroadcast(Number(draftParam));
    if (row && row.status === "draft") {
      draft = { id: row.id, subject: row.subject, body: row.body, segment: row.segment as Segment };
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/broadcasts" className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-soft hover:text-fern-deep">
          <BackIcon size={16} aria-hidden />
          Email
        </Link>
        <h1 className="mt-2 text-3xl font-extrabold">{draft ? "Edit draft" : "New email"}</h1>
        <p className="mt-1 text-ink-soft">
          Compose your message, send yourself a test, then send it to the list.
        </p>
      </div>
      <Composer counts={counts} draft={draft} />
    </div>
  );
}
