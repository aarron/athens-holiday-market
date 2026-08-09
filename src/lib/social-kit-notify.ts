import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { settings, cycles } from "@/db/schema";
import { publishSpotlightZip } from "@/lib/social-kit";
import { sendJudgeSocialKit, SOCIAL_POSTING_TEAM } from "@/lib/emails";

const sentKey = (cycleId: number) => `posting_team_kit_sent:${cycleId}`;

/**
 * Rebuild the branded spotlight zip for the active cycle and cache it to Blob
 * (no email). Safe to call repeatedly — overwrites the same stable Blob path.
 * Backs the manual "Rebuild images" admin button.
 */
export async function rebuildActiveSpotlightZip(): Promise<{ ok: true; url: string; count: number } | { error: string }> {
  const cycle = await db.query.cycles.findFirst({ where: eq(cycles.isActive, true) });
  if (!cycle) return { error: "No active cycle." };
  try {
    const { url, count } = await publishSpotlightZip(cycle.id);
    return { ok: true, url, count };
  } catch (e) {
    console.error("[social-kit] rebuildActiveSpotlightZip failed:", e);
    return { error: "Couldn't rebuild the kit. Please try again." };
  }
}

/**
 * Refresh the cached zip and, the first time only, email the posting team the
 * download link. Later calls (e.g. a second wave of acceptances) silently
 * refresh the zip so the stable link always reflects the full lineup.
 * Best-effort: never throws to its caller.
 */
export async function refreshAndNotifyPostingTeam(cycleId: number): Promise<{ url: string; count: number; emailed: boolean } | null> {
  try {
    const { url, count } = await publishSpotlightZip(cycleId);
    const key = sentKey(cycleId);
    const already = await db.query.settings.findFirst({ where: eq(settings.key, key) });
    if (already) return { url, count, emailed: false };

    const res = await sendJudgeSocialKit(SOCIAL_POSTING_TEAM, url);
    // Only mark as sent if we actually handed it to Resend, so an unconfigured
    // email env retries on the next accepted-batch send instead of going silent.
    const emailed = !(res && ("skipped" in res || "error" in res));
    if (emailed) {
      await db
        .insert(settings)
        .values({ key, value: { url, at: new Date().toISOString(), count } })
        .onConflictDoNothing();
    }
    return { url, count, emailed };
  } catch (e) {
    console.error("[social-kit] refreshAndNotifyPostingTeam failed:", e);
    return null;
  }
}

/** Force-send the posting-team kit email for the active cycle (manual admin
 *  button), rebuilding the zip first so the link is current. */
export async function emailPostingTeamNow(): Promise<{ ok: true; url: string; count: number } | { error: string }> {
  const cycle = await db.query.cycles.findFirst({ where: eq(cycles.isActive, true) });
  if (!cycle) return { error: "No active cycle." };
  try {
    const { url, count } = await publishSpotlightZip(cycle.id);
    const res = await sendJudgeSocialKit(SOCIAL_POSTING_TEAM, url);
    if (res && "error" in res) return { error: "Couldn't send. Please try again." };
    // Record that the team has now been notified for this cycle.
    await db
      .insert(settings)
      .values({ key: sentKey(cycle.id), value: { url, at: new Date().toISOString(), count } })
      .onConflictDoUpdate({ target: settings.key, set: { value: { url, at: new Date().toISOString(), count } } });
    return { ok: true, url, count };
  } catch (e) {
    console.error("[social-kit] emailPostingTeamNow failed:", e);
    return { error: "Couldn't build the kit. Please try again." };
  }
}
