"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { applications, votes, comments, artists, artistPhotos, cycles } from "@/db/schema";
import { ensureDbUser, requireAdmin } from "@/lib/admin-auth";
import {
  sendDecisionEmail,
  sendArtistPageLive,
  sendJudgeSocialKit,
  sendArtistLogistics,
  SOCIAL_POSTING_TEAM,
} from "@/lib/emails";

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
      statement: app.description,
      bio: app.bio ?? null,
      medium: app.medium,
      website: app.website || null,
      socials: (app.socials as Record<string, string>) ?? {},
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
  await sendArtistPageLive(app.email, app.name, slug);
  return { ok: true, slug };
}

/** Email event-day logistics to every accepted artist in the active cycle. */
export async function emailAcceptedArtistsLogistics() {
  await requireAdmin();
  const cycle = await db.query.cycles.findFirst({ where: eq(cycles.isActive, true) });
  if (!cycle) return { error: "No active cycle." };
  const accepted = await db
    .select({ email: applications.email, name: applications.name })
    .from(applications)
    .where(and(eq(applications.cycleId, cycle.id), eq(applications.status, "accepted")));

  let sent = 0;
  for (const a of accepted) {
    const res = await sendArtistLogistics(a.email, a.name);
    if (!(res && "skipped" in res) && !(res && "error" in res)) sent++;
  }
  return { ok: true, total: accepted.length, sent };
}

/** Email the posting team a prompt to download + share artist spotlights. */
export async function emailPostingTeam() {
  await requireAdmin();
  const res = await sendJudgeSocialKit(SOCIAL_POSTING_TEAM);
  if (res && "error" in res) return { error: "Couldn't send. Please try again." };
  return { ok: true, count: SOCIAL_POSTING_TEAM.length };
}

/** Hide an artist from the public directory (keeps the record). */
export async function unpublishArtist(applicationId: number) {
  await requireAdmin();
  await db.update(artists).set({ published: false }).where(eq(artists.applicationId, applicationId));
  revalidatePath(`/admin/applications/${applicationId}`);
  revalidatePath("/artists");
  return { ok: true };
}

/**
 * Permanently delete an application and everything derived from it — photos,
 * votes, comments, login tokens, and its published artist page (all via
 * ON DELETE CASCADE). Admin-only, irreversible. Redirects to the dashboard.
 */
export async function deleteApplication(applicationId: number) {
  await requireAdmin();
  await db.delete(applications).where(eq(applications.id, applicationId));
  revalidatePath("/admin");
  revalidatePath("/admin/artists");
  revalidatePath("/artists");
  redirect("/admin");
}

/** Approve an artist's pending submission → copy it live and publish. */
export async function approveArtistSubmission(artistId: number) {
  await requireAdmin();
  const artist = await db.query.artists.findFirst({ where: eq(artists.id, artistId) });
  if (!artist || !artist.pendingContent) return { error: "Nothing to approve." };
  const pc = artist.pendingContent;
  const firstPublish = !artist.published;

  await db
    .update(artists)
    .set({
      statement: pc.statement ?? artist.statement,
      bio: pc.bio ?? artist.bio,
      website: pc.website ?? artist.website,
      socials: pc.socials ?? artist.socials,
      logoUrl: pc.logoUrl ?? null,
      published: true,
      pendingContent: null,
      submittedAt: null,
      updatedAt: new Date(),
    })
    .where(eq(artists.id, artistId));

  if (pc.photoUrls) {
    await db.delete(artistPhotos).where(eq(artistPhotos.artistId, artistId));
    if (pc.photoUrls.length) {
      await db.insert(artistPhotos).values(
        pc.photoUrls.slice(0, 6).map((url, i) => ({ artistId, url, position: i })),
      );
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
  return { ok: true };
}

/** Return a submission to the artist without publishing (clears pending). */
export async function returnArtistSubmission(artistId: number) {
  await requireAdmin();
  await db
    .update(artists)
    .set({ pendingContent: null, submittedAt: null })
    .where(eq(artists.id, artistId));
  revalidatePath("/admin/artists");
  return { ok: true };
}

/** Email an accepted artist their magic login link (admin-initiated). */
export async function sendArtistLink(email: string) {
  await requireAdmin();
  const { resolveIdentity, createMagicToken } = await import("@/lib/magic");
  const { sendMagicLink } = await import("@/lib/emails");
  const { publicEnv } = await import("@/lib/env");
  const identity = await resolveIdentity(email);
  if (!identity || identity.role !== "artist") {
    return { error: "That email isn't an accepted artist." };
  }
  const raw = await createMagicToken(email);
  const res = await sendMagicLink(email, `${publicEnv.siteUrl}/auth/verify?token=${raw}`);
  return { ok: true, skipped: !!(res && "skipped" in res) };
}
