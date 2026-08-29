import { NextResponse } from "next/server";
import { z } from "zod";
import { sendSmsOptIn } from "@/lib/emails";
import { SMS_CONSENT_TEXT } from "@/lib/sms";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  name: z.string().trim().max(120).optional().default(""),
  phone: z.string().trim().min(7).max(30),
  consent: z.boolean(),
  // Spam traps (not real fields):
  company: z.string().optional(), // honeypot — must stay empty
  renderedAt: z.number().optional(), // client render time for the time-trap
});

const ok = () => NextResponse.json({ ok: true });

/** Normalize a US mobile number to E.164 (+1XXXXXXXXXX) when we can; otherwise
 *  return the digits with a leading +. Keeps the record readable and unambiguous. */
function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/[^\d]/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (digits.length >= 10 && digits.length <= 15) return `+${digits}`;
  return null;
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please enter a valid mobile number." }, { status: 422 });
  }
  const { name, phone, consent, company, renderedAt } = parsed.data;

  // Consent is required — the box must be checked to opt in.
  if (!consent) {
    return NextResponse.json(
      { error: "Please check the box to agree to receive text updates." },
      { status: 422 },
    );
  }

  const normalized = normalizePhone(phone);
  if (!normalized) {
    return NextResponse.json({ error: "Please enter a valid mobile number." }, { status: 422 });
  }

  // 1) Honeypot: real users never fill this. Silently accept, don't record.
  if (company && company.trim() !== "") return ok();
  // 2) Time-trap: bots submit instantly. Require >= 3s on the form.
  if (typeof renderedAt === "number" && Date.now() - renderedAt < 3000) return ok();

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  // Record the consent (who, when, and exactly what they agreed to) by
  // forwarding it to the organizer inbox. Numbers can't be texted until the
  // A2P campaign is approved, so there's no confirmation SMS yet.
  await sendSmsOptIn({
    name,
    phone: normalized,
    consentText: SMS_CONSENT_TEXT,
    when: new Date().toISOString(),
    ip,
  });

  return ok();
}
