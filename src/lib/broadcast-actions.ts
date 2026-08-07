"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { broadcasts } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-auth";
import { resend, EMAIL_FROM } from "@/lib/resend";
import { emailShell, renderMarkdown } from "@/lib/email-template";
import { segmentRecipients } from "@/lib/broadcast-data";
import { deliverBroadcast, personalize, unsubUrl } from "@/lib/broadcast-send";

const SEGMENT_VALUES = ["all", "artists", "non_artists", "accepted", "waitlisted", "applicants"] as const;

const composeSchema = z.object({
  subject: z.string().trim().min(1, "Add a subject.").max(200),
  body: z.string().trim().min(1, "Write a message.").max(20000),
  segment: z.enum(SEGMENT_VALUES),
});

const scheduleSchema = composeSchema.extend({
  scheduledFor: z.string().min(1, "Pick a date and time."),
});

const testSchema = z.object({
  subject: z.string().trim().min(1, "Add a subject."),
  body: z.string().trim().min(1, "Write a message."),
  to: z.array(z.string().trim().email("That doesn't look like an email address.")).max(10).optional(),
});

/** Send a preview of the broadcast. Defaults to the signed-in admin; an explicit
 *  list of addresses (e.g. yourself + a collaborator) overrides that. */
export async function sendTestEmail(input: { subject: string; body: string; to?: string[] }) {
  const admin = await requireAdmin();
  const parsed = testSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  if (!resend) return { error: "Email isn't configured." };

  // De-duplicated recipient list; fall back to the admin's own address.
  const recipients = [...new Set((parsed.data.to ?? []).map((e) => e.toLowerCase()))];
  const to = recipients.length ? recipients : [admin.email];

  const html = emailShell(renderMarkdown(personalize(parsed.data.body, admin.name)), {
    unsubscribeUrl: unsubUrl("preview"),
  });
  try {
    // Send individually so recipients don't see each other's addresses.
    for (const addr of to) {
      await resend.emails.send({
        from: EMAIL_FROM,
        to: addr,
        subject: `[Test] ${parsed.data.subject}`,
        html,
      });
    }
    return { ok: true, to: to.join(", "), count: to.length };
  } catch {
    return { error: "Couldn't send the test email." };
  }
}

/** Send the broadcast to everyone in the chosen segment, right now. */
export async function sendBroadcast(input: z.input<typeof composeSchema>) {
  await requireAdmin();
  const parsed = composeSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  if (!resend) return { error: "Email isn't configured." };

  const { subject, body, segment } = parsed.data;
  const recipients = await segmentRecipients(segment);
  if (recipients.length === 0) return { error: "No active recipients in that segment." };

  const [bc] = await db
    .insert(broadcasts)
    .values({ subject, body, segment, status: "sending", recipientCount: recipients.length })
    .returning({ id: broadcasts.id });

  const r = await deliverBroadcast({ id: bc.id, subject, body, segment });
  revalidatePath("/admin/broadcasts");
  return "ok" in r ? { ok: true, id: bc.id, count: r.count } : { error: r.error };
}

/** Schedule the broadcast for a future date — saved as "scheduled"; the daily
 *  cron delivers it once its time has passed. Editable/cancelable until then. */
export async function scheduleBroadcast(input: z.input<typeof scheduleSchema>) {
  await requireAdmin();
  const parsed = scheduleSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form." };

  const { subject, body, segment, scheduledFor } = parsed.data;
  const when = new Date(scheduledFor);
  if (isNaN(when.getTime())) return { error: "That date didn't parse." };
  if (when.getTime() < Date.now() - 60_000) return { error: "Pick a time in the future." };

  const recipients = await segmentRecipients(segment);
  const [bc] = await db
    .insert(broadcasts)
    .values({ subject, body, segment, status: "scheduled", scheduledFor: when, recipientCount: recipients.length })
    .returning({ id: broadcasts.id });

  revalidatePath("/admin/broadcasts");
  return { ok: true, id: bc.id, count: recipients.length, scheduledFor: when.toISOString() };
}

/** Cancel a scheduled broadcast before it sends (only while still scheduled). */
export async function cancelScheduledBroadcast(id: number) {
  await requireAdmin();
  await db.delete(broadcasts).where(and(eq(broadcasts.id, id), eq(broadcasts.status, "scheduled")));
  revalidatePath("/admin/broadcasts");
  return { ok: true };
}
