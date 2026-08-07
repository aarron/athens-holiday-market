import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { artists, settings } from "@/db/schema";
import { resend, EMAIL_FROM } from "@/lib/resend";
import { emailShell } from "@/lib/email-template";
import { segmentRecipients } from "@/lib/broadcast-data";
import { site, mapsHref } from "@/lib/site";

type Kind = "pre" | "day1" | "day2";

/** A curated handful of artist photos to feature, each linking to its page. */
async function featuredArtists(limit = 6) {
  const rows = await db.query.artists.findMany({
    where: eq(artists.published, true),
    with: { photos: { orderBy: (p, { asc }) => [asc(p.position)], limit: 1 } },
    limit: 24,
  });
  return rows
    .filter((a) => a.photos[0]?.url)
    .slice(0, limit)
    .map((a) => ({ name: a.name, slug: a.slug, photoUrl: a.photos[0]!.url }));
}

function ctaBlock() {
  return `
    <p style="margin:8px 0 4px">
      <a href="${site.url}/artists" style="display:inline-block;background:#3f7d22;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:700">Meet the artists →</a>
      &nbsp;
      <a href="${mapsHref()}" style="color:#17a898;text-decoration:none;font-weight:600">Get directions</a>
    </p>`;
}

const COPY: Record<Kind, { subject: string; heading: string; lead: string }> = {
  pre: {
    subject: `This week: the ${site.name} 🎁`,
    heading: "This Thursday and Friday",
    lead: `${site.name} at ${site.host.name} is almost here — two festive evenings of one-of-a-kind gifts from local artists.`,
  },
  day1: {
    subject: `Tonight: the ${site.name}, ${site.event.timeLabel}`,
    heading: "It's tonight! 🎉",
    lead: `Come wander the twinkling courtyard tonight and shop handmade holiday gifts straight from the artists who made them.`,
  },
  day2: {
    subject: `Last night: the ${site.name}, ${site.event.timeLabel}`,
    heading: "Final night — tonight!",
    lead: `Tonight's your last chance to shop local, handmade holiday gifts at the market. Don't miss it.`,
  },
};

function photoGrid(list: { name: string; slug: string; photoUrl: string }[]) {
  if (!list.length) return "";
  // Fixed square cells so the grid reads as a clean, uniform block.
  const cell = (a: { name: string; slug: string; photoUrl: string }) => `
      <td width="33.33%" style="padding:3px">
        <a href="${site.url}/artists/${a.slug}" style="text-decoration:none;display:block">
          <img src="${a.photoUrl}" alt="${a.name}" width="150" height="150"
               style="width:100%;height:150px;object-fit:cover;border-radius:8px;display:block" />
        </a>
      </td>`;
  // Only render full rows of 3 so the grid never has a ragged last row.
  const rows: string[] = [];
  const trimmed = list.slice(0, list.length - (list.length % 3));
  for (let i = 0; i < trimmed.length; i += 3) {
    rows.push(`<tr>${trimmed.slice(i, i + 3).map(cell).join("")}</tr>`);
  }
  if (!rows.length) return "";
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:14px 0">${rows.join("")}</table>`;
}

function buildInner(kind: Kind, list: { name: string; slug: string; photoUrl: string }[]) {
  const c = COPY[kind];
  return `
    <h1 style="margin:0 0 12px;font-size:24px">${c.heading}</h1>
    <p style="margin:0 0 14px;line-height:1.6">${c.lead}</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 6px">
      <tr><td style="padding:2px 0;line-height:1.6"><strong>When:</strong> ${site.event.days[0].label} &amp; ${site.event.days[1].label}, ${site.event.timeLabel}</td></tr>
      <tr><td style="padding:2px 0;line-height:1.6"><strong>Where:</strong> ${site.location.name}, ${site.location.street}, ${site.location.city}</td></tr>
      <tr><td style="padding:2px 0;line-height:1.6"><strong>What:</strong> Local, handmade holiday gifts from Athens artists</td></tr>
    </table>
    ${ctaBlock()}
    ${photoGrid(list)}`;
}

/** Render the reminder email HTML for preview (no send). */
export async function previewEventReminderHtml(kind: Kind = "pre") {
  const list = await featuredArtists(9);
  return emailShell(buildInner(kind, list), { unsubscribeUrl: `${site.url}/unsubscribe?token=preview` });
}

/**
 * Decide if today (America/New_York) is a reminder day, and if so send the
 * short reminder to the mailing list once. Sends 2 days before, and on each
 * event day. Tracks a per-cycle/per-day flag in settings so it never repeats.
 */
export async function runEventReminders(now: Date = new Date()) {
  const day1 = site.event.days[0].date;
  const day2 = site.event.days[1].date;
  const preD = new Date(day1 + "T12:00:00Z");
  preD.setUTCDate(preD.getUTCDate() - 2);
  const preDate = preD.toISOString().slice(0, 10);

  const todayET = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(now);
  const kind: Kind | null =
    todayET === preDate ? "pre" : todayET === day1 ? "day1" : todayET === day2 ? "day2" : null;
  if (!kind) return { sent: 0, note: `no reminder due (${todayET})` };

  const flagKey = `event_reminder:${site.event.year}:${kind}`;
  const existing = await db.query.settings.findFirst({ where: eq(settings.key, flagKey) });
  if (existing?.value) return { sent: 0, note: `${kind} already sent` };

  if (!resend) return { sent: 0, note: "resend not configured" };

  const list = await featuredArtists(9);
  const inner = buildInner(kind, list);
  const recipients = await segmentRecipients("all");

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
      console.error(`[event-reminders] send failed for ${r.email}:`, e);
    }
  }

  await db
    .insert(settings)
    .values({ key: flagKey, value: true })
    .onConflictDoUpdate({ target: settings.key, set: { value: true, updatedAt: new Date() } });

  return { kind, recipients: recipients.length, sent };
}
