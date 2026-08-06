import "server-only";
import { createHash, randomBytes } from "crypto";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { loginTokens, applications, users, artists } from "@/db/schema";
import { bootstrapAdmins, bootstrapJudges } from "@/lib/env";
import type { AppRole } from "@/lib/roles";

export type Identity = { role: AppRole; applicationId?: number };

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

  const [created] = await db
    .insert(artists)
    .values({
      applicationId,
      slug,
      name: app.name,
      medium: app.medium,
      bio: app.description,
      website: app.website || null,
      socials: (app.socials as Record<string, string>) ?? {},
      published: false,
    })
    .returning();
  return created;
}
