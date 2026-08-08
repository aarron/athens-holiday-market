"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { cycles, prospects } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-auth";
import { logAdminEvent } from "@/lib/audit";
import { createResearchBatch, runProspectResearch } from "@/lib/prospect-research";

const statusSchema = z.object({
  id: z.number(),
  status: z.enum(["new", "shortlisted", "maybe", "passed"]),
});

/**
 * Record a triage decision for one prospect. Triage is high-volume and fully
 * reversible, so it isn't written to the admin audit log (invites, which are
 * outward-facing, are). Setting back to "new" clears the triage stamp — that's
 * how the deck's undo restores an untouched card.
 */
export async function setProspectStatus(input: z.input<typeof statusSchema>) {
  const admin = await requireAdmin();
  const parsed = statusSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid request." };
  const { id, status } = parsed.data;

  await db
    .update(prospects)
    .set({
      status,
      triagedAt: status === "new" ? null : new Date(),
      triagedBy: status === "new" ? null : admin.email,
      updatedAt: new Date(),
    })
    .where(eq(prospects.id, id));

  revalidatePath("/admin/prospects");
  return { ok: true as const };
}

const researchSchema = z.object({
  geoScope: z.enum(["athens", "southeast", "none"]).default("southeast"),
  targetCount: z.coerce.number().int().min(10).max(120).default(60),
});

/**
 * Kick off an auto-scout run for the active cycle. The batch is created
 * immediately (so the UI can show it) and the actual research runs in the
 * background via `after()` within a time budget; the daily cron finishes any
 * remainder. Spends on model + web-search calls, so it's audit-logged.
 */
export async function startProspectResearch(input: z.input<typeof researchSchema>) {
  const admin = await requireAdmin();
  const parsed = researchSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid research options." };
  const { geoScope, targetCount } = parsed.data;

  const cycle = await db.query.cycles.findFirst({ where: eq(cycles.isActive, true) });
  if (!cycle) return { error: "Set an active cycle first." };

  const batchId = await createResearchBatch(cycle.id, { geoScope, targetCount, createdBy: admin.email });
  await logAdminEvent({
    action: "prospect.research",
    targetType: "cycle",
    targetId: cycle.id,
    summary: `Started auto-scout (${geoScope}, target ${targetCount})`,
  });

  // Run in the background so the action returns promptly; the daily cron picks
  // up whatever doesn't finish within the budget.
  after(async () => {
    try {
      await runProspectResearch(batchId, { timeBudgetMs: 180_000 });
    } catch (e) {
      console.error("[research] background run failed:", e);
    }
  });

  revalidatePath("/admin/prospects");
  return { ok: true as const, batchId };
}
