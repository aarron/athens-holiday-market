import type { Metadata } from "next";
import Link from "next/link";
import { BackIcon } from "@/components/icons";
import { requireAdmin } from "@/lib/admin-auth";
import { getTextAudience } from "@/lib/sms-actions";
import { TextArtists } from "@/components/admin/text-artists";

export const metadata: Metadata = { title: "New text", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function NewTextPage() {
  await requireAdmin();
  const audience = await getTextAudience();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/broadcasts#text"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-soft hover:text-fern-deep"
        >
          <BackIcon size={16} aria-hidden />
          Text
        </Link>
        <h1 className="mt-2 text-3xl font-extrabold">New text</h1>
        <p className="mt-1 text-ink-soft">
          Event-day heads-ups (load-in time, weather, reminders) sent straight to phones via SMS.
        </p>
      </div>
      <TextArtists audience={audience} redirectTo="/admin/broadcasts#text" />
    </div>
  );
}
