"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { applications } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-auth";
import { resend, EMAIL_FROM } from "@/lib/resend";
import { emailShell, renderMarkdown } from "@/lib/email-template";

const schema = z.object({
  cycleId: z.number(),
  group: z.enum(["accepted", "waitlist"]),
  subject: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(20000),
});

const GROUP_STATUSES: Record<string, ("accepted" | "waitlisted" | "rejected")[]> = {
  accepted: ["accepted"],
  waitlist: ["waitlisted", "rejected"],
};

function chunk<T>(arr: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

function personalize(body: string, name: string) {
  const first = (name || "").trim().split(/\s+/)[0] || "there";
  return body
    .replace(/\{\{\s*first_name\s*\}\}/gi, first)
    .replace(/\{\{\s*name\s*\}\}/gi, name || "there");
}

export async function sendDecisionBatch(input: z.input<typeof schema>) {
  await requireAdmin();
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { error: "Please add a subject and message." };
  if (!resend) return { error: "Email isn't configured." };

  const { cycleId, group, subject, body } = parsed.data;
  const apps = await db
    .select({ id: applications.id, name: applications.name, email: applications.email })
    .from(applications)
    .where(and(eq(applications.cycleId, cycleId), inArray(applications.status, GROUP_STATUSES[group])));

  const valid = apps.filter((a) => a.email && !a.email.endsWith("@no-email.invalid"));
  if (valid.length === 0) return { error: "No recipients with a valid email address." };

  const now = new Date();
  let sent = 0;
  for (const batch of chunk(valid, 100)) {
    const payload = batch.map((a) => ({
      from: EMAIL_FROM,
      to: a.email,
      subject,
      html: emailShell(renderMarkdown(personalize(body, a.name))),
    }));
    try {
      const res = await resend.batch.send(payload);
      const raw = (res as { data?: { data?: { id: string }[] } | { id: string }[] }).data;
      const ids = Array.isArray(raw) ? raw : (raw?.data ?? []);
      for (let i = 0; i < batch.length; i++) {
        await db
          .update(applications)
          .set({
            decisionGroup: group,
            decisionResendId: ids[i]?.id ?? null,
            decisionEmailStatus: "sent",
            decisionSentAt: now,
          })
          .where(eq(applications.id, batch[i].id));
        sent++;
      }
    } catch {
      for (const a of batch) {
        await db
          .update(applications)
          .set({ decisionGroup: group, decisionEmailStatus: "failed", decisionSentAt: now })
          .where(eq(applications.id, a.id));
      }
    }
  }

  revalidatePath("/admin/decisions");
  revalidatePath("/admin");
  return { ok: true, count: sent };
}
