"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { artists, users } from "@/db/schema";
import { requireArtistAccess } from "@/lib/admin-auth";
import { isStaff } from "@/lib/roles";
import { promoteArtistSubmission } from "@/lib/artist-publish";
import { sendArtistReviewAlert } from "@/lib/emails";
import { cleanUrl, sanitizeSocials } from "@/lib/clean";

const schema = z.object({
  statement: z.string().max(4000).optional().default(""),
  bio: z.string().max(4000).optional().default(""),
  website: z.string().max(300).optional().default(""),
  socials: z.record(z.string(), z.string().max(300)).optional().default({}),
  logoUrl: z.string().url().nullable().optional(),
  photoUrls: z.array(z.string().url()).max(6).optional().default([]),
});

export type ArtistDraftInput = z.input<typeof schema>;

/** Save the artist's edits as a pending draft for admin review. */
export async function submitArtistDraft(input: ArtistDraftInput) {
  const { user, artist: base } = await requireArtistAccess();

  const parsed = schema.safeParse(input);
  if (!parsed.success) return { error: "Please double-check your entries." };

  const { statement, bio, website, socials, logoUrl, photoUrls } = parsed.data;
  // Sanitize outbound URLs on write: safe website, known-platform socials only.
  const cleanWebsite = cleanUrl(website) ?? "";
  const cleanSocials = sanitizeSocials(socials);

  await db
    .update(artists)
    .set({
      pendingContent: { statement, bio, website: cleanWebsite, socials: cleanSocials, logoUrl: logoUrl ?? null, photoUrls },
      submittedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(artists.id, base.id));

  // Staff (admins and judges) editing their own page are trusted to publish
  // without review — promote the edit live immediately, same as page creation.
  if (isStaff(user.role)) {
    await promoteArtistSubmission(base.id);
    revalidatePath("/artist");
    revalidatePath("/admin/artists");
    return { ok: true, published: true };
  }

  // Everyone else: alert admins so a pending review doesn't slip by.
  const admins = await db.select({ email: users.email }).from(users).where(eq(users.role, "admin"));
  await sendArtistReviewAlert(
    admins.map((a) => a.email),
    base.name ?? user.name ?? "An artist",
  );

  revalidatePath("/artist");
  revalidatePath("/admin/artists");
  return { ok: true };
}

/**
 * Count a share-image download from the portal (the image is drawn in the
 * browser, so this is the only signal). Never throws: tracking must not get
 * in the way of the download.
 */
export async function recordKitDownload(kind: string) {
  if (kind !== "square" && kind !== "story") return;
  try {
    const { artist } = await requireArtistAccess();
    const { addKitDownload } = await import("@/lib/social-kit-downloads");
    await addKitDownload(artist.id, kind);
  } catch (e) {
    // requireArtistAccess redirects (throws) for a signed-out visitor; ignore.
    if ((e as { digest?: string })?.digest?.startsWith("NEXT_REDIRECT")) return;
    console.error("[social-kit] couldn't record download:", e);
  }
}
