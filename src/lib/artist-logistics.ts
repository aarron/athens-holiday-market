import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { applications, cycles, settings } from "@/db/schema";
import { resend, EMAIL_FROM } from "@/lib/resend-client";
import { artistLogisticsEmail, type ArtistLogisticsKind } from "@/lib/emails";
import { site } from "@/lib/site";

/**
 * Setup-details emails to every accepted artist (non-profits too), same dates
 * every year: Nov 15, and the Monday before the market. Shared by the daily
 * cron and the admin Automations tab, so the dates shown are the dates sent.
 */
export function artistLogisticsPlan() {
  const year = site.event.year;
  const day1 = new Date(`${site.event.days[0].date}T12:00:00Z`);
  // Days back to the Monday before day 1 (a Monday market goes back a week).
  const back = (day1.getUTCDay() + 6) % 7 || 7;
  const monday = new Date(day1.getTime() - back * 86_400_000).toISOString().slice(0, 10);
  return [
    { kind: "setup" as ArtistLogisticsKind, sendDate: `${year}-11-15`, subject: artistLogisticsEmail("", "setup").subject },
    { kind: "week" as ArtistLogisticsKind, sendDate: monday, subject: artistLogisticsEmail("", "week").subject },
  ];
}

/**
 * Aarron approves artist email copy before it can send. Flip to true once he
 * has approved both versions; until then the cron sends nothing and the
 * Automations tab says the copy needs approval.
 */
export const ARTIST_LOGISTICS_COPY_APPROVED = false;

export const artistLogisticsFlagKey = (kind: ArtistLogisticsKind) => `artist_logistics:${site.event.year}:${kind}`;

/** Accepted artists in the active cycle with a usable email. */
export async function artistLogisticsRecipients() {
  const cycle = await db.query.cycles.findFirst({ where: eq(cycles.isActive, true), columns: { id: true } });
  if (!cycle) return [];
  const rows = await db
    .select({ name: applications.name, email: applications.email })
    .from(applications)
    .where(and(eq(applications.cycleId, cycle.id), eq(applications.status, "accepted")));
  return rows.filter((r) => r.email && !r.email.endsWith("@no-email.invalid"));
}

/** Daily cron: on a send date, email every accepted artist once. */
export async function runArtistLogisticsEmails(now: Date = new Date()) {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(now);
  const p = artistLogisticsPlan().find((x) => x.sendDate === today);
  if (!p) return { sent: 0, note: `no setup email due (${today})` };
  if (!ARTIST_LOGISTICS_COPY_APPROVED) return { sent: 0, note: `${p.kind} held: copy not yet approved` };

  const flagKey = artistLogisticsFlagKey(p.kind);
  const skip = await db.query.settings.findFirst({ where: eq(settings.key, `send_skip:${flagKey}`) });
  if (skip?.value) return { sent: 0, note: `${p.kind} canceled by admin` };
  if (!resend) return { sent: 0, note: "resend not configured" };

  // Claim before sending so a duplicate cron run can't double-send.
  const [claimed] = await db
    .insert(settings)
    .values({ key: flagKey, value: true })
    .onConflictDoNothing({ target: settings.key })
    .returning({ key: settings.key });
  if (!claimed) return { sent: 0, note: `${p.kind} already sent` };

  const recipients = await artistLogisticsRecipients();
  let sent = 0;
  for (let i = 0; i < recipients.length; i += 100) {
    const chunk = recipients.slice(i, i + 100);
    try {
      const res = await resend.batch.send(
        chunk.map((r) => ({ from: EMAIL_FROM, to: r.email, ...artistLogisticsEmail(r.name, p.kind) })),
      );
      if (res.error) console.error("[artist-logistics] batch failed:", res.error);
      else sent += chunk.length;
    } catch (e) {
      console.error("[artist-logistics] batch failed:", e);
    }
  }
  // Nothing went out (e.g. a Resend outage): release the claim so it isn't
  // shown as sent and can be re-run.
  if (sent === 0) await db.delete(settings).where(eq(settings.key, flagKey));
  return { kind: p.kind, recipients: recipients.length, sent };
}
