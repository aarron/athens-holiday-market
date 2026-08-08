"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { cycles, prospects, prospectImages } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-auth";
import { logAdminEvent } from "@/lib/audit";
import { cleanEmail, cleanWebsite, cleanInstagram } from "@/lib/prospects";
import { createResearchBatch, runProspectResearch } from "@/lib/prospect-research";
import { enrichProspectImages } from "@/lib/prospect-images";

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

const contactSchema = z.object({
  id: z.number().int(),
  email: z.string().trim().max(200),
  website: z.string().trim().max(300),
  instagram: z.string().trim().max(200),
});

/**
 * Manually set a prospect's contact details (email, website, Instagram) — e.g.
 * after tracking them down. Values are normalized the same way imports are.
 * Adding a website with no photos yet kicks off a background image enrichment.
 */
export async function updateProspectContact(input: z.input<typeof contactSchema>) {
  await requireAdmin();
  const parsed = contactSchema.safeParse(input);
  if (!parsed.success) return { error: "Check the details." };
  const { id, email, website, instagram } = parsed.data;

  const values = {
    email: cleanEmail(email),
    website: cleanWebsite(website),
    instagram: cleanInstagram(instagram),
    updatedAt: new Date(),
  };
  await db.update(prospects).set(values).where(eq(prospects.id, id));

  // If they just added a website and the card has no photos, try to fill some.
  if (values.website) {
    const hasImage = await db.query.prospectImages.findFirst({
      where: eq(prospectImages.prospectId, id),
      columns: { id: true },
    });
    if (!hasImage) {
      after(async () => {
        try {
          await enrichProspectImages(id, values.website!, 4);
        } catch (e) {
          console.error("[prospect] enrich-on-edit failed:", e);
        }
      });
    }
  }

  revalidatePath("/admin/prospects");
  return { ok: true as const, email: values.email, website: values.website, instagram: values.instagram };
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
