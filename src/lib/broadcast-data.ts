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

/** Cumulative engagement counts + rates per broadcast for the Email list (one
 *  query). Same rollup as {@link broadcastReceipts} but batched across all rows. */
export type BroadcastRateRow = {
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  openRate: number | null;
  clickRate: number | null;
};
export async function broadcastReceiptSummaries(): Promise<Record<number, BroadcastRateRow>> {
  const rows = await db
    .select({
      broadcastId: broadcastRecipients.broadcastId,
      status: broadcastRecipients.status,
      n: sql<number>`count(*)::int`,
    })
    .from(broadcastRecipients)
    .groupBy(broadcastRecipients.broadcastId, broadcastRecipients.status);

  const byId: Record<number, Record<string, number>> = {};
  for (const r of rows) (byId[r.broadcastId] ??= {})[r.status] = r.n;

  const out: Record<number, BroadcastRateRow> = {};
  for (const [id, c] of Object.entries(byId)) {
    const clicked = c.clicked ?? 0;
    const opened = (c.opened ?? 0) + clicked;
    const delivered = (c.delivered ?? 0) + opened;
    const bounced = c.bounced ?? 0;
    out[Number(id)] = {
      delivered,
      opened,
      clicked,
      bounced,
      openRate: delivered > 0 ? Math.round((opened / delivered) * 100) : null,
      clickRate: delivered > 0 ? Math.round((clicked / delivered) * 100) : null,
    };
  }
  return out;
}

/** Delivery receipt breakdown for a broadcast (sent/delivered/opened/bounced…). */
export type BroadcastReceipts = {
  total: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  complained: number;
  /** Opens ÷ delivered and clicks ÷ delivered, 0–100 (null when nothing delivered). */
  openRate: number | null;
  clickRate: number | null;
};

/**
 * Cumulative engagement funnel for one broadcast. `status` advances per
 * recipient (sent→delivered→opened→clicked), so a plain group-by would count
 * each person once and make opens look like they *reduce* deliveries. Here each
 * later stage rolls up into the earlier ones: an opened email is also delivered.
 */
export async function broadcastReceipts(id: number): Promise<BroadcastReceipts> {
  const rows = await db
    .select({ status: broadcastRecipients.status, n: sql<number>`count(*)::int` })
    .from(broadcastRecipients)
    .where(eq(broadcastRecipients.broadcastId, id))
    .groupBy(broadcastRecipients.status);
  const c: Record<string, number> = {};
  for (const r of rows) c[r.status] = r.n;

  const clicked = c.clicked ?? 0;
  const opened = (c.opened ?? 0) + clicked;
  const delivered = (c.delivered ?? 0) + opened;
  const bounced = c.bounced ?? 0;
  const complained = c.complained ?? 0;
  const total = Object.values(c).reduce((a, b) => a + b, 0);
  const pct = (n: number) => (delivered > 0 ? Math.round((n / delivered) * 100) : null);

  return {
    total,
    delivered,
    opened,
    clicked,
    bounced,
    complained,
    openRate: pct(opened),
    clickRate: pct(clicked),
  };
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
