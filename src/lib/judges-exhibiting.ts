"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { settings } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-auth";
import { logAdminEvent } from "@/lib/audit";

/**
 * How many judges are exhibiting in a cycle, as entered by an admin.
 *
 * Judges who exhibit are supposed to show up as direct-add applications once
 * they build their artist page, but they often don't until late — so the
 * booth tally would undercount. This stored number lets admins say "4 judges
 * are exhibiting" up front; the dashboard uses whichever is larger, this or
 * the judges actually recorded.
 */
const key = (cycleId: number) => `judges_exhibiting:${cycleId}`;

export async function getJudgesExhibiting(cycleId: number): Promise<number | null> {
  const row = await db.query.settings.findFirst({ where: eq(settings.key, key(cycleId)) });
  const n = typeof row?.value === "number" ? row.value : null;
  return n != null && Number.isInteger(n) && n >= 0 ? n : null;
}

export async function setJudgesExhibiting(cycleId: number, count: number) {
  await requireAdmin();
  if (!Number.isInteger(count) || count < 0 || count > 50) return { error: "Enter a whole number from 0 to 50." };
  await db
    .insert(settings)
    .values({ key: key(cycleId), value: count })
    .onConflictDoUpdate({ target: settings.key, set: { value: count, updatedAt: new Date() } });
  await logAdminEvent({
    action: "booths.judges_exhibiting",
    targetType: "cycle",
    targetId: cycleId,
    summary: `Set judges exhibiting to ${count}`,
  });
  revalidatePath("/admin");
  return { ok: true };
}
