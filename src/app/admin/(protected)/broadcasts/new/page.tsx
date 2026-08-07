import type { Metadata } from "next";
import Link from "next/link";
import { BackIcon } from "@/components/icons";
import { requireAdmin } from "@/lib/admin-auth";
import { segmentCounts } from "@/lib/broadcast-data";
import { Composer } from "@/components/admin/composer";

export const metadata: Metadata = { title: "New email", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function NewBroadcastPage() {
  await requireAdmin();
  const counts = await segmentCounts();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/broadcasts" className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-soft hover:text-fern-deep">
          <BackIcon size={16} aria-hidden />
          Email
        </Link>
        <h1 className="mt-2 text-3xl font-extrabold">New email</h1>
        <p className="mt-1 text-ink-soft">
          Compose your message, send yourself a test, then send it to the list.
        </p>
      </div>
      <Composer counts={counts} />
    </div>
  );
}
