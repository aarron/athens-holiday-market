import "server-only";
import { and, desc, eq, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { subscribers, broadcasts, broadcastRecipients, applications, cycles } from "@/db/schema";

export type Segment =
  | "all"
  | "artists"
  | "non_artists"
  | "accepted"
  | "waitlisted"
  | "applicants";

export const SEGMENTS: { value: Segment; label: string; group: "list" | "cycle" }[] = [
  { value: "all", label: "Everyone", group: "list" },
  { value: "artists", label: "Artists only", group: "list" },
  { value: "non_artists", label: "Everyone except artists", group: "list" },
  { value: "accepted", label: "Accepted artists (this year)", group: "cycle" },
  { value: "waitlisted", label: "Waitlisted (this year)", group: "cycle" },
  { value: "applicants", label: "All applicants (this year)", group: "cycle" },
];

const CYCLE_SEGMENTS = new Set<string>(["accepted", "waitlisted", "applicants"]);

/** Subscriber-list filter for a segment — always excludes unsubscribed. */
export function segmentWhere(segment: string) {
  const active = ne(subscribers.status, "unsubscribed");
  if (segment === "artists") return and(active, eq(subscribers.isArtist, true));
  if (segment === "non_artists") return and(active, eq(subscribers.isArtist, false));
  return active;
}

/** Recipients (email/name/unsubscribe token) for any segment. Cycle segments
 *  read this year's applications and reuse a subscriber's token when one exists. */
export async function segmentRecipients(segment: string) {
  if (CYCLE_SEGMENTS.has(segment)) {
    const cycle = await db.query.cycles.findFirst({ where: eq(cycles.isActive, true) });
    if (!cycle) return [];
    const conds = [eq(applications.cycleId, cycle.id)];
    if (segment === "accepted") conds.push(eq(applications.status, "accepted"));
    if (segment === "waitlisted") conds.push(eq(applications.status, "waitlisted"));
    const rows = await db
      .select({
        email: applications.email,
        name: applications.name,
        token: subscribers.unsubscribeToken,
      })
      .from(applications)
      .leftJoin(subscribers, eq(sql`lower(${subscribers.email})`, sql`lower(${applications.email})`))
      .where(and(...conds));
    const seen = new Set<string>();
    return rows
      .filter((r) => {
        const e = (r.email || "").toLowerCase();
        if (!e || e.endsWith("@no-email.invalid") || seen.has(e)) return false;
        seen.add(e);
        return true;
      })
      .map((r) => ({ email: r.email, name: r.name, token: r.token ?? "" }));
  }
  return db
    .select({
      email: subscribers.email,
      name: subscribers.name,
      token: subscribers.unsubscribeToken,
    })
    .from(subscribers)
    .where(segmentWhere(segment));
}

export async function segmentCounts() {
  const out = {} as Record<Segment, number>;
  for (const s of SEGMENTS) {
    if (CYCLE_SEGMENTS.has(s.value)) {
      out[s.value] = (await segmentRecipients(s.value)).length;
    } else {
      const r = await db
        .select({ n: sql<number>`count(*)::int` })
        .from(subscribers)
        .where(segmentWhere(s.value));
      out[s.value] = r[0]?.n ?? 0;
    }
  }
  return out;
}

export async function listBroadcasts() {
  return db.query.broadcasts.findMany({ orderBy: [desc(broadcasts.createdAt)] });
}

export async function getBroadcast(id: number) {
  return db.query.broadcasts.findFirst({ where: eq(broadcasts.id, id) });
}

/** Delivery receipt breakdown for a broadcast (sent/delivered/opened/bounced…). */
export async function broadcastReceipts(id: number) {
  const rows = await db
    .select({ status: broadcastRecipients.status, n: sql<number>`count(*)::int` })
    .from(broadcastRecipients)
    .where(eq(broadcastRecipients.broadcastId, id))
    .groupBy(broadcastRecipients.status);
  const map: Record<string, number> = {};
  for (const r of rows) map[r.status] = r.n;
  return map;
}

export async function subscriberStats() {
  const rows = await db
    .select({ status: subscribers.status, n: sql<number>`count(*)::int` })
    .from(subscribers)
    .groupBy(subscribers.status);
  const byStatus: Record<string, number> = {};
  for (const r of rows) byStatus[r.status] = r.n;
  const artists = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(subscribers)
    .where(and(eq(subscribers.isArtist, true), ne(subscribers.status, "unsubscribed")));
  return {
    total: Object.values(byStatus).reduce((a, b) => a + b, 0),
    subscribed: (byStatus.subscribed ?? 0) + (byStatus.pending ?? 0),
    unsubscribed: byStatus.unsubscribed ?? 0,
    artists: artists[0]?.n ?? 0,
  };
}

export async function listSubscribers() {
  return db.query.subscribers.findMany({ orderBy: [desc(subscribers.createdAt)] });
}
