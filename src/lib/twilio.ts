import "server-only";
import twilio from "twilio";
import { normalizePhone } from "./phone";

export { normalizePhone };

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

/** Send a single SMS. Returns the Twilio message SID. */
export async function sendSms(to: string, body: string): Promise<string> {
  const msg = await getClient().messages.create({ from: from!, to, body });
  return msg.sid;
}
