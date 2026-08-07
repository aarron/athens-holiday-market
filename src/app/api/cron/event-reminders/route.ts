import { NextResponse } from "next/server";
import { runEventReminders } from "@/lib/event-reminders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Daily cron (see vercel.json). Sends the mailing-list reminder 2 days before
 * and on each event day; no-ops on every other day. CRON_SECRET protected.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const result = await runEventReminders();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    console.error("[cron] event-reminders failed:", e);
    return NextResponse.json({ error: "Reminder run failed" }, { status: 500 });
  }
}
