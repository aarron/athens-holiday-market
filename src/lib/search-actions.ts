"use server";

import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { applications, subscribers, cycles } from "@/db/schema";
import { requireStaff } from "@/lib/admin-auth";

export type AppHit = {
  id: number;
  name: string;
  businessName: string | null;
  email: string;
  website: string | null;
  year: number;
  status: string;
  boothFeePaid: boolean;
  invoiceUrl: string | null;
};

export type SubHit = {
  id: number;
  name: string | null;
  email: string;
  status: string;
  isArtist: boolean;
  subscribedAt: string | null;
};

export type SearchResults = { applications: AppHit[]; subscribers: SubHit[]; query: string };

/**
 * One box, whole database: find a person across every year's applications and
 * the mailing list by name, email, business/booth name, website, or social
 * handle. Built for support — "who is this business that just paid?", "resend
 * their artist link", "did we email them?". Staff-only; cheap indexed ILIKE at
 * this scale (no full-text engine needed).
 */
export async function adminSearch(query: string): Promise<SearchResults> {
  await requireStaff();
  const term = query.trim();
  if (term.length < 2) return { applications: [], subscribers: [], query: term };
  const like = `%${term.replace(/[%_]/g, (m) => `\\${m}`)}%`;

  const appRows = await db
    .select({
      id: applications.id,
      name: applications.name,
      businessName: applications.businessName,
      email: applications.email,
      website: applications.website,
      year: cycles.year,
      status: applications.status,
      boothFeePaid: applications.boothFeePaid,
      invoiceUrl: applications.paypalInvoiceUrl,
    })
    .from(applications)
    .innerJoin(cycles, eq(applications.cycleId, cycles.id))
    .where(
      or(
        ilike(applications.name, like),
        ilike(applications.email, like),
        ilike(applications.businessName, like),
        ilike(applications.website, like),
        sql`${applications.socials}::text ilike ${like}`,
      ),
    )
    // Exact email match first, then most recent year.
    .orderBy(sql`(lower(${applications.email}) = lower(${term})) desc`, desc(cycles.year))
    .limit(25);

  const subRows = await db
    .select({
      id: subscribers.id,
      name: subscribers.name,
      email: subscribers.email,
      status: subscribers.status,
      isArtist: subscribers.isArtist,
      subscribedAt: sql<string | null>`coalesce(${subscribers.confirmedAt}, ${subscribers.createdAt})`,
    })
    .from(subscribers)
    .where(and(or(ilike(subscribers.name, like), ilike(subscribers.email, like))))
    .orderBy(sql`(lower(${subscribers.email}) = lower(${term})) desc`, subscribers.name)
    .limit(25);

  return {
    applications: appRows,
    subscribers: subRows.map((s) => ({ ...s, subscribedAt: s.subscribedAt ?? null })),
    query: term,
  };
}
