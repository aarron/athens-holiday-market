"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { applications } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-auth";
import { getActiveCycle } from "@/lib/admin-data";
import { normalizePhone, sendSms, twilioConfigured } from "@/lib/twilio";

export type TextRecipient = { id: number; name: string; phone: string };

/** Accepted artists in the active cycle who have a usable mobile number. */
export async function getTextRecipients(): Promise<{
  recipients: TextRecipient[];
  noPhone: { id: number; name: string }[];
  configured: boolean;
}> {
  await requireAdmin();
  const cycle = await getActiveCycle();
  if (!cycle) return { recipients: [], noPhone: [], configured: twilioConfigured };

  const rows = await db
    .select({ id: applications.id, name: applications.name, phone: applications.phone })
    .from(applications)
    .where(and(eq(applications.cycleId, cycle.id), eq(applications.status, "accepted")));

  const recipients: TextRecipient[] = [];
  const noPhone: { id: number; name: string }[] = [];
  for (const r of rows) {
    const phone = normalizePhone(r.phone);
    if (phone) recipients.push({ id: r.id, name: r.name, phone });
    else noPhone.push({ id: r.id, name: r.name });
  }
  return { recipients, noPhone, configured: twilioConfigured };
}

/** Send one test text to a single number, to confirm Twilio is wired up. */
export async function sendTestText(to: string, message: string) {
  await requireAdmin();
  if (!twilioConfigured) return { ok: false as const, error: "Twilio is not configured." };
  const phone = normalizePhone(to);
  if (!phone) return { ok: false as const, error: "That doesn't look like a valid US number." };
  if (!message.trim()) return { ok: false as const, error: "Message is empty." };
  try {
    await sendSms(phone, message.trim());
    return { ok: true as const, to: phone };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "Send failed." };
  }
}

/** Blast a text to every accepted artist in the active cycle with a valid number. */
export async function sendEventText(message: string) {
  await requireAdmin();
  if (!twilioConfigured) return { ok: false as const, error: "Twilio is not configured." };
  const body = message.trim();
  if (!body) return { ok: false as const, error: "Message is empty." };

  const { recipients } = await getTextRecipients();
  if (recipients.length === 0) return { ok: false as const, error: "No accepted artists with a valid number." };

  let sent = 0;
  const failed: string[] = [];
  // Sequential to stay well under Twilio's per-second limits for a small list.
  for (const r of recipients) {
    try {
      await sendSms(r.phone, body);
      sent += 1;
    } catch {
      failed.push(r.name);
    }
  }
  return { ok: true as const, sent, failed };
}
