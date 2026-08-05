import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { applications, cycles, users } from "@/db/schema";
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

/** All jury members + admins, for per-judge vote columns. */
export async function getJurors() {
  return db.query.users.findMany({ orderBy: [users.id] });
}

export function tally(votes: { value: "yes" | "maybe" | "no" }[]): Tally {
  return {
    yes: votes.filter((v) => v.value === "yes").length,
    maybe: votes.filter((v) => v.value === "maybe").length,
    no: votes.filter((v) => v.value === "no").length,
  };
}
