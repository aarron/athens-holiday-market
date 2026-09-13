import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { applications, cycles, settings } from "@/db/schema";
import { resend, EMAIL_FROM } from "@/lib/resend-client";
import { emailShell } from "@/lib/email-shell";
import { segmentRecipients } from "@/lib/broadcast-data";
import { site } from "@/lib/site";

/**
 * "Applications are closing" reminders to the mailing list's artist-interested
 * subscribers (the people who checked "I'm an artist" when they subscribed —
 * the ones who asked to hear about applying). Two date-driven sends: one week
 * before the application deadline, and the day before. Anyone who has already
 * applied this cycle is left alone. Same claim/skip machinery as the market-
 * week reminders, so it's idempotent, admin-cancelable, and visible in the
 * Email & Text schedule.
 */
export type ApplicationReminderKind = "week" | "day";

const KINDS: ApplicationReminderKind[] = ["week", "day"];

/** YYYY-MM-DD in the event's timezone for "closesAt minus N days". */
function closesMinusDays(days: number): string {
  const d = new Date(site.applications.closesAt);
  d.setUTCDate(d.getUTCDate() - days);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(d);
}

const COPY: Record<ApplicationReminderKind, { subject: string; heading: string; lead: string }> = {
  week: {
    subject: `One week left to apply to the ${site.name}`,
    heading: "One week left to apply",
    lead: `Applications for the ${site.event.year} ${site.name} close on ${site.applications.closesLabel}. If you've been meaning to apply, this is a good week to do it.`,
  },
  day: {
    subject: `Applications close tomorrow — ${site.name}`,
    heading: "Last call: applications close tomorrow",
    lead: `Tomorrow, ${site.applications.closesLabel}, is the final day to apply to the ${site.event.year} ${site.name}. It takes about ten minutes.`,
  },
};

function buildInner(kind: ApplicationReminderKind) {
  const c = COPY[kind];
  const hr = `<hr style="border:none;border-top:1px solid #ece5d6;margin:0" />`;
  return `
    <h1 style="margin:0 0 12px;font-size:24px">${c.heading}</h1>
    <p style="margin:0 0 14px;line-height:1.6">${c.lead}</p>
    <p style="margin:0 0 8px;line-height:1.6"><strong>Have these ready:</strong></p>
    <ul style="margin:0 0 18px;padding-left:20px;line-height:1.7">
      <li>Your name, email, and mobile number</li>
      <li>The medium and a short description of your work</li>
      <li>${site.applications.minPhotos}–${site.applications.maxPhotos} photos of your work</li>
    </ul>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 6px">
      <tr><td style="padding:2px 0;line-height:1.6"><strong>Deadline:</strong> ${site.applications.closesLabel}</td></tr>
      <tr><td style="padding:2px 0;line-height:1.6"><strong>Market:</strong> ${site.event.days[0].label} &amp; ${site.event.days[1].label}, ${site.event.year} at ${site.host.name}</td></tr>
      <tr><td style="padding:2px 0;line-height:1.6"><strong>Booth fee:</strong> low, and no application fee</td></tr>
    </table>
    ${hr}
    <p style="margin:28px 0;text-align:center">
      <a href="${site.url}/apply" style="display:inline-block;background:#3f7d22;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:700">Apply now →</a>
    </p>
    ${hr}
    <p style="margin:18px 0 0;line-height:1.6;color:#6b6457;font-size:14px">Already applied? Then you're all set — thank you, and we'll be in touch after the jury reviews.</p>`;
}

/**
 * The two date-driven sends with their target dates + subjects. Shared by the
 * cron runner and the admin schedule view so they can never disagree.
 */
export function applicationReminderPlan() {
  return [
    { kind: "week" as const, sendDate: closesMinusDays(7), subject: COPY.week.subject },
    { kind: "day" as const, sendDate: closesMinusDays(1), subject: COPY.day.subject },
  ];
}

export function applicationReminderFlagKey(kind: ApplicationReminderKind) {
  return `application_reminder:${site.event.year}:${kind}`;
}

/** Render the email HTML for preview (no send). */
export function previewApplicationReminderHtml(kind: ApplicationReminderKind = "week") {
  return emailShell(buildInner(kind), { unsubscribeUrl: `${site.url}/unsubscribe?token=preview` });
}

/** Emails (lowercased) that already applied in the active cycle — don't nag them. */
async function alreadyAppliedEmails(): Promise<Set<string>> {
  const cycle = await db.query.cycles.findFirst({ where: eq(cycles.isActive, true) });
  if (!cycle) return new Set();
  const rows = await db
    .select({ email: sql<string>`lower(${applications.email})` })
    .from(applications)
    .where(and(eq(applications.cycleId, cycle.id)));
  return new Set(rows.map((r) => r.email));
}

/**
 * If today (America/New_York) is a reminder day, send it once to artist-
 * interested subscribers who haven't applied yet. Claims a per-year/per-kind
 * settings flag atomically so a duplicate cron run can't double-send, and
 * releases the claim if nothing actually went out.
 */
export async function runApplicationReminders(now: Date = new Date()) {
  const todayET = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(now);
  const due = applicationReminderPlan().find((p) => p.sendDate === todayET);
  if (!due) return { sent: 0, note: `no application reminder due (${todayET})` };
  const kind = due.kind;
  const flagKey = applicationReminderFlagKey(kind);

  const skip = await db.query.settings.findFirst({ where: eq(settings.key, `send_skip:${flagKey}`) });
  if (skip?.value) return { sent: 0, note: `${kind} canceled by admin` };

  if (!resend) return { sent: 0, note: "resend not configured" };

  const [claimed] = await db
    .insert(settings)
    .values({ key: flagKey, value: true })
    .onConflictDoNothing({ target: settings.key })
    .returning({ key: settings.key });
  if (!claimed) return { sent: 0, note: `${kind} already sent` };

  const applied = await alreadyAppliedEmails();
  const recipients = (await segmentRecipients("artists")).filter(
    (r) => !applied.has(r.email.toLowerCase()),
  );
  const inner = buildInner(kind);

  let sent = 0;
  for (const r of recipients) {
    try {
      await resend.emails.send({
        from: EMAIL_FROM,
        to: r.email,
        subject: COPY[kind].subject,
        html: emailShell(inner, { unsubscribeUrl: `${site.url}/unsubscribe?token=${r.token}` }),
      });
      sent++;
    } catch (e) {
      console.error(`[application-reminders] send failed for ${r.email}:`, e);
    }
  }

  if (sent === 0 && recipients.length > 0) {
    // Nothing went out (e.g. a Resend outage) — release the claim so the next run retries.
    await db.delete(settings).where(eq(settings.key, flagKey));
  }

  return { kind, recipients: recipients.length, skippedAlreadyApplied: applied.size, sent };
}

export { KINDS as APPLICATION_REMINDER_KINDS };
