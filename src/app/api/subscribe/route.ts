import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "crypto";
import { db } from "@/db";
import { subscribers } from "@/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  email: z.string().email(),
  name: z.string().max(120).optional(),
  isArtist: z.boolean().optional(),
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 422 });
  }

  const { email, name, isArtist } = parsed.data;

  // Idempotent: re-subscribing just refreshes the artist flag / name.
  await db
    .insert(subscribers)
    .values({
      email: email.toLowerCase(),
      name: name ?? null,
      isArtist: isArtist ?? false,
      status: "pending",
      unsubscribeToken: randomUUID(),
      source: "website",
    })
    .onConflictDoUpdate({
      target: subscribers.email,
      set: { isArtist: isArtist ?? false, name: name ?? null },
    });

  // TODO(Phase 1): send double opt-in confirmation via Resend.
  return NextResponse.json({ ok: true });
}
