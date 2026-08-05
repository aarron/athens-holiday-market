"use server";

import { revalidatePath } from "next/cache";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { applications, votes, comments, artists, artistPhotos } from "@/db/schema";
import { ensureDbUser, requireAdmin } from "@/lib/admin-auth";
import { sendDecisionEmail } from "@/lib/emails";

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

type VoteValue = "yes" | "maybe" | "no";
type Status = "submitted" | "under_review" | "accepted" | "waitlisted" | "rejected";

/** Cast or change the current user's vote on an application. */
export async function castVote(applicationId: number, value: VoteValue) {
  const user = await ensureDbUser();
  await db
    .insert(votes)
    .values({ applicationId, userId: user.id, value })
    .onConflictDoUpdate({
      target: [votes.applicationId, votes.userId],
      set: { value, updatedAt: sql`now()` },
    });
  revalidatePath(`/admin/applications/${applicationId}`);
  revalidatePath("/admin");
}

/** Post a note/comment on an application (any jury member or admin). */
export async function addComment(applicationId: number, body: string) {
  const trimmed = body.trim();
  if (!trimmed) return;
  const user = await ensureDbUser();
  await db.insert(comments).values({ applicationId, userId: user.id, body: trimmed.slice(0, 4000) });
  revalidatePath(`/admin/applications/${applicationId}`);
}

/** Set an application's decision status (admin only). */
export async function setStatus(applicationId: number, status: Status) {
  await requireAdmin();
  await db
    .update(applications)
    .set({ status, updatedAt: sql`now()` })
    .where(eq(applications.id, applicationId));
  revalidatePath(`/admin/applications/${applicationId}`);
  revalidatePath("/admin");
}

/** Toggle whether the booth fee has been paid (admin only). */
export async function setBoothFee(applicationId: number, paid: boolean) {
  await requireAdmin();
  await db
    .update(applications)
    .set({ boothFeePaid: paid, boothFeePaidAt: paid ? sql`now()` : null, updatedAt: sql`now()` })
    .where(eq(applications.id, applicationId));
  revalidatePath(`/admin/applications/${applicationId}`);
  revalidatePath("/admin");
}

/** Email the applicant their decision based on current status (admin only). */
export async function sendDecision(applicationId: number) {
  await requireAdmin();
  const app = await db.query.applications.findFirst({ where: eq(applications.id, applicationId) });
  if (!app) return { error: "Not found" };
  if (!["accepted", "waitlisted", "rejected"].includes(app.status)) {
    return { error: "Set a decision (accept / waitlist / reject) before emailing." };
  }
  const res = await sendDecisionEmail(app.email, app.name, app.status as "accepted" | "waitlisted" | "rejected");
  return res;
}

/** Create (or re-publish) a public artist profile from an accepted application. */
export async function publishArtist(applicationId: number) {
  await requireAdmin();
  const app = await db.query.applications.findFirst({
    where: eq(applications.id, applicationId),
    with: { photos: { orderBy: (p, { asc }) => [asc(p.position)] } },
  });
  if (!app) return { error: "Not found" };

  const existing = await db.query.artists.findFirst({ where: eq(artists.applicationId, applicationId) });
  if (existing) {
    await db.update(artists).set({ published: true }).where(eq(artists.id, existing.id));
    revalidatePath(`/admin/applications/${applicationId}`);
    revalidatePath("/artists");
    return { ok: true, slug: existing.slug };
  }

  const base = slugify(app.name) || `artist-${applicationId}`;
  let slug = base;
  let i = 1;
  while (await db.query.artists.findFirst({ where: eq(artists.slug, slug) })) slug = `${base}-${++i}`;

  const [created] = await db
    .insert(artists)
    .values({
      applicationId,
      slug,
      name: app.name,
      bio: app.description,
      medium: app.medium,
      website: app.website || null,
      published: true,
    })
    .returning({ id: artists.id });

  if (app.photos.length) {
    await db.insert(artistPhotos).values(
      app.photos.slice(0, 6).map((p, idx) => ({ artistId: created.id, url: p.url, position: idx })),
    );
  }
  revalidatePath(`/admin/applications/${applicationId}`);
  revalidatePath("/artists");
  return { ok: true, slug };
}

/** Hide an artist from the public directory (keeps the record). */
export async function unpublishArtist(applicationId: number) {
  await requireAdmin();
  await db.update(artists).set({ published: false }).where(eq(artists.applicationId, applicationId));
  revalidatePath(`/admin/applications/${applicationId}`);
  revalidatePath("/artists");
  return { ok: true };
}
