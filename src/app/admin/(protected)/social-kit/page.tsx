import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { requireStaff } from "@/lib/admin-auth";
import { db } from "@/db";
import { artists } from "@/db/schema";
import { site } from "@/lib/site";
import {
  SpotlightDownloader,
  type SpotlightArtist,
} from "@/components/admin/spotlight-downloader";
import { EmailPostingTeamButton } from "@/components/admin/email-posting-team-button";

export const metadata: Metadata = { title: "Social kit" };
export const dynamic = "force-dynamic";

export default async function SocialKitPage() {
  const user = await requireStaff();

  const rows = await db.query.artists.findMany({
    where: eq(artists.published, true),
    with: { photos: { orderBy: (p, { asc }) => [asc(p.position)], limit: 1 } },
    orderBy: (a, { asc }) => [asc(a.name)],
  });

  const list: SpotlightArtist[] = rows.map((a) => ({
    name: a.name,
    medium: a.medium ?? "",
    slug: a.slug,
    photoUrl: a.photos[0]?.url ?? null,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold sm:text-3xl">Social kit</h1>
        <p className="mt-1.5 max-w-2xl text-ink-soft">
          Ready-to-post spotlight images for every published artist — sized for Instagram and
          Facebook <strong>feed</strong> and <strong>stories</strong>. Aim to post one artist each
          week leading up to the market. Tag {site.social.instagram} so posts are easy to reshare.
        </p>
      </div>

      {user.role === "admin" && (
        <div className="rounded-xl bg-cream-soft p-4">
          <p className="mb-2 text-sm text-ink-soft">
            Kick off the campaign by prompting the posting team (Jim, Ansley, and Jamie) to start
            sharing.
          </p>
          <EmailPostingTeamButton />
        </div>
      )}

      <SpotlightDownloader artists={list} />
    </div>
  );
}
