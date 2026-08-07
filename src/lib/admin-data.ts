import { and, asc, desc, eq, inArray, isNotNull, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { applications, cycles, users, artists, broadcasts, broadcastRecipients } from "@/db/schema";
import type { Tally } from "@/components/admin/badges";

export type CommEvent = {
  label: string;
  kind: "decision" | "broadcast";
  sentAt: Date | null;
  status: string;
  statusAt: Date | null;
};

/**
 * Every tracked email we've sent to this address — decision emails plus any
 * broadcasts — with the latest Resend delivery status, newest first. Lets an
 * admin confirm whether someone actually received (and opened) key messages.
 */
export async function getEmailComms(
  email: string,
  app: { decisionSentAt: Date | null; decisionGroup: string | null; decisionEmailStatus: string | null },
): Promise<CommEvent[]> {
  const addr = email.trim().toLowerCase();
  const rows = await db
    .select({
      subject: broadcasts.subject,
      sentAt: broadcasts.sentAt,
      createdAt: broadcastRecipients.createdAt,
      status: broadcastRecipients.status,
      updatedAt: broadcastRecipients.updatedAt,
    })
    .from(broadcastRecipients)
    .innerJoin(broadcasts, eq(broadcastRecipients.broadcastId, broadcasts.id))
    .where(eq(sql`lower(${broadcastRecipients.email})`, addr));

  const events: CommEvent[] = rows.map((r) => ({
    label: r.subject,
    kind: "broadcast",
    sentAt: r.sentAt ?? r.createdAt,
    status: r.status,
    statusAt: r.updatedAt,
  }));

  if (app.decisionSentAt) {
    events.push({
      label: `Decision email${app.decisionGroup ? ` (${app.decisionGroup})` : ""}`,
      kind: "decision",
      sentAt: app.decisionSentAt,
      status: app.decisionEmailStatus ?? "sent",
      statusAt: null,
    });
  }

  return events.sort((a, b) => (b.sentAt?.getTime() ?? 0) - (a.sentAt?.getTime() ?? 0));
}

/** All cycles (years) with their application counts, newest first. */
export async function getCyclesWithCounts() {
  return db
    .select({
      id: cycles.id,
      year: cycles.year,
      name: cycles.name,
      isActive: cycles.isActive,
      count: sql<number>`count(${applications.id})::int`,
    })
    .from(cycles)
    .leftJoin(applications, eq(applications.cycleId, cycles.id))
    .groupBy(cycles.id)
    .orderBy(desc(cycles.year));
}

/** A person's participation across other years, matched by email or name. */
export async function getParticipationHistory(
  email: string,
  name: string,
  excludeApplicationId: number,
) {
  const conds = [];
  const addr = (email ?? "").toLowerCase().trim();
  if (addr && !addr.endsWith("@no-email.invalid")) {
    conds.push(eq(sql`lower(${applications.email})`, addr));
  }
  const nm = (name ?? "").toLowerCase().trim();
  if (nm && nm !== "(unknown)") {
    conds.push(eq(sql`lower(trim(${applications.name}))`, nm));
  }
  if (conds.length === 0) return [];

  const rows = await db
    .select({ id: applications.id, year: cycles.year, status: applications.status })
    .from(applications)
    .innerJoin(cycles, eq(applications.cycleId, cycles.id))
    .where(or(...conds))
    .orderBy(desc(cycles.year));

  // One entry per year, keeping the strongest outcome.
  const RANK: Record<string, number> = {
    accepted: 4,
    waitlisted: 3,
    submitted: 2,
    under_review: 2,
    rejected: 1,
  };
  const byYear = new Map<number, string>();
  for (const r of rows) {
    if (r.id === excludeApplicationId) continue;
    const cur = byYear.get(r.year);
    if (!cur || (RANK[r.status] ?? 0) > (RANK[cur] ?? 0)) byYear.set(r.year, r.status);
  }
  return [...byYear.entries()].sort((a, b) => b[0] - a[0]).map(([year, status]) => ({ year, status }));
}

/** The cycle currently being judged: the one with the most applications. */
/** The active (current) cycle, falling back to the most recent with applications. */
export async function getActiveCycle() {
  const list = await getCyclesWithCounts();
  return list.find((c) => c.isActive) ?? list.find((c) => c.count > 0) ?? list[0] ?? null;
}

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

/**
 * Prev/next application within the same cycle, in the review-list order
 * (newest first, matching listApplications), so judges can cycle through them.
 */
export async function getAdjacentApplications(appId: number) {
  const cur = await db.query.applications.findFirst({
    where: eq(applications.id, appId),
    columns: { cycleId: true },
  });
  if (!cur) return null;
  const rows = await db
    .select({ id: applications.id })
    .from(applications)
    .where(eq(applications.cycleId, cur.cycleId))
    .orderBy(desc(applications.createdAt), desc(applications.id));
  const idx = rows.findIndex((r) => r.id === appId);
  if (idx === -1) return null;
  return {
    prevId: idx > 0 ? rows[idx - 1].id : null,
    nextId: idx < rows.length - 1 ? rows[idx + 1].id : null,
    position: idx + 1,
    total: rows.length,
  };
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

export type DecisionGroup = "accepted" | "waitlist";
const GROUP_STATUSES: Record<DecisionGroup, string[]> = {
  accepted: ["accepted"],
  waitlist: ["waitlisted", "rejected"],
};

export async function getDecisionGroups(cycleId: number) {
  const apps = await db
    .select({ status: applications.status, sent: applications.decisionSentAt })
    .from(applications)
    .where(eq(applications.cycleId, cycleId));
  const build = (g: DecisionGroup) => {
    const set = apps.filter((a) => GROUP_STATUSES[g].includes(a.status));
    return { total: set.length, notified: set.filter((a) => a.sent).length };
  };
  return { accepted: build("accepted"), waitlist: build("waitlist") };
}

export async function getDecisionRecipients(cycleId: number, group: DecisionGroup) {
  const apps = await db.query.applications.findMany({
    where: and(
      eq(applications.cycleId, cycleId),
      inArray(applications.status, GROUP_STATUSES[group] as ("accepted" | "waitlisted" | "rejected")[]),
    ),
    with: { votes: { columns: { value: true } } },
    orderBy: [asc(applications.name)],
  });
  return apps.map((a) => ({
    id: a.id,
    name: a.name,
    email: a.email,
    status: a.status,
    hasEmail: !a.email.endsWith("@no-email.invalid"),
    tally: tally(a.votes),
    decisionSentAt: a.decisionSentAt ? a.decisionSentAt.toISOString() : null,
    decisionEmailStatus: a.decisionEmailStatus,
  }));
}

export function tally(votes: { value: "yes" | "maybe" | "no" }[]): Tally {
  return {
    yes: votes.filter((v) => v.value === "yes").length,
    maybe: votes.filter((v) => v.value === "maybe").length,
    no: votes.filter((v) => v.value === "no").length,
  };
}
