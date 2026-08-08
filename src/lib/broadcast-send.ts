import "server-only";
import { and, eq, lte } from "drizzle-orm";
import { db } from "@/db";
import { broadcasts, broadcastRecipients } from "@/db/schema";
import { resend, EMAIL_FROM } from "@/lib/resend-client";
import { emailShell, renderMarkdown } from "@/lib/email-shell";
import { segmentRecipients } from "@/lib/broadcast-data";
import { publicEnv } from "@/lib/env";
import { chunk, personalize } from "@/lib/send-util";

export const unsubUrl = (token: string) => `${publicEnv.siteUrl}/unsubscribe?token=${token}`;
export const unsubApi = (token: string) => `${publicEnv.siteUrl}/api/unsubscribe?token=${token}`;

// Re-exported for broadcast-actions, which shares this personalizer.
export { personalize };

/** Send an existing broadcast row to its segment and mark it sent. Shared by
 *  the immediate "Send now" action and the scheduled-broadcast cron. */
export async function deliverBroadcast(bc: {
  id: number;
  subject: string;
  body: string;
  segment: string;
}) {
  if (!resend) return { error: "Email isn't configured." as const };

  const recipients = await segmentRecipients(bc.segment);
  if (recipients.length === 0) {
    await db
      .update(broadcasts)
      .set({ status: "sent", sentAt: new Date(), recipientCount: 0 })
      .where(eq(broadcasts.id, bc.id));
    return { ok: true as const, count: 0 };
  }

  await db
    .update(broadcasts)
    .set({ status: "sending", recipientCount: recipients.length })
    .where(eq(broadcasts.id, bc.id));

  const recRows: { broadcastId: number; email: string; resendId: string | null; status: string }[] = [];
  for (const batch of chunk(recipients, 100)) {
    const payload = batch.map((r) => ({
      from: EMAIL_FROM,
      to: r.email,
      subject: bc.subject,
      html: emailShell(renderMarkdown(personalize(bc.body, r.name)), { unsubscribeUrl: unsubUrl(r.token) }),
      headers: {
        "List-Unsubscribe": `<${unsubApi(r.token)}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    }));
    try {
      const res = await resend.batch.send(payload);
      const items =
        ((res as { data?: { data?: { id: string }[] } | { id: string }[] }).data as
          | { data?: { id: string }[] }
          | { id: string }[]
          | undefined) ?? [];
      const ids = Array.isArray(items) ? items : (items.data ?? []);
      batch.forEach((r, i) =>
        recRows.push({ broadcastId: bc.id, email: r.email, resendId: ids[i]?.id ?? null, status: "sent" }),
      );
    } catch {
      batch.forEach((r) =>
        recRows.push({ broadcastId: bc.id, email: r.email, resendId: null, status: "failed" }),
      );
    }
  }

  for (const c of chunk(recRows, 500)) await db.insert(broadcastRecipients).values(c);
  // Reconcile the stored count to the rows actually written, so recipientCount
  // always matches the receipt rows even if a batch failed mid-send.
  await db
    .update(broadcasts)
    .set({ status: "sent", sentAt: new Date(), recipientCount: recRows.length })
    .where(eq(broadcasts.id, bc.id));
  return { ok: true as const, count: recRows.length };
}

/** Cron: deliver any scheduled broadcast whose time has arrived. */
export async function runScheduledBroadcasts(now: Date = new Date()) {
  const due = await db.query.broadcasts.findMany({
    where: and(eq(broadcasts.status, "scheduled"), lte(broadcasts.scheduledFor, now)),
  });
  let sent = 0;
  for (const bc of due) {
    // Atomically claim the row: only proceed if THIS run flipped it out of
    // "scheduled". A concurrent cron run gets no row back and skips it, so a
    // scheduled broadcast can never be delivered twice.
    const [claimed] = await db
      .update(broadcasts)
      .set({ status: "sending" })
      .where(and(eq(broadcasts.id, bc.id), eq(broadcasts.status, "scheduled")))
      .returning({ id: broadcasts.id });
    if (!claimed) continue;
    try {
      const r = await deliverBroadcast(bc);
      if ("ok" in r) sent++;
    } catch (e) {
      console.error(`[scheduled-broadcast] #${bc.id} failed:`, e);
    }
  }
  return { due: due.length, sent };
}
