"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { applications, textSends } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-auth";
import { getActiveCycle } from "@/lib/admin-data";
import { judgePhoneList } from "@/lib/env";
import { logAdminEvent } from "@/lib/audit";
import { normalizePhone, sendSms, twilioConfigured } from "@/lib/twilio";

export type TextRecipient = { id: number; name: string; phone: string };

/** Accepted artists in the active cycle who opted in and have a usable number. */
async function acceptedArtistRecipients(cycleId: number): Promise<{
  recipients: TextRecipient[];
  noPhone: { id: number; name: string }[];
}> {
  // Only text accepted artists who explicitly opted in — required for SMS compliance.
  const rows = await db
    .select({ id: applications.id, name: applications.name, phone: applications.phone })
    .from(applications)
    .where(
      and(
        eq(applications.cycleId, cycleId),
        eq(applications.status, "accepted"),
        eq(applications.smsConsent, true),
      ),
    );

  const recipients: TextRecipient[] = [];
  const noPhone: { id: number; name: string }[] = [];
  for (const r of rows) {
    const phone = normalizePhone(r.phone);
    if (phone) recipients.push({ id: r.id, name: r.name, phone });
    else noPhone.push({ id: r.id, name: r.name });
  }
  return { recipients, noPhone };
}

/** Valid, de-duplicated judge phone numbers from config (E.164). */
function judgePhones(): string[] {
  const seen = new Set<string>();
  for (const raw of judgePhoneList) {
    const p = normalizePhone(raw);
    if (p) seen.add(p);
  }
  return [...seen];
}

export type TextAudience = {
  configured: boolean;
  year: number | null;
  artistCount: number;
  artistNoPhone: number;
  judgeCount: number;
};

/** Recipient-group counts for the Text tab UI. */
export async function getTextAudience(): Promise<TextAudience> {
  await requireAdmin();
  const cycle = await getActiveCycle();
  const artists = cycle
    ? await acceptedArtistRecipients(cycle.id)
    : { recipients: [], noPhone: [] };
  return {
    configured: twilioConfigured,
    year: cycle?.year ?? null,
    artistCount: artists.recipients.length,
    artistNoPhone: artists.noPhone.length,
    judgeCount: judgePhones().length,
  };
}

export type TextSelection = {
  message: string;
  artists?: boolean;
  judges?: boolean;
  /** Free-form comma/space/newline-separated extra numbers. */
  other?: string;
  /** Per-confirmation idempotency token — a re-submit with the same token is a
   *  no-op, so a double-click can't re-blast the list. */
  clientToken: string;
};

/**
 * Send a text to the selected recipient groups. Numbers are normalized and
 * de-duplicated across groups, so a judge who is also in "Other" is texted once.
 * Idempotent per clientToken and recorded in text_sends for audit.
 */
export async function sendEventText(input: TextSelection) {
  const admin = await requireAdmin();
  if (!twilioConfigured) return { ok: false as const, error: "Twilio is not configured." };
  if (!input.clientToken) return { ok: false as const, error: "Missing confirmation token." };

  const body = (input.message ?? "").trim();
  if (!body) return { ok: false as const, error: "Message is empty." };

  const phones = new Set<string>();

  if (input.artists) {
    const cycle = await getActiveCycle();
    if (cycle) {
      const { recipients } = await acceptedArtistRecipients(cycle.id);
      for (const r of recipients) phones.add(r.phone);
    }
  }
  if (input.judges) {
    for (const p of judgePhones()) phones.add(p);
  }
  const invalidOther: string[] = [];
  if (input.other?.trim()) {
    for (const raw of input.other.split(/[,\n]+/).map((s) => s.trim()).filter(Boolean)) {
      const p = normalizePhone(raw);
      if (p) phones.add(p);
      else invalidOther.push(raw);
    }
  }

  if (invalidOther.length) {
    return { ok: false as const, error: `Not a valid US number: ${invalidOther.join(", ")}` };
  }
  if (phones.size === 0) {
    return { ok: false as const, error: "No recipients selected." };
  }

  // Claim this send by its token. A duplicate submit (same token) inserts
  // nothing and returns no row, so we bail without re-texting anyone.
  const [claim] = await db
    .insert(textSends)
    .values({
      clientToken: input.clientToken,
      actorEmail: admin.email,
      message: body,
      recipientCount: phones.size,
    })
    .onConflictDoNothing({ target: textSends.clientToken })
    .returning({ id: textSends.id });
  if (!claim) {
    return { ok: true as const, sent: 0, failed: [], duplicate: true as const };
  }

  let sent = 0;
  const failed: string[] = [];
  // Sequential to stay well under Twilio's per-second limits for a small list.
  for (const phone of phones) {
    try {
      await sendSms(phone, body);
      sent += 1;
    } catch {
      failed.push(phone);
    }
  }

  await db
    .update(textSends)
    .set({ sentCount: sent, failedCount: failed.length })
    .where(eq(textSends.id, claim.id));
  await logAdminEvent({
    action: "sms.send",
    targetType: "text_send",
    targetId: claim.id,
    summary: `Texted ${sent} number${sent === 1 ? "" : "s"}${failed.length ? ` (${failed.length} failed)` : ""}: "${body.slice(0, 60)}${body.length > 60 ? "…" : ""}"`,
  });

  return { ok: true as const, sent, failed };
}
