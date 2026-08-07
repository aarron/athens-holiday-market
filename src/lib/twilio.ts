import "server-only";
import twilio from "twilio";

const sid = process.env.TWILIO_ACCOUNT_SID;
const token = process.env.TWILIO_AUTH_TOKEN;
const from = process.env.TWILIO_FROM_NUMBER;

export const twilioConfigured = Boolean(sid && token && from);

let client: ReturnType<typeof twilio> | null = null;
function getClient() {
  if (!twilioConfigured) throw new Error("Twilio is not configured");
  client ??= twilio(sid!, token!);
  return client;
}

/**
 * Normalize a loose US phone string to E.164 (+1XXXXXXXXXX), or null if it
 * can't be used. Handles "706-555-0100", "(706) 555 0100", "17065550100", etc.
 */
export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (trimmed.startsWith("+") && digits.length >= 11 && digits.length <= 15) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}

/** Send a single SMS. Returns the Twilio message SID. */
export async function sendSms(to: string, body: string): Promise<string> {
  const msg = await getClient().messages.create({ from: from!, to, body });
  return msg.sid;
}
