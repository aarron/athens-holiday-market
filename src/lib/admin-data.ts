import { asc, desc, eq, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { applications, cycles, users, artists } from "@/db/schema";
import type { Tally } from "@/components/admin/badges";

/** The cycle currently being judged: the one with the most applications. */
export async function getJudgingCycle() {
  const rows = await db
    .select({
      id: cycles.id,
      year: cycles.year,
      name: cycles.name,
      count: sql<number>`count(${applications.id})::int`,
    })
    .from(cycles)
    .leftJoin(applications, eq(applications.cycleId, cycles.id))
    .groupBy(cycles.id)
    .orderBy(desc(sql`count(${applications.id})`), desc(cycles.year));
  return rows[0] ?? null;
}

export async function listApplications(cycleId: number) {
  return db.query.applications.findMany({
    where: eq(applications.cycleId, cycleId),
    orderBy: [desc(applications.createdAt)],
    with: {
      votes: { with: { user: { columns: { id: true, name: true } } } },
      photos: { orderBy: (p, { asc }) => [asc(p.position)], limit: 1 },
    },
  });
}

export async function getApplication(id: number) {
  return db.query.applications.findFirst({
    where: eq(applications.id, id),
    with: {
      cycle: true,
      photos: { orderBy: (p, { asc }) => [asc(p.position)] },
      votes: { with: { user: { columns: { id: true, name: true, email: true } } } },
      comments: {
        orderBy: (c, { asc }) => [asc(c.createdAt)],
        with: { user: { columns: { id: true, name: true, email: true, role: true } } },
      },
    },
  });
}

/** The public artist profile linked to an application, if any. */
export async function getArtistForApplication(applicationId: number) {
  return db.query.artists.findFirst({
    where: eq(artists.applicationId, applicationId),
    columns: { id: true, slug: true, published: true },
  });
}

/** All jury members + admins, for per-judge vote columns. */
export async function getJurors() {
  return db.query.users.findMany({ orderBy: [users.id] });
}

export async function listArtistsForAdmin() {
  return db.query.artists.findMany({
    orderBy: [desc(artists.submittedAt), asc(artists.name)],
    with: { photos: { limit: 1, orderBy: (p, { asc }) => [asc(p.position)] } },
  });
}

export async function getArtistForAdmin(id: number) {
  return db.query.artists.findFirst({
    where: eq(artists.id, id),
    with: {
      photos: { orderBy: (p, { asc }) => [asc(p.position)] },
      application: { columns: { id: true, name: true, email: true } },
    },
  });
}

export async function countPendingArtistReviews() {
  const rows = await db.select({ id: artists.id }).from(artists).where(isNotNull(artists.submittedAt));
  return rows.length;
}

export function tally(votes: { value: "yes" | "maybe" | "no" }[]): Tally {
  return {
    yes: votes.filter((v) => v.value === "yes").length,
    maybe: votes.filter((v) => v.value === "maybe").length,
    no: votes.filter((v) => v.value === "no").length,
  };
}
