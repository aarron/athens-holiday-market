"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { applications, votes, comments, artists, artistPhotos, cycles } from "@/db/schema";
import { ensureDbUser, requireAdmin } from "@/lib/admin-auth";
import { cleanUrl, sanitizeSocials } from "@/lib/clean";
import { logAdminEvent } from "@/lib/audit";
import { sendDecisionEmail, sendArtistPageLive, sendArtistLogistics } from "@/lib/emails";
import { promoteArtistSubmission } from "@/lib/artist-publish";

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
  return { ok: true as const };
}

/** Post a note/comment on an application (any jury member or admin). */
export async function addComment(applicationId: number, body: string) {
  const trimmed = body.trim();
  if (!trimmed) return;
  const user = await ensureDbUser();
  await db.insert(comments).values({ applicationId, userId: user.id, body: trimmed.slice(0, 4000) });
  revalidatePath(`/admin/applications/${applicationId}`);
}

/** Set an application's decision status (admin only). Returns `{ ok }` so the
 *  UI can reconcile its optimistic state if the write fails. */
export async function setStatus(applicationId: number, status: Status) {
  await requireAdmin();
  const prev = await db.query.applications.findFirst({
    where: eq(applications.id, applicationId),
    columns: { status: true, name: true },
  });
  await db
    .update(applications)
    .set({ status, updatedAt: sql`now()` })
    .where(eq(applications.id, applicationId));
  revalidatePath(`/admin/applications/${applicationId}`);
  revalidatePath("/admin");
  await logAdminEvent({
    action: "status.change",
    targetType: "application",
    targetId: applicationId,
    summary: `${prev?.name ?? `Application #${applicationId}`}: ${prev?.status ?? "?"} → ${status}`,
  });
  return { ok: true as const };
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
  return { ok: true as const };
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
  if (res && "ok" in res && res.ok) {
    await logAdminEvent({
      action: "decision.send",
      targetType: "application",
      targetId: applicationId,
      summary: `Emailed ${app.status} decision to ${app.name}`,
    });
  }
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
    await logAdminEvent({ action: "artist.publish", targetType: "artist", targetId: applicationId, summary: `Published artist page: ${app.name}` });
    return { ok: true, slug: existing.slug };
  }

  // One page per artist across years: if this person (matched by email) already
  // has a page from a prior application, refresh THAT page with this year's
  // content instead of minting a duplicate slug (emily-nuckols-2).
  const email = (app.email || "").toLowerCase().trim();
  if (email && !email.endsWith("@no-email.invalid")) {
    const priorApps = await db
      .select({ id: applications.id })
      .from(applications)
      .where(eq(sql`lower(${applications.email})`, email));
    const priorIds = priorApps.map((a) => a.id).filter((id) => id !== applicationId);
    const samePerson = priorIds.length
      ? await db.query.artists.findFirst({ where: inArray(artists.applicationId, priorIds) })
      : null;
    if (samePerson) {
      await db
        .update(artists)
        .set({
          applicationId,
          name: app.name,
          statement: app.description,
          bio: app.bio ?? null,
          medium: app.medium,
          website: cleanUrl(app.website),
          socials: sanitizeSocials(app.socials as Record<string, string>),
          published: true,
          updatedAt: new Date(),
        })
        .where(eq(artists.id, samePerson.id));
      // Replace photos atomically (neon-http has no interactive tx, so batch
      // the delete + insert) — never leave the page with zero photos mid-swap.
      if (app.photos.length) {
        await db.batch([
          db.delete(artistPhotos).where(eq(artistPhotos.artistId, samePerson.id)),
          db.insert(artistPhotos).values(
            app.photos.slice(0, 6).map((p, idx) => ({ artistId: samePerson.id, url: p.url, position: idx })),
          ),
        ]);
      } else {
        await db.delete(artistPhotos).where(eq(artistPhotos.artistId, samePerson.id));
      }
      revalidatePath(`/admin/applications/${applicationId}`);
      revalidatePath("/artists");
      revalidatePath(`/artists/${samePerson.slug}`);
      await logAdminEvent({ action: "artist.publish", targetType: "artist", targetId: applicationId, summary: `Published artist page (refreshed prior year): ${app.name}` });
      return { ok: true, slug: samePerson.slug, updatedExisting: true };
    }
  }

  const base = slugify(app.name) || `artist-${applicationId}`;
  let slug = base;
  let i = 1;
  while (await db.query.artists.findFirst({ where: eq(artists.slug, slug) })) slug = `${base}-${++i}`;

  const artistValues = {
    applicationId,
    name: app.name,
    statement: app.description,
    bio: app.bio ?? null,
    medium: app.medium,
    website: cleanUrl(app.website),
    socials: sanitizeSocials(app.socials as Record<string, string>),
    published: true,
  };
  let created;
  try {
    [created] = await db.insert(artists).values({ ...artistValues, slug }).returning({ id: artists.id });
  } catch {
    // Lost the slug race to a concurrent publish (check-then-insert). Rely on the
    // unique constraint and retry once with a guaranteed-unique slug.
    [created] = await db
      .insert(artists)
      .values({ ...artistValues, slug: `${base}-${applicationId}` })
      .returning({ id: artists.id });
  }

  if (app.photos.length) {
    await db.insert(artistPhotos).values(
      app.photos.slice(0, 6).map((p, idx) => ({ artistId: created.id, url: p.url, position: idx })),
    );
  }
  revalidatePath(`/admin/applications/${applicationId}`);
  revalidatePath("/artists");
  await sendArtistPageLive(app.email, app.name, slug);
  await logAdminEvent({ action: "artist.publish", targetType: "artist", targetId: applicationId, summary: `Published artist page: ${app.name}` });
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

/** Rebuild the spotlight zip for the active cycle and email the posting team its
 *  download link. */
export async function emailPostingTeam() {
  await requireAdmin();
  const { emailPostingTeamNow } = await import("@/lib/social-kit-notify");
  const res = await emailPostingTeamNow();
  if ("error" in res) return { error: res.error };
  return { ok: true, count: res.count };
}

/** Rebuild the spotlight zip for the active cycle without emailing anyone. */
export async function rebuildSpotlightKit() {
  await requireAdmin();
  const { rebuildActiveSpotlightZip } = await import("@/lib/social-kit-notify");
  return rebuildActiveSpotlightZip();
}

/** Hide an artist from the public directory (keeps the record). */
export async function unpublishArtist(applicationId: number) {
  await requireAdmin();
  // Return the slug so we can purge the artist's own page from the ISR/static
  // cache immediately — otherwise `revalidate = 300` on /artists/[slug] could
  // keep serving a taken-down page for up to 5 minutes.
  const [row] = await db
    .update(artists)
    .set({ published: false })
    .where(eq(artists.applicationId, applicationId))
    .returning({ slug: artists.slug });
  revalidatePath(`/admin/applications/${applicationId}`);
  revalidatePath("/artists");
  if (row?.slug) revalidatePath(`/artists/${row.slug}`);
  await logAdminEvent({
    action: "artist.unpublish",
    targetType: "artist",
    targetId: applicationId,
    summary: `Took down artist page${row?.slug ? ` /artists/${row.slug}` : ""}`,
  });
  return { ok: true };
}

/**
 * Permanently delete an application and everything derived from it — photos,
 * votes, comments, login tokens, and its published artist page (all via
 * ON DELETE CASCADE). Admin-only, irreversible. Redirects to the dashboard.
 */
export async function deleteApplication(applicationId: number) {
  await requireAdmin();
  const app = await db.query.applications.findFirst({
    where: eq(applications.id, applicationId),
    columns: { name: true },
  });
  await db.delete(applications).where(eq(applications.id, applicationId));
  await logAdminEvent({
    action: "application.delete",
    targetType: "application",
    targetId: applicationId,
    summary: `Deleted application: ${app?.name ?? `#${applicationId}`} (and its photos, votes, comments, artist page)`,
  });
  revalidatePath("/admin");
  revalidatePath("/admin/artists");
  revalidatePath("/artists");
  redirect("/admin");
}

/** Approve an artist's pending submission → copy it live and publish. */
export async function approveArtistSubmission(artistId: number) {
  await requireAdmin();
  return promoteArtistSubmission(artistId);
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
