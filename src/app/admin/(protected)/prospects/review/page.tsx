import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin-auth";
import { getActiveCycle } from "@/lib/admin-data";
import { listProspects } from "@/lib/prospect-data";
import { ProspectDeck } from "@/components/admin/prospect-deck";
import { BackIcon } from "@/components/icons";

export const metadata: Metadata = { title: "Review prospects", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function ReviewProspectsPage() {
  await requireAdmin();
  const cycle = await getActiveCycle();
  const queue = cycle ? await listProspects(cycle.id, { status: "new" }) : [];

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/prospects"
          className="inline-flex items-center gap-1 text-sm font-semibold text-ink-soft hover:text-ink"
        >
          <BackIcon size={15} aria-hidden /> All prospects
        </Link>
        <h1 className="mt-2 text-3xl font-extrabold">Review prospects</h1>
        <p className="mt-1 text-ink-soft">
          One card at a time. <kbd className="rounded bg-cream px-1 font-semibold">Y</kbd> invite,{" "}
          <kbd className="rounded bg-cream px-1 font-semibold">M</kbd> maybe,{" "}
          <kbd className="rounded bg-cream px-1 font-semibold">N</kbd> ignore — or swipe.
        </p>
      </div>
      <ProspectDeck queue={queue} />
    </div>
  );
}
