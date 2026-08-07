import "server-only";
import { and, eq, isNull, like, lte } from "drizzle-orm";
import { db } from "@/db";
import { applications, artists, cycles, settings } from "@/db/schema";
import { sendArtistPageReminder } from "@/lib/emails";

/**
 * One-time nudge to accepted artists who haven't set up their page yet.
 * Targets the active cycle, fires ~7 days after their decision email went out,
 * skips anyone already published or with a submission awaiting review, and
 * stamps `pageReminderSentAt` so nobody is emailed twice.
 */
export async function runArtistPageReminders(now: Date = new Date()) {
  const cycle = await db.query.cycles.findFirst({ where: eq(cycles.isActive, true) });
  if (!cycle) return { checked: 0, sent: 0, note: "no active cycle" };

  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const rows = await db
    .select({
      id: applications.id,
      email: applications.email,
      name: applications.name,
      artistId: artists.id,
      published: artists.published,
      pending: artists.pendingContent,
    })
    .from(applications)
    .leftJoin(artists, eq(artists.applicationId, applications.id))
    .where(
      and(
        eq(applications.cycleId, cycle.id),
        eq(applications.status, "accepted"),
        isNull(applications.pageReminderSentAt),
        lte(applications.decisionSentAt, sevenDaysAgo),
      ),
    );

  // Admin-canceled reminders (send_skip:artist_reminder:<applicationId>).
  const skipRows = await db.query.settings.findMany({
    where: like(settings.key, "send_skip:artist_reminder:%"),
  });
  const skipped = new Set(
    skipRows.filter((r) => r.value).map((r) => Number(r.key.split(":").pop())),
  );

  // Needs a nudge if they have no artist page yet, or it's an unsubmitted,
  // unpublished draft. Skip anyone published, awaiting review, or canceled.
  const needing = rows.filter(
    (r) => !skipped.has(r.id) && (!r.artistId || (r.published === false && r.pending == null)),
  );

  let sent = 0;
  for (const r of needing) {
    const res = await sendArtistPageReminder(r.email, r.name);
    // Only stamp if we actually handed it to Resend (don't burn the one-shot
    // when email is unconfigured, so it retries once configured).
    if (!(res && "skipped" in res)) {
      await db
        .update(applications)
        .set({ pageReminderSentAt: now })
        .where(eq(applications.id, r.id));
      sent++;
    }
  }

  return { checked: rows.length, sent };
}
