import "server-only";
import { and, eq, inArray, like } from "drizzle-orm";
import { db } from "@/db";
import { applications, artists, broadcasts, cycles, settings } from "@/db/schema";
import { subscriberListSize, countForSegment } from "@/lib/broadcast-data";
import { eventReminderPlan } from "@/lib/event-reminders";
import { applicationReminderPlan, applicationReminderFlagKey } from "@/lib/application-reminders";
import {
  ARTIST_LOGISTICS_COPY_APPROVED,
  artistLogisticsPlan,
  artistLogisticsFlagKey,
  artistLogisticsRecipients,
} from "@/lib/artist-logistics";
import { boothFeeDueDates, boothFeeReminderSkipKey } from "@/lib/booth-fee";
import { NONPROFIT_CATEGORY } from "@/lib/nonprofit";
import { site } from "@/lib/site";

export type SendStatus = "sent" | "scheduled" | "window" | "missed" | "pending-decision" | "canceled" | "none-needed" | "needs-approval";

export type ScheduledSend = {
  id: string;
  topic: string;
  channel: "Email" | "SMS" | "Email + SMS";
  audience: string;
  when: string;
  whenSort: string;
  status: SendStatus;
  sentAt: string | null;
  /** Canceled from this tab (false: managed elsewhere, e.g. a broadcast). */
  cancelable?: boolean;
};

/** Emails that go out when something happens, rather than on a date. */
export type TriggeredSend = { topic: string; trigger: string; audience: string; channel: "Email" | "SMS" };

export type ArtistReminderRow = {
  id: string;
  name: string;
  email: string;
  when: string;
  status: SendStatus;
  sentAt: string | null;
};

const DAY = 24 * 60 * 60 * 1000;

/** Today's date in the event's timezone, as YYYY-MM-DD, for calendar comparisons. */
function todayET(now: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(now);
}

/** YYYY-MM-DD → "Mon, Dec 8, 2026" (rendered in UTC so the date never drifts). */
function fmtDate(dateStr: string) {
  const d = new Date(`${dateStr}T12:00:00Z`);
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short", month: "short", day: "numeric", year: "numeric", timeZone: "UTC",
  }).format(d);
}

/**
 * Everything that can send automatically, assembled for the admin so no email
 * or text goes out without being visible here first. Reads the same schedule
 * logic and sent-flags the cron uses, so the view can't drift from reality.
 */
export async function getScheduledSends(now: Date = new Date()) {
  const today = todayET(now);
  const listSize = await subscriberListSize();

  // Read every relevant "already sent" flag in one query.
  const plan = eventReminderPlan();
  const eventKeys = plan.map((p) => `event_reminder:${site.event.year}:${p.kind}`);
  const nprKey = `npr_flagpole_reminder:${site.event.year}`;
  const applyPlan = applicationReminderPlan();
  const applyKeys = applyPlan.map((p) => applicationReminderFlagKey(p.kind));
  const logisticsPlan = artistLogisticsPlan();
  const logisticsKeys = logisticsPlan.map((p) => artistLogisticsFlagKey(p.kind));
  const flagRows = await db.query.settings.findMany({
    where: inArray(settings.key, [...eventKeys, nprKey, ...applyKeys, ...logisticsKeys]),
  });
  const flags = new Map(flagRows.map((r) => [r.key, r]));

  // Admin "skip" flags — a canceled send never fires (honored by the cron).
  const skipRows = await db.query.settings.findMany({ where: like(settings.key, "send_skip:%") });
  const skips = new Set(skipRows.filter((r) => r.value).map((r) => r.key));

  // ── Event reminders → mailing list ──
  const announcements: ScheduledSend[] = plan.map((p) => {
    const flag = flags.get(`event_reminder:${site.event.year}:${p.kind}`);
    const sent = !!flag?.value;
    const canceled = skips.has(`send_skip:event_reminder:${site.event.year}:${p.kind}`);
    const status: SendStatus = sent
      ? "sent"
      : canceled ? "canceled"
      : p.sendDate >= today ? "scheduled" : "missed";
    return {
      id: `event:${p.kind}`,
      topic: p.subject,
      channel: "Email",
      audience: `Mailing list · ${listSize} subscriber${listSize === 1 ? "" : "s"}`,
      when: fmtDate(p.sendDate),
      whenSort: p.sendDate,
      status,
      sentAt: sent && flag?.updatedAt ? flag.updatedAt.toISOString() : null,
    };
  });

  // ── Application-deadline reminders → artist-interested subscribers ──
  const artistListSize = await countForSegment("artists");
  for (const p of applyPlan) {
    const key = applicationReminderFlagKey(p.kind);
    const flag = flags.get(key);
    const sent = !!flag?.value;
    const canceled = skips.has(`send_skip:${key}`);
    const status: SendStatus = sent
      ? "sent"
      : canceled ? "canceled"
      : p.sendDate >= today ? "scheduled" : "missed";
    announcements.push({
      id: `apply:${p.kind}`,
      topic: p.subject,
      channel: "Email",
      audience: `Artists on the mailing list · ${artistListSize} subscriber${artistListSize === 1 ? "" : "s"} (minus anyone who already applied)`,
      when: fmtDate(p.sendDate),
      whenSort: p.sendDate,
      status,
      sentAt: sent && flag?.updatedAt ? flag.updatedAt.toISOString() : null,
    });
  }

  // ── NPR + Flagpole ad reminder → Jamie ──
  const nprFlag = flags.get(nprKey);
  const nprSent = !!nprFlag?.value;
  const nprCanceled = skips.has(`send_skip:npr_flagpole_reminder:${site.event.year}`);
  const nprStart = `${site.event.year}-11-08`;
  const nprEnd = `${site.event.year}-11-14`;
  const nprStatus: SendStatus = nprSent
    ? "sent"
    : nprCanceled ? "canceled"
    : today < nprStart ? "scheduled"
    : today <= nprEnd ? "window"
    : "missed";
  announcements.push({
    id: "npr-flagpole",
    topic: "Reminder to submit NPR + Flagpole ads (a person still does this)",
    channel: "Email + SMS",
    audience: [
      "NPR/Flagpole ad contact",
      process.env.NPR_REMINDER_EMAIL,
      process.env.NPR_REMINDER_PHONE,
    ].filter(Boolean).join(" · "),
    when: `Nov 8–14, ${site.event.year}`,
    whenSort: nprStart,
    status: nprStatus,
    sentAt: nprSent && nprFlag?.updatedAt ? nprFlag.updatedAt.toISOString() : null,
  });

  // ── Setup-details emails → every accepted artist ──
  const cycle = await db.query.cycles.findFirst({ where: eq(cycles.isActive, true) });
  const acceptedCount = (await artistLogisticsRecipients()).length;
  for (const p of logisticsPlan) {
    const key = artistLogisticsFlagKey(p.kind);
    const flag = flags.get(key);
    const sent = !!flag?.value;
    const canceled = skips.has(`send_skip:${key}`);
    announcements.push({
      id: `logistics:${p.kind}`,
      topic: `${p.subject}${p.kind === "week" ? ` (with ${site.artistInfo.contact.name}'s number for questions)` : ""}`,
      channel: "Email",
      audience: `Accepted artists · ${acceptedCount}`,
      when: fmtDate(p.sendDate),
      whenSort: p.sendDate,
      status: sent
        ? "sent"
        : canceled ? "canceled"
        : !ARTIST_LOGISTICS_COPY_APPROVED ? "needs-approval"
        : p.sendDate >= today ? "scheduled" : "missed",
      sentAt: sent && flag?.updatedAt ? flag.updatedAt.toISOString() : null,
    });
  }

  // ── Booth-fee reminders → accepted artists who haven't paid ──
  if (cycle) {
    const fees = await db
      .select({ paid: applications.boothFeePaid, n: applications.boothFeeReminderCount, cat: applications.mediumCategory, invoicedAt: applications.boothFeeInvoicedAt })
      .from(applications)
      .where(and(eq(applications.cycleId, cycle.id), eq(applications.status, "accepted")));
    const billed = fees.filter((f) => f.cat !== NONPROFIT_CATEGORY && f.invoicedAt);
    const unpaid = billed.filter((f) => !f.paid).length;
    const { due, dayAfter } = boothFeeDueDates(site.event.year);
    const rows = [
      { kind: "due" as const, date: due, stage: 1, topic: `Your ${site.name} booth fee is due today` },
      { kind: "overdue" as const, date: dayAfter, stage: 2, topic: `Your ${site.name} booth fee was due yesterday` },
    ];
    for (const r of rows) {
      const sentTo = billed.filter((f) => f.n >= r.stage).length;
      const canceled = skips.has(boothFeeReminderSkipKey(r.kind));
      const status: SendStatus = canceled
        ? "canceled"
        : today < r.date ? "scheduled"
        : sentTo > 0 ? "sent"
        : today === r.date ? "scheduled"
        : "none-needed";
      announcements.push({
        id: `booth-fee:${r.kind}`,
        topic: r.topic,
        channel: "Email",
        audience:
          status === "sent"
            ? `Artists who hadn't paid · sent to ${sentTo}`
            : `Artists who haven't paid by then · ${unpaid} unpaid now`,
        when: fmtDate(r.date),
        whenSort: r.date,
        status,
        sentAt: null,
      });
    }
  }

  // ── One-off broadcasts an admin scheduled ──
  const queued = await db.query.broadcasts.findMany({ where: eq(broadcasts.status, "scheduled") });
  for (const b of queued) {
    if (!b.scheduledFor) continue;
    const date = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(b.scheduledFor);
    announcements.push({
      id: `broadcast:${b.id}`,
      topic: b.subject,
      channel: "Email",
      audience: `Broadcast · ${b.segment} (cancel it from the broadcast list)`,
      when: fmtDate(date),
      whenSort: date,
      status: "scheduled",
      sentAt: null,
      cancelable: false,
    });
  }

  announcements.sort((a, b) => a.whenSort.localeCompare(b.whenSort));

  // ── Artist-page reminders → per accepted artist, ~7 days after acceptance ──
  const artistReminders: ArtistReminderRow[] = [];
  if (cycle) {
    const rows = await db
      .select({
        id: applications.id,
        email: applications.email,
        name: applications.name,
        decisionSentAt: applications.decisionSentAt,
        pageReminderSentAt: applications.pageReminderSentAt,
        artistId: artists.id,
        published: artists.published,
        pending: artists.pendingContent,
      })
      .from(applications)
      .leftJoin(artists, eq(artists.applicationId, applications.id))
      .where(and(eq(applications.cycleId, cycle.id), eq(applications.status, "accepted")));

    for (const r of rows) {
      const rid = `artist:${r.id}`;
      if (r.pageReminderSentAt) {
        artistReminders.push({
          id: rid, name: r.name, email: r.email, when: "7 days after acceptance",
          status: "sent", sentAt: r.pageReminderSentAt.toISOString(),
        });
        continue;
      }
      // Only artists without a live page (and not awaiting review) get nudged.
      const needs = !r.artistId || (r.published === false && r.pending == null);
      if (!needs) continue;
      const canceled = skips.has(`send_skip:artist_reminder:${r.id}`);
      if (canceled) {
        artistReminders.push({ id: rid, name: r.name, email: r.email, when: "—", status: "canceled", sentAt: null });
      } else if (!r.decisionSentAt) {
        artistReminders.push({
          id: rid, name: r.name, email: r.email, when: "7 days after their acceptance email",
          status: "pending-decision", sentAt: null,
        });
      } else {
        const due = new Date(r.decisionSentAt.getTime() + 7 * DAY);
        artistReminders.push({
          id: rid, name: r.name, email: r.email, when: fmtDate(due.toISOString().slice(0, 10)),
          status: "scheduled", sentAt: null,
        });
      }
    }
    // Upcoming first, sent last; within each, soonest first by name is fine.
    artistReminders.sort((a, b) => Number(a.status === "sent") - Number(b.status === "sent"));
  }

  const triggered: TriggeredSend[] = [
    { topic: "Application received", trigger: "Right after someone applies", audience: "The applicant", channel: "Email" },
    { topic: "Booth-fee invoice (from PayPal)", trigger: "Right after acceptance emails are sent", audience: "Accepted artists (not non-profits)", channel: "Email" },
    { topic: "Payment received", trigger: "When PayPal reports a booth fee paid", audience: "That artist", channel: "Email" },
    { topic: "Your share images are ready", trigger: "When an artist's page goes live or is submitted, or 7 days after acceptance", audience: "Each accepted artist, once", channel: "Email" },
    { topic: "Spotlight images for posting", trigger: "First acceptance send of the year", audience: "Social posting team", channel: "Email" },
    { topic: "Artist page to review", trigger: "When an artist submits their page", audience: "Admins", channel: "Email" },
    { topic: "Your artist page is live", trigger: "When an admin approves an artist's page", audience: "That artist", channel: "Email" },
    { topic: "Contact form message", trigger: "When someone uses the Contact form", audience: "The team inbox", channel: "Email" },
    { topic: "Text opt-in record", trigger: "When someone signs up for texts", audience: "The team inbox (consent record)", channel: "Email" },
  ];

  return {
    cronSchedule: "Runs daily at 10:00am ET (9:00am after daylight saving ends)",
    announcements,
    triggered,
    artistReminders,
    artistReminderSubject: `Don't forget to set up your ${site.name} artist page`,
  };
}
