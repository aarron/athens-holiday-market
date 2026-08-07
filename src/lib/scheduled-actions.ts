"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { settings } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-auth";
import { site } from "@/lib/site";

/**
 * Map a scheduled-send row id to its "skip" settings key. The cron runners
 * check these keys and no-op when one is set, so canceling here truly prevents
 * the send. Year-scoped so canceling one year never affects a future one.
 */
function skipKey(id: string): string | null {
  if (id.startsWith("event:")) return `send_skip:event_reminder:${site.event.year}:${id.slice("event:".length)}`;
  if (id === "npr-flagpole") return `send_skip:npr_flagpole_reminder:${site.event.year}`;
  if (id.startsWith("artist:")) return `send_skip:artist_reminder:${id.slice("artist:".length)}`;
  return null;
}

export async function cancelSend(id: string) {
  await requireAdmin();
  const key = skipKey(id);
  if (!key) return { ok: false, error: "Unknown scheduled send." };
  await db
    .insert(settings)
    .values({ key, value: true })
    .onConflictDoUpdate({ target: settings.key, set: { value: true, updatedAt: new Date() } });
  revalidatePath("/admin/broadcasts");
  return { ok: true };
}

export async function restoreSend(id: string) {
  await requireAdmin();
  const key = skipKey(id);
  if (!key) return { ok: false, error: "Unknown scheduled send." };
  await db.delete(settings).where(eq(settings.key, key));
  revalidatePath("/admin/broadcasts");
  return { ok: true };
}
