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
  searchParams: Promise<{ draft?: string; edit?: string }>;
}) {
  await requireAdmin();
  const { draft: draftParam, edit: editParam } = await searchParams;
  const counts = await segmentCounts();

  // Continue editing a saved draft (?draft=<id>) or a scheduled email
  // (?edit=<id>) — both open the composer pre-filled and update in place.
  let draft:
    | {
        id: number;
        name: string | null;
        subject: string;
        body: string;
        segment: Segment;
        status: string;
        scheduledForIso?: string;
      }
    | undefined;
  const loadId = editParam ?? draftParam;
  if (loadId) {
    const row = await getBroadcast(Number(loadId));
    if (row && (row.status === "draft" || row.status === "scheduled")) {
      draft = {
        id: row.id,
        name: row.name,
        subject: row.subject,
        body: row.body,
        segment: row.segment as Segment,
        status: row.status,
        scheduledForIso: row.scheduledFor ? new Date(row.scheduledFor).toISOString() : undefined,
      };
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/broadcasts" className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-soft hover:text-fern-deep">
          <BackIcon size={16} aria-hidden />
          Email
        </Link>
        <h1 className="mt-2 text-3xl font-extrabold">
          {draft ? (draft.status === "scheduled" ? "Edit scheduled email" : "Edit draft") : "New email"}
        </h1>
        <p className="mt-1 text-ink-soft">
          Compose your message, send yourself a test, then send it to the list.
        </p>
      </div>
      <Composer counts={counts} draft={draft} />
    </div>
  );
}
