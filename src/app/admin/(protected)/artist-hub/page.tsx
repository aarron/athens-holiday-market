import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/admin-auth";
import { EventDayEssentials } from "@/components/artist/event-day-essentials";
import { BackIcon } from "@/components/icons";

export const metadata: Metadata = { title: "Artist hub preview", robots: { index: false } };

/**
 * What accepted artists see in their hub's event-day section, for staff to
 * review. The hub itself only opens for an accepted artist's own login.
 */
export default async function ArtistHubPreview() {
  await requireStaff();
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/admin/artists" className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-soft hover:text-fern-deep">
          <BackIcon size={16} aria-hidden />
          Artist pages
        </Link>
        <h1 className="mt-2 text-3xl font-extrabold">Artist hub preview</h1>
        <p className="mt-1 text-ink-soft">
          The event-day section every accepted artist sees in their hub. The setup list also goes out in
          the Nov 15 and week-of setup emails, so a change here changes those too. To change anything, tell Aarron.
        </p>
      </div>
      <EventDayEssentials />
    </div>
  );
}
