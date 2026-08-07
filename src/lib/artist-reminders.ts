import "server-only";
import { and, eq, isNull, lte } from "drizzle-orm";
import { db } from "@/db";
import { applications, artists, cycles } from "@/db/schema";
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

  // Needs a nudge if they have no artist page yet, or it's an unsubmitted,
  // unpublished draft. Skip anyone published or awaiting review (pending).
  const needing = rows.filter(
    (r) => !r.artistId || (r.published === false && r.pending == null),
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
