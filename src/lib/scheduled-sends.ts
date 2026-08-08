import "server-only";
import { and, eq, inArray, like } from "drizzle-orm";
import { db } from "@/db";
import { applications, artists, cycles, settings } from "@/db/schema";
import { subscriberListSize } from "@/lib/broadcast-data";
import { eventReminderPlan } from "@/lib/event-reminders";
import { site } from "@/lib/site";

export type SendStatus = "sent" | "scheduled" | "window" | "missed" | "pending-decision" | "canceled";

export type ScheduledSend = {
  id: string;
  topic: string;
  channel: "Email" | "SMS" | "Email + SMS";
  audience: string;
  when: string;
  whenSort: string;
  status: SendStatus;
  sentAt: string | null;
};

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
  const flagRows = await db.query.settings.findMany({
    where: inArray(settings.key, [...eventKeys, nprKey]),
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

  announcements.sort((a, b) => a.whenSort.localeCompare(b.whenSort));

  // ── Artist-page reminders → per accepted artist, ~7 days after acceptance ──
  const cycle = await db.query.cycles.findFirst({ where: eq(cycles.isActive, true) });
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

  return {
    cronSchedule: "Runs daily at 9:00am ET",
    announcements,
    artistReminders,
    artistReminderSubject: `Don't forget to set up your ${site.name} artist page`,
  };
}
