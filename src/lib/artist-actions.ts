"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { artists } from "@/db/schema";
import { requireArtist } from "@/lib/admin-auth";

const schema = z.object({
  bio: z.string().max(4000).optional().default(""),
  website: z.string().max(300).optional().default(""),
  socials: z.record(z.string(), z.string().max(300)).optional().default({}),
  logoUrl: z.string().url().nullable().optional(),
  photoUrls: z.array(z.string().url()).max(6).optional().default([]),
});

export type ArtistDraftInput = z.input<typeof schema>;

/** Save the artist's edits as a pending draft for admin review. */
export async function submitArtistDraft(input: ArtistDraftInput) {
  const user = await requireArtist();
  if (!user.artistId) return { error: "No artist profile found." };

  const parsed = schema.safeParse(input);
  if (!parsed.success) return { error: "Please double-check your entries." };

  const { bio, website, socials, logoUrl, photoUrls } = parsed.data;
  const cleanSocials = Object.fromEntries(
    Object.entries(socials).filter(([, v]) => v && v.trim()),
  );

  await db
    .update(artists)
    .set({
      pendingContent: { bio, website, socials: cleanSocials, logoUrl: logoUrl ?? null, photoUrls },
      submittedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(artists.id, user.artistId));

  revalidatePath("/artist");
  revalidatePath("/admin/artists");
  return { ok: true };
}
