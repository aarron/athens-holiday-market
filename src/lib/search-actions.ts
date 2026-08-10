"use server";

import { and, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { applications, subscribers, cycles, artists } from "@/db/schema";
import { requireStaff } from "@/lib/admin-auth";

type Outcome = "accepted" | "waitlisted" | "pending";

export type PersonHit = {
  /** Detail-page target: the current-cycle application if any, else most recent. */
  appId: number;
  name: string;
  businessName: string | null;
  email: string;
  phone: string | null;
  website: string | null;
  /** Every year they applied, newest first, with that year's outcome. */
  years: { year: number; outcome: Outcome }[];
  /** Current-cycle standing, when they have an application this year. */
  current: { year: number; accepted: boolean; boothFeePaid: boolean; invoiceUrl: string | null } | null;
  /** Slug of their live public page, if published. */
  publishedSlug: string | null;
  /** Mailing-list standing, if they're on it. */
  mailing: "subscribed" | "unsubscribed" | null;
};

export type SubHit = {
  id: number;
  name: string | null;
  email: string;
  status: string;
  isArtist: boolean;
  subscribedAt: string | null;
};

export type SearchResults = { people: PersonHit[]; subscribers: SubHit[]; query: string };

// We waitlist rather than reject, so a legacy "rejected" reads as waitlisted.
function outcomeOf(status: string): Outcome {
  if (status === "accepted") return "accepted";
  if (status === "waitlisted" || status === "rejected") return "waitlisted";
  return "pending";
}

/**
 * One box, whole database. Matches people across every year's applications and
 * the mailing list by name, email, business/booth name, website, or social
 * handle — then rolls each person's applications up into a single card: who they
 * are, every year they applied and how it went, this year's booth-fee status,
 * and quick links (their application, their live page). Built for support.
 * Staff-only; cheap indexed queries at this scale.
 */
export async function adminSearch(query: string): Promise<SearchResults> {
  await requireStaff();
  const term = query.trim();
  if (term.length < 2) return { people: [], subscribers: [], query: term };
  const like = `%${term.replace(/[%_]/g, (m) => `\\${m}`)}%`;

  const matchConds = or(
    ilike(applications.name, like),
    ilike(applications.email, like),
    ilike(applications.businessName, like),
    ilike(applications.website, like),
    sql`${applications.socials}::text ilike ${like}`,
  );

  // 1) Distinct matched people, ranked exact-email-first then most-recent year.
  const peopleRows = await db
    .select({
      email: sql<string>`lower(${applications.email})`,
      exact: sql<boolean>`bool_or(lower(${applications.email}) = lower(${term}))`,
      recent: sql<number>`max(${cycles.year})`,
    })
    .from(applications)
    .innerJoin(cycles, eq(applications.cycleId, cycles.id))
    .where(matchConds)
    .groupBy(sql`lower(${applications.email})`)
    .orderBy(sql`bool_or(lower(${applications.email}) = lower(${term})) desc`, sql`max(${cycles.year}) desc`)
    .limit(25);

  const emails = peopleRows.map((r) => r.email);

  // 2) Every application for those people (not just the matching ones), so the
  //    rollup shows their whole history.
  const emailExpr = sql`lower(${applications.email})`;
  const appRows = emails.length
    ? await db
        .select({
          id: applications.id,
          name: applications.name,
          businessName: applications.businessName,
          email: sql<string>`lower(${applications.email})`,
          phone: applications.phone,
          website: applications.website,
          year: cycles.year,
          status: applications.status,
          boothFeePaid: applications.boothFeePaid,
          invoiceUrl: applications.paypalInvoiceUrl,
          isActive: cycles.isActive,
        })
        .from(applications)
        .innerJoin(cycles, eq(applications.cycleId, cycles.id))
        .where(inArray(emailExpr, emails))
        .orderBy(desc(cycles.year))
    : [];

  // Live pages + mailing-list standing for those people.
  const appIds = appRows.map((a) => a.id);
  const pages = appIds.length
    ? await db
        .select({ applicationId: artists.applicationId, slug: artists.slug })
        .from(artists)
        .where(and(inArray(artists.applicationId, appIds), eq(artists.published, true)))
    : [];
  const slugByAppId = new Map(pages.map((p) => [p.applicationId, p.slug] as const));

  const subRows = emails.length
    ? await db
        .select({ email: sql<string>`lower(${subscribers.email})`, status: subscribers.status })
        .from(subscribers)
        .where(inArray(sql`lower(${subscribers.email})`, emails))
    : [];
  const mailingByEmail = new Map(subRows.map((s) => [s.email, s.status] as const));

  const people: PersonHit[] = peopleRows.map((p) => {
    const apps = appRows.filter((a) => a.email === p.email); // already year-desc
    const newest = apps[0];
    const current = apps.find((a) => a.isActive) ?? null;
    const firstNonNull = <T,>(get: (a: (typeof apps)[number]) => T | null | undefined) =>
      apps.map(get).find((v) => v != null) ?? null;
    return {
      appId: (current ?? newest).id,
      name: newest?.name ?? p.email,
      businessName: firstNonNull((a) => a.businessName),
      email: newest?.email ?? p.email,
      phone: firstNonNull((a) => a.phone),
      website: firstNonNull((a) => a.website),
      years: apps.map((a) => ({ year: a.year, outcome: outcomeOf(a.status) })),
      current: current
        ? {
            year: current.year,
            accepted: current.status === "accepted",
            boothFeePaid: current.boothFeePaid,
            invoiceUrl: current.invoiceUrl,
          }
        : null,
      publishedSlug: apps.map((a) => slugByAppId.get(a.id)).find(Boolean) ?? null,
      mailing: (mailingByEmail.get(p.email) as PersonHit["mailing"]) ?? null,
    };
  });

  // 3) Mailing-list matches who never applied (so they aren't lost).
  const applicantEmails = new Set(emails);
  const subMatches = await db
    .select({
      id: subscribers.id,
      name: subscribers.name,
      email: subscribers.email,
      status: subscribers.status,
      isArtist: subscribers.isArtist,
      subscribedAt: sql<string | null>`coalesce(${subscribers.confirmedAt}, ${subscribers.createdAt})`,
    })
    .from(subscribers)
    .where(or(ilike(subscribers.name, like), ilike(subscribers.email, like)))
    .orderBy(sql`(lower(${subscribers.email}) = lower(${term})) desc`, subscribers.name)
    .limit(25);

  const subscribersOnly = subMatches
    .filter((s) => !applicantEmails.has(s.email.toLowerCase()))
    .map((s) => ({ ...s, subscribedAt: s.subscribedAt ?? null }));

  return { people, subscribers: subscribersOnly, query: term };
}
