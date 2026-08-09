import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { applications, artists, cycles } from "@/db/schema";
import { sendArtistSocialKit } from "@/lib/emails";

/**
 * One-time "your share kit is ready" email to accepted artists. Fires as soon as
 * they've engaged with their page — submitted an edit for review or gone live —
 * or ~7 days after their decision email if they haven't, whichever comes first.
 * Stamps `socialKitEmailSentAt` so nobody is emailed twice.
 */
export async function runArtistSocialKitEmails(now: Date = new Date()) {
  const cycle = await db.query.cycles.findFirst({ where: eq(cycles.isActive, true) });
  if (!cycle) return { checked: 0, sent: 0, note: "no active cycle" };

  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const rows = await db
    .select({
      id: applications.id,
      email: applications.email,
      name: applications.name,
      decisionSentAt: applications.decisionSentAt,
      published: artists.published,
      submittedAt: artists.submittedAt,
    })
    .from(applications)
    .leftJoin(artists, eq(artists.applicationId, applications.id))
    .where(
      and(
        eq(applications.cycleId, cycle.id),
        eq(applications.status, "accepted"),
        isNull(applications.socialKitEmailSentAt),
      ),
    );

  // Ready if they've built their page (published) or submitted an edit for
  // review, OR it's been ~7 days since their decision email went out.
  const edited = (r: (typeof rows)[number]) => r.published === true || r.submittedAt != null;
  const aged = (r: (typeof rows)[number]) => r.decisionSentAt != null && r.decisionSentAt <= sevenDaysAgo;
  const needing = rows.filter((r) => r.email && !r.email.endsWith("@no-email.invalid") && (edited(r) || aged(r)));

  let sent = 0;
  for (const r of needing) {
    const res = await sendArtistSocialKit(r.email, r.name);
    // Only stamp if actually handed to Resend, so an unconfigured email env
    // retries later rather than burning the one-shot.
    if (!(res && "skipped" in res)) {
      await db
        .update(applications)
        .set({ socialKitEmailSentAt: now })
        .where(eq(applications.id, r.id));
      sent++;
    }
  }

  return { checked: rows.length, sent };
}
