import "server-only";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { prospects, prospectImages, prospectBatches } from "@/db/schema";

export type ProspectStatus = "new" | "shortlisted" | "maybe" | "passed";

export type ProspectCard = {
  id: number;
  name: string;
  medium: string | null;
  category: string | null;
  city: string | null;
  state: string | null;
  region: string | null;
  website: string | null;
  instagram: string | null;
  email: string | null;
  description: string | null;
  notes: string | null;
  foundVia: string | null;
  status: ProspectStatus;
  invitedAt: Date | null;
  images: string[]; // blobUrl preferred, else sourceUrl, in position order
};

/** Count of prospects in each triage state for the active cycle. */
export async function getProspectSummary(cycleId: number) {
  const rows = await db
    .select({ status: prospects.status, n: sql<number>`count(*)::int` })
    .from(prospects)
    .where(eq(prospects.cycleId, cycleId))
    .groupBy(prospects.status);
  const by = { new: 0, shortlisted: 0, maybe: 0, passed: 0 } as Record<ProspectStatus, number>;
  for (const r of rows) by[r.status as ProspectStatus] = r.n;
  const total = by.new + by.shortlisted + by.maybe + by.passed;
  const invited = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(prospects)
    .where(and(eq(prospects.cycleId, cycleId), sql`${prospects.invitedAt} is not null`));
  return { ...by, total, invited: invited[0]?.n ?? 0 };
}

export type ResearchBatchRow = {
  id: number;
  label: string;
  status: string;
  added: number;
  target: number | null;
  createdAt: Date;
};

/** Recent auto-scout batches for a cycle, newest first. */
export async function listResearchBatches(cycleId: number, limit = 5): Promise<ResearchBatchRow[]> {
  const rows = await db.query.prospectBatches.findMany({
    where: and(eq(prospectBatches.cycleId, cycleId), eq(prospectBatches.source, "auto_scout")),
    orderBy: [desc(prospectBatches.createdAt)],
    limit,
  });
  return rows.map((b) => {
    const stats = (b.stats ?? {}) as { added?: number };
    const params = (b.params ?? {}) as { targetCount?: number };
    return {
      id: b.id,
      label: b.label,
      status: b.status,
      added: stats.added ?? 0,
      target: params.targetCount ?? null,
      createdAt: b.createdAt,
    };
  });
}

/** Prospects for a cycle, newest first, each with its ordered image URLs. */
export async function listProspects(
  cycleId: number,
  opts: { status?: ProspectStatus } = {},
): Promise<ProspectCard[]> {
  const conds = [eq(prospects.cycleId, cycleId)];
  if (opts.status) conds.push(eq(prospects.status, opts.status));

  const rows = await db.query.prospects.findMany({
    where: and(...conds),
    orderBy: [desc(prospects.createdAt), asc(prospects.id)],
    with: { images: { orderBy: [asc(prospectImages.position)] } },
  });

  return rows.map((p) => ({
    id: p.id,
    name: p.name,
    medium: p.medium,
    category: p.category,
    city: p.city,
    state: p.state,
    region: p.region,
    website: p.website,
    instagram: p.instagram,
    email: p.email,
    description: p.description,
    notes: p.notes,
    foundVia: p.foundVia,
    status: p.status as ProspectStatus,
    invitedAt: p.invitedAt,
    images: p.images.map((im) => im.blobUrl ?? im.sourceUrl),
  }));
}
