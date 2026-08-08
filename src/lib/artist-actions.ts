"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { artists, users } from "@/db/schema";
import { requireArtistAccess } from "@/lib/admin-auth";
import { sendArtistReviewAlert } from "@/lib/emails";

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
  const cleanSocials = Object.fromEntries(
    Object.entries(socials).filter(([, v]) => v && v.trim()),
  );

  await db
    .update(artists)
    .set({
      pendingContent: { statement, bio, website, socials: cleanSocials, logoUrl: logoUrl ?? null, photoUrls },
      submittedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(artists.id, base.id));

  // Alert admins so a pending review doesn't slip by.
  const admins = await db.select({ email: users.email }).from(users).where(eq(users.role, "admin"));
  await sendArtistReviewAlert(
    admins.map((a) => a.email),
    base.name ?? user.name ?? "An artist",
  );

  revalidatePath("/artist");
  revalidatePath("/admin/artists");
  return { ok: true };
}
