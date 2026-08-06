import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { contactMessages } from "@/db/schema";
import { sendContactEmail } from "@/lib/emails";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(200),
  message: z.string().trim().min(10).max(5000),
  // Spam traps (not real fields):
  company: z.string().optional(), // honeypot — must stay empty
  renderedAt: z.number().optional(), // client render time for the time-trap
});

const ok = () => NextResponse.json({ ok: true });

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please fill in your name, a valid email, and a message (10+ characters)." },
      { status: 422 },
    );
  }
  const { name, email, message, company, renderedAt } = parsed.data;

  // 1) Honeypot: real users never fill this. Silently accept, don't send.
  if (company && company.trim() !== "") return ok();

  // 2) Time-trap: bots submit instantly. Require >= 3s on the form.
  if (typeof renderedAt === "number" && Date.now() - renderedAt < 3000) return ok();

  // 3) Content heuristic: link-stuffed messages are almost always spam.
  const linkCount = (message.match(/https?:\/\//gi) ?? []).length;
  if (linkCount >= 5) return ok();

  // 4) Per-IP rate limit: max 3 messages per 10 minutes.
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  const since = new Date(Date.now() - 10 * 60_000);
  const recent = await db
    .select({ id: contactMessages.id })
    .from(contactMessages)
    .where(and(eq(contactMessages.ip, ip), gt(contactMessages.createdAt, since)));
  if (recent.length >= 3) {
    return NextResponse.json(
      { error: "You've sent a few messages already — please try again a little later." },
      { status: 429 },
    );
  }

  // Save a durable record, then forward by email (email failure shouldn't lose it).
  await db.insert(contactMessages).values({ name, email, message, ip });
  await sendContactEmail(name, email, message);

  return ok();
}
