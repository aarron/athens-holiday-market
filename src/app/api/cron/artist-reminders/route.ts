import { NextResponse } from "next/server";
import { runArtistPageReminders } from "@/lib/artist-reminders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Daily cron (see vercel.json). Vercel sends `Authorization: Bearer $CRON_SECRET`
 * automatically when CRON_SECRET is configured; we reject anything else so the
 * route can't be triggered by the public.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runArtistPageReminders();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    console.error("[cron] artist-reminders failed:", e);
    return NextResponse.json({ error: "Reminder run failed" }, { status: 500 });
  }
}
