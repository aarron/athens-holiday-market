import "server-only";
import { and, desc, eq, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { subscribers, broadcasts, broadcastRecipients } from "@/db/schema";

export type Segment = "all" | "artists" | "non_artists";

export const SEGMENTS: { value: Segment; label: string }[] = [
  { value: "all", label: "Everyone" },
  { value: "artists", label: "Artists only" },
  { value: "non_artists", label: "Everyone except artists" },
];

/** Filter for a segment — always excludes unsubscribed. */
export function segmentWhere(segment: string) {
  const active = ne(subscribers.status, "unsubscribed");
  if (segment === "artists") return and(active, eq(subscribers.isArtist, true));
  if (segment === "non_artists") return and(active, eq(subscribers.isArtist, false));
  return active;
}

export async function segmentRecipients(segment: string) {
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
  const out: Record<Segment, number> = { all: 0, artists: 0, non_artists: 0 };
  for (const s of SEGMENTS) {
    const r = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(subscribers)
      .where(segmentWhere(s.value));
    out[s.value] = r[0]?.n ?? 0;
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
