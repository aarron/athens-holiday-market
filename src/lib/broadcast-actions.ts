"use server";

import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { broadcasts, broadcastRecipients, subscribers } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-auth";
import { resend, EMAIL_FROM } from "@/lib/resend";
import { emailShell, renderMarkdown } from "@/lib/email-template";
import { segmentRecipients } from "@/lib/broadcast-data";
import { deliverBroadcast, personalize, unsubUrl, unsubApi } from "@/lib/broadcast-send";

const SEGMENT_VALUES = ["all", "artists", "non_artists", "accepted", "waitlisted", "applicants"] as const;

const composeSchema = z.object({
  // Optional internal label (e.g. "2026 Acceptance email"); blank → stored null.
  name: z.string().trim().max(120).optional().transform((v) => v || undefined),
  subject: z.string().trim().min(1, "Add a subject.").max(200),
  body: z.string().trim().min(1, "Write a message.").max(20000),
  segment: z.enum(SEGMENT_VALUES),
  // When set, send/schedule reuses this draft's row instead of creating a new one.
  draftId: z.number().int().optional(),
});

const scheduleSchema = composeSchema.extend({
  scheduledFor: z.string().min(1, "Pick a date and time."),
});

// Draft save is lenient — the point is to not lose work in progress.
const draftSchema = z.object({
  id: z.number().int().optional(),
  name: z.string().trim().max(120).optional().transform((v) => v || undefined),
  subject: z.string().trim().max(200).default(""),
  body: z.string().trim().max(20000).default(""),
  segment: z.enum(SEGMENT_VALUES),
});

const resendOneSchema = z.object({
  broadcastId: z.number().int(),
  email: z.string().trim().toLowerCase().email("That doesn't look like an email address."),
  name: z.string().trim().max(120).optional(),
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

  const { name, subject, body, segment, draftId } = parsed.data;
  const recipients = await segmentRecipients(segment);
  if (recipients.length === 0) return { error: "No active recipients in that segment." };

  // Reuse the draft's row when sending from a saved draft; otherwise insert.
  const bc = draftId
    ? (await db
        .update(broadcasts)
        .set({ name, subject, body, segment, status: "sending", recipientCount: recipients.length })
        .where(and(eq(broadcasts.id, draftId), eq(broadcasts.status, "draft")))
        .returning({ id: broadcasts.id }))[0]
    : (await db
        .insert(broadcasts)
        .values({ name, subject, body, segment, status: "sending", recipientCount: recipients.length })
        .returning({ id: broadcasts.id }))[0];
  if (!bc) return { error: "That draft is no longer available." };

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

  const { name, subject, body, segment, scheduledFor, draftId } = parsed.data;
  const when = new Date(scheduledFor);
  if (isNaN(when.getTime())) return { error: "That date didn't parse." };
  if (when.getTime() < Date.now() - 60_000) return { error: "Pick a time in the future." };

  const recipients = await segmentRecipients(segment);
  const values = { name, subject, body, segment, status: "scheduled" as const, scheduledFor: when, recipientCount: recipients.length };
  const bc = draftId
    ? (await db
        .update(broadcasts)
        .set(values)
        .where(and(eq(broadcasts.id, draftId), eq(broadcasts.status, "draft")))
        .returning({ id: broadcasts.id }))[0]
    : (await db.insert(broadcasts).values(values).returning({ id: broadcasts.id }))[0];
  if (!bc) return { error: "That draft is no longer available." };

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

/** Save (create or update) an email draft without sending. Lenient by design. */
export async function saveDraft(input: z.input<typeof draftSchema>) {
  await requireAdmin();
  const parsed = draftSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  const { id, name, subject, body, segment } = parsed.data;
  if (!subject && !body) return { error: "Add a subject or a message before saving." };

  if (id) {
    const [row] = await db
      .update(broadcasts)
      .set({ name, subject, body, segment })
      .where(and(eq(broadcasts.id, id), eq(broadcasts.status, "draft")))
      .returning({ id: broadcasts.id });
    if (!row) return { error: "That draft can no longer be edited." };
    revalidatePath("/admin/broadcasts");
    return { ok: true, id: row.id };
  }

  const [row] = await db
    .insert(broadcasts)
    .values({ name, subject, body, segment, status: "draft", recipientCount: 0 })
    .returning({ id: broadcasts.id });
  revalidatePath("/admin/broadcasts");
  return { ok: true, id: row.id };
}

/**
 * Send an already-sent broadcast to one more person — e.g. a last-minute artist
 * added after all the comms went out. Records them as a recipient so their
 * opens/clicks roll into the same report.
 */
export async function resendBroadcastToOne(input: z.input<typeof resendOneSchema>) {
  await requireAdmin();
  const parsed = resendOneSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the address." };
  if (!resend) return { error: "Email isn't configured." };

  const { broadcastId, email, name } = parsed.data;
  const bc = await db.query.broadcasts.findFirst({ where: eq(broadcasts.id, broadcastId) });
  if (!bc) return { error: "That email no longer exists." };
  if (bc.status !== "sent") return { error: "You can only add recipients to emails that have already gone out." };

  // Reuse the subscriber's name + unsubscribe token when they're on the list;
  // otherwise send with a generic unsubscribe link (no personal one-click header).
  const sub = await db.query.subscribers.findFirst({
    where: eq(sql`lower(${subscribers.email})`, email),
  });
  const toName = name || sub?.name || null;
  const token = sub?.unsubscribeToken ?? "preview";

  const html = emailShell(renderMarkdown(personalize(bc.body, toName)), {
    unsubscribeUrl: unsubUrl(token),
  });
  try {
    const res = await resend.emails.send({
      from: EMAIL_FROM,
      to: email,
      subject: bc.subject,
      html,
      headers: sub
        ? {
            "List-Unsubscribe": `<${unsubApi(token)}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          }
        : undefined,
    });
    const resendId = (res as { data?: { id?: string } })?.data?.id ?? null;
    await db.insert(broadcastRecipients).values({ broadcastId, email, resendId, status: "sent" });
    await db
      .update(broadcasts)
      .set({ recipientCount: sql`${broadcasts.recipientCount} + 1` })
      .where(eq(broadcasts.id, broadcastId));
    revalidatePath("/admin/broadcasts");
    return { ok: true, email };
  } catch {
    return { error: "Couldn't send to that address." };
  }
}

/** Delete a draft (only while still a draft). */
export async function deleteDraft(id: number) {
  await requireAdmin();
  await db.delete(broadcasts).where(and(eq(broadcasts.id, id), eq(broadcasts.status, "draft")));
  revalidatePath("/admin/broadcasts");
  return { ok: true };
}
