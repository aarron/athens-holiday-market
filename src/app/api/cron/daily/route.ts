import { NextResponse } from "next/server";
import { runArtistPageReminders } from "@/lib/artist-reminders";
import { runEventReminders } from "@/lib/event-reminders";
import { runNprFlagpoleReminder } from "@/lib/npr-flagpole-reminder";
import { runScheduledBroadcasts } from "@/lib/broadcast-send";
import { runBoothFeeReminders } from "@/lib/booth-fee";
import { runProspectScoutingCron } from "@/lib/prospect-research";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Prospect auto-scout advances within its own time budget; give the cron room.
export const maxDuration = 300;

/**
 * Single daily cron (see vercel.json). Runs each scheduled task; most no-op on
 * any given day. One task failing never blocks the others. CRON_SECRET-protected
 * (Vercel sends it as a Bearer token automatically).
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tasks = [
    ["artistReminders", runArtistPageReminders],
    ["eventReminders", runEventReminders],
    ["nprFlagpole", runNprFlagpoleReminder],
    ["scheduledBroadcasts", runScheduledBroadcasts],
    ["boothFeeReminders", runBoothFeeReminders],
    ["prospectScouting", runProspectScoutingCron],
  ] as const;

  const results: Record<string, unknown> = {};
  for (const [name, run] of tasks) {
    try {
      results[name] = await run();
    } catch (e) {
      console.error(`[cron:${name}] failed:`, e);
      results[name] = { error: e instanceof Error ? e.message : String(e) };
    }
  }
  return NextResponse.json({ ok: true, ...results });
}
