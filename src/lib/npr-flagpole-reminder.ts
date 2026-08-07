import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { settings } from "@/db/schema";
import { sendNprFlagpoleReminder } from "@/lib/emails";
import { normalizePhone, sendSms, twilioConfigured } from "@/lib/twilio";
import { site } from "@/lib/site";

// Human task that has slipped in past years — remind Jamie (a person does it).
const JAMIE_EMAIL = "redacted@example.com";
const JAMIE_PHONE = "706-555-0000";

/**
 * Fire once during the second week of November (8th–14th, America/New_York):
 * email + text Jamie to submit ad info to NPR and The Flagpole. A per-year
 * settings flag guarantees it's sent at most once.
 */
export async function runNprFlagpoleReminder(now: Date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(now);
  const month = Number(parts.find((p) => p.type === "month")?.value);
  const day = Number(parts.find((p) => p.type === "day")?.value);
  const year = parts.find((p) => p.type === "year")?.value;
  if (month !== 11 || day < 8 || day > 14) return { sent: false, note: "not in reminder window" };

  const flagKey = `npr_flagpole_reminder:${year}`;
  const existing = await db.query.settings.findFirst({ where: eq(settings.key, flagKey) });
  if (existing?.value) return { sent: false, note: "already sent this year" };

  // Admin canceled this reminder from the Email & Text page.
  const skip = await db.query.settings.findFirst({ where: eq(settings.key, `send_skip:${flagKey}`) });
  if (skip?.value) return { sent: false, note: "canceled by admin" };

  const emailRes = await sendNprFlagpoleReminder(JAMIE_EMAIL);
  const emailOk = !(emailRes && "skipped" in emailRes) && !(emailRes && "error" in emailRes);

  let smsOk = false;
  if (twilioConfigured) {
    const phone = normalizePhone(JAMIE_PHONE);
    if (phone) {
      try {
        await sendSms(
          phone,
          `Reminder from ${site.name}: it's time to submit our ad info to NPR and The Flagpole for the December market. This one has to be done by a person — please don't let it slip!`,
        );
        smsOk = true;
      } catch (e) {
        console.error("[npr-flagpole] SMS failed:", e);
      }
    }
  }

  // Only claim the once-per-year flag if something actually went out, so a
  // misconfigured run retries the next day rather than silently no-op'ing.
  if (emailOk || smsOk) {
    await db
      .insert(settings)
      .values({ key: flagKey, value: true })
      .onConflictDoUpdate({ target: settings.key, set: { value: true, updatedAt: new Date() } });
  }

  return { sent: emailOk || smsOk, email: emailOk, sms: smsOk };
}
