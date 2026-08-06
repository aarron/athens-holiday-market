import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin-auth";
import { segmentCounts } from "@/lib/broadcast-data";
import { Composer } from "@/components/admin/composer";

export const metadata: Metadata = { title: "New broadcast", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function NewBroadcastPage() {
  await requireAdmin();
  const counts = await segmentCounts();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/broadcasts" className="text-sm font-semibold text-ink-soft hover:text-fern-deep">
          ← Broadcasts
        </Link>
        <h1 className="mt-2 text-3xl font-extrabold">New broadcast</h1>
        <p className="mt-1 text-ink-soft">
          Compose your message, send yourself a test, then send it to the list.
        </p>
      </div>
      <Composer counts={counts} />
    </div>
  );
}
