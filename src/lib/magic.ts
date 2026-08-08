import "server-only";
import { createHash, randomBytes } from "crypto";
import { and, desc, eq, lt } from "drizzle-orm";
import { db } from "@/db";
import { loginTokens, applications, applicationPhotos, artistPhotos, users, artists } from "@/db/schema";
import { bootstrapAdmins, bootstrapJudges } from "@/lib/env";
import type { AppRole } from "@/lib/roles";

export type Identity = { role: AppRole; applicationId?: number };

/**
 * The most recent accepted application for an email, regardless of any staff
 * role. `resolveIdentity` resolves a single role staff-first, so a judge who
 * also exhibits never resolves to "artist"; this lets the artist portal grant
 * page access by email independently of the primary role (dual role).
 */
export async function acceptedApplicationIdForEmail(email: string): Promise<number | null> {
  const addr = email.toLowerCase().trim();
  const app = await db.query.applications.findFirst({
    where: and(eq(applications.email, addr), eq(applications.status, "accepted")),
    orderBy: [desc(applications.createdAt)],
    columns: { id: true },
  });
  return app?.id ?? null;
}

/** Map an email to a role, or null if it has no access. */
export async function resolveIdentity(email: string): Promise<Identity | null> {
  const addr = email.toLowerCase().trim();
  if (bootstrapAdmins.includes(addr)) return { role: "admin" };
  if (bootstrapJudges.includes(addr)) return { role: "judge" };

  const staff = await db.query.users.findFirst({
    where: eq(users.email, addr),
    columns: { role: true },
  });
  if (staff) return { role: staff.role };

  const app = await db.query.applications.findFirst({
    where: and(eq(applications.email, addr), eq(applications.status, "accepted")),
    orderBy: [desc(applications.createdAt)],
    columns: { id: true },
  });
  if (app) return { role: "artist", applicationId: app.id };

  return null;
}

const hashToken = (raw: string) => createHash("sha256").update(raw).digest("hex");

/** Create a single-use, expiring magic-link token; returns the raw token. */
export async function createMagicToken(email: string, ttlMinutes = 30) {
  const raw = randomBytes(32).toString("base64url");
  await db.insert(loginTokens).values({
    email: email.toLowerCase().trim(),
    tokenHash: hashToken(raw),
    expiresAt: new Date(Date.now() + ttlMinutes * 60_000),
  });
  // Opportunistically prune expired tokens so the table can't grow unbounded.
  await db.delete(loginTokens).where(lt(loginTokens.expiresAt, new Date()));
  return raw;
}

/** Validate + consume a token, returning the email it was issued to (or null). */
export async function consumeMagicToken(raw: string): Promise<string | null> {
  const row = await db.query.loginTokens.findFirst({
    where: eq(loginTokens.tokenHash, hashToken(raw)),
  });
  if (!row || row.usedAt || row.expiresAt.getTime() < Date.now()) return null;
  await db.update(loginTokens).set({ usedAt: new Date() }).where(eq(loginTokens.id, row.id));
  return row.email;
}

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

/** Ensure an artist record exists for an accepted application (seeded draft). */
export async function ensureArtistForApplication(applicationId: number) {
  const existing = await db.query.artists.findFirst({
    where: eq(artists.applicationId, applicationId),
  });
  if (existing) return existing;

  const app = await db.query.applications.findFirst({
    where: eq(applications.id, applicationId),
  });
  if (!app) return null;

  const base = slugify(app.name) || `artist-${applicationId}`;
  let slug = base;
  let i = 1;
  while (await db.query.artists.findFirst({ where: eq(artists.slug, slug) })) slug = `${base}-${++i}`;

  const values = {
    applicationId,
    name: app.name,
    medium: app.medium,
    // The application captures both up front: statement (about the work),
    // bio (about the artist). Seed both so the page is nearly done.
    statement: app.description,
    bio: app.bio ?? null,
    website: app.website || null,
    socials: (app.socials as Record<string, string>) ?? {},
    published: false,
  };

  let created;
  try {
    [created] = await db.insert(artists).values({ ...values, slug }).returning();
  } catch {
    // The portal layout and page both call this concurrently, so a check-then-
    // insert can lose the slug race. The winner created this application's row —
    // return it. Otherwise a genuine slug clash: retry once with a unique suffix.
    const raced = await db.query.artists.findFirst({ where: eq(artists.applicationId, applicationId) });
    if (raced) return raced;
    [created] = await db.insert(artists).values({ ...values, slug: `${base}-${applicationId}` }).returning();
  }

  // Give the artist a head start: copy their application photos into the draft.
  const photos = await db.query.applicationPhotos.findMany({
    where: eq(applicationPhotos.applicationId, applicationId),
    orderBy: (p, { asc }) => [asc(p.position)],
  });
  if (photos.length) {
    await db.insert(artistPhotos).values(
      photos.slice(0, 6).map((p, i) => ({ artistId: created.id, url: p.url, position: i })),
    );
  }
  return created;
}
