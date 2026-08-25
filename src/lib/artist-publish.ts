import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { applications, artists, artistPhotos } from "@/db/schema";
import { cleanUrl, sanitizeSocials } from "@/lib/clean";
import { logAdminEvent } from "@/lib/audit";
import { sendArtistPageLive } from "@/lib/emails";

/**
 * Copy an artist's pending submission live and publish it. NOT a server action
 * and does no auth — callers gate access (an admin approving via the review
 * queue, or a staff member auto-approving their own page). Keeping it out of a
 * "use server" module ensures it can never be reached as an unauthenticated
 * endpoint.
 */
export async function promoteArtistSubmission(artistId: number) {
  const artist = await db.query.artists.findFirst({ where: eq(artists.id, artistId) });
  if (!artist || !artist.pendingContent) return { error: "Nothing to approve." };
  const pc = artist.pendingContent;
  const firstPublish = !artist.published;

  await db
    .update(artists)
    .set({
      statement: pc.statement ?? artist.statement,
      bio: pc.bio ?? artist.bio,
      // Re-sanitize on promote — never trust stored pending content verbatim.
      website: cleanUrl(pc.website ?? artist.website),
      socials: sanitizeSocials((pc.socials ?? artist.socials) as Record<string, string>),
      logoUrl: pc.logoUrl ?? null,
      published: true,
      pendingContent: null,
      submittedAt: null,
      updatedAt: new Date(),
    })
    .where(eq(artists.id, artistId));

  if (pc.photoUrls) {
    // Atomic replace (see publishArtist) so an approved page never flashes empty.
    if (pc.photoUrls.length) {
      await db.batch([
        db.delete(artistPhotos).where(eq(artistPhotos.artistId, artistId)),
        db.insert(artistPhotos).values(
          pc.photoUrls.slice(0, 6).map((url, i) => ({ artistId, url, position: i })),
        ),
      ]);
    } else {
      await db.delete(artistPhotos).where(eq(artistPhotos.artistId, artistId));
    }
  }
  revalidatePath("/admin/artists");
  revalidatePath("/artists");
  revalidatePath(`/artists/${artist.slug}`);

  // First time going live → celebrate + point them to share tools.
  if (firstPublish && artist.applicationId) {
    const app = await db.query.applications.findFirst({
      where: eq(applications.id, artist.applicationId),
      columns: { email: true, name: true },
    });
    if (app?.email) await sendArtistPageLive(app.email, artist.name ?? app.name, artist.slug);
  }
  await logAdminEvent({
    action: firstPublish ? "artist.publish" : "artist.approve",
    targetType: "artist",
    targetId: artistId,
    summary: `${firstPublish ? "Published" : "Approved update to"} artist page: ${artist.name ?? artist.slug}`,
  });
  return { ok: true };
}
