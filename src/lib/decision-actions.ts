"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { and, eq, inArray, isNull, ne, or } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { applications } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-auth";
import { resend, EMAIL_FROM } from "@/lib/resend-client";
import { emailShell, renderMarkdown } from "@/lib/email-shell";
import { artistPageCtaBlock } from "@/lib/emails";
import { invoiceAcceptedWithoutInvoice, feeSharesForCycle, type FeeShare } from "@/lib/booth-fee";
import { fillBoothFee } from "@/lib/booth-fee-copy";
import { refreshAndNotifyPostingTeam } from "@/lib/social-kit-notify";
import { logAdminEvent } from "@/lib/audit";
import { chunk, personalize } from "@/lib/send-util";
import { NONPROFIT_CATEGORY } from "@/lib/nonprofit";

const schema = z.object({
  cycleId: z.number(),
  group: z.enum(["accepted", "nonprofit", "waitlist"]),
  subject: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(20000),
  // Off by default: only email applicants who haven't been notified yet, so a
  // repeat click or a late addition never re-emails the whole cohort. Opt in to
  // deliberately re-send to everyone (including already-notified).
  resendAll: z.boolean().optional().default(false),
});

const GROUP_STATUSES: Record<string, ("accepted" | "waitlisted" | "rejected")[]> = {
  accepted: ["accepted"],
  // Non-profits are accepted too, but get their own no-fee email (see below).
  nonprofit: ["accepted"],
  // Rejected applicants (didn't meet our terms) never get the waitlist email.
  waitlist: ["waitlisted"],
};


export async function sendDecisionBatch(input: z.input<typeof schema>) {
  await requireAdmin();
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { error: "Please add a subject and message." };
  if (!resend) return { error: "Email isn't configured." };

  const { cycleId, group, subject, body, resendAll } = parsed.data;
  const conds = [eq(applications.cycleId, cycleId), inArray(applications.status, GROUP_STATUSES[group])];
  // Default: skip anyone already notified. `decisionSentAt` is only set on a
  // successful send (see failure branch below), so failed sends are retried.
  if (!resendAll) conds.push(isNull(applications.decisionSentAt));
  // Non-profits are carved out of the regular acceptance email (and its
  // invoice) and get their own. NULL categories are regular artists.
  if (group === "nonprofit") conds.push(eq(applications.mediumCategory, NONPROFIT_CATEGORY));
  if (group === "accepted")
    conds.push(or(isNull(applications.mediumCategory), ne(applications.mediumCategory, NONPROFIT_CATEGORY))!);
  const apps = await db
    .select({ id: applications.id, name: applications.name, email: applications.email })
    .from(applications)
    .where(and(...conds));

  const valid = apps.filter((a) => a.email && !a.email.endsWith("@no-email.invalid"));
  if (valid.length === 0) {
    return {
      error: resendAll
        ? "No recipients with a valid email address."
        : "Everyone in this group has already been notified. Turn on “re-send to already-notified” to email them again.",
    };
  }

  // Each accepted artist's own fee (half for a shared booth) for {{booth_fee}}.
  const shares: Map<number, FeeShare> = group === "accepted" ? await feeSharesForCycle(cycleId) : new Map();

  const now = new Date();
  let sent = 0;
  for (const batch of chunk(valid, 100)) {
    const payload = batch.map((a) => ({
      from: EMAIL_FROM,
      to: a.email,
      subject,
      // Accepted artists always get the "build your page" CTA appended, so the
      // batch send matches the single decision email and gives a clear next step.
      html: emailShell(
        renderMarkdown(personalize(fillBoothFee(body, shares.get(a.id)), a.name)) +
          (group === "accepted" || group === "nonprofit" ? artistPageCtaBlock(a.email) : ""),
      ),
    }));
    try {
      const res = await resend.batch.send(payload);
      const raw = (res as { data?: { data?: { id: string }[] } | { id: string }[] }).data;
      const ids = Array.isArray(raw) ? raw : (raw?.data ?? []);
      // One HTTP round-trip for the whole chunk instead of N sequential UPDATEs.
      const updates = batch.map((a, i) =>
        db
          .update(applications)
          .set({
            decisionGroup: group,
            decisionResendId: ids[i]?.id ?? null,
            decisionEmailStatus: "sent",
            decisionSentAt: now,
          })
          .where(eq(applications.id, a.id)),
      );
      if (updates.length) await db.batch(updates as [(typeof updates)[number], ...typeof updates]);
      sent += batch.length;
    } catch {
      // Leave decisionSentAt NULL on failure so the applicant is retried on the
      // next send (the default query only skips successfully-notified people).
      const fails = batch.map((a) =>
        db
          .update(applications)
          .set({ decisionGroup: group, decisionEmailStatus: "failed" })
          .where(eq(applications.id, a.id)),
      );
      if (fails.length) await db.batch(fails as [(typeof fails)[number], ...typeof fails]);
    }
  }

  // Auto-send booth-fee invoices to the accepted group as they're notified.
  // Best-effort: a PayPal hiccup must never fail the decision emails.
  let invoiced = 0;
  if (group === "accepted") {
    try {
      const r = await invoiceAcceptedWithoutInvoice(cycleId);
      invoiced = r.invoiced;
    } catch (e) {
      console.error("[decisions] booth-fee auto-invoice failed:", e);
    }
    // Build the branded spotlight zip and (first time only) email the posting
    // team its download link. Deferred to after() so rendering ~2 images per
    // accepted artist never delays the admin's response.
    after(async () => {
      await refreshAndNotifyPostingTeam(cycleId);
    });
  }

  revalidatePath("/admin/decisions");
  revalidatePath("/admin");
  await logAdminEvent({
    action: "decision.send",
    targetType: "cycle",
    targetId: cycleId,
    summary: `Sent ${sent} ${group} decision email${sent === 1 ? "" : "s"}${resendAll ? " (incl. re-sends)" : ""}${invoiced ? `, invoiced ${invoiced}` : ""}`,
  });
  return { ok: true, count: sent, invoiced };
}

/* --------------------------------------------------------------- rejections */

const rejectionSchema = z.object({
  cycleId: z.number(),
  emails: z
    .array(
      z.object({
        applicationId: z.number(),
        reason: z.enum(["competes", "nonprofit", "other"]),
        subject: z.string().trim().min(1).max(200),
        body: z.string().trim().min(1).max(20000),
      }),
    )
    .min(1)
    .max(200),
});

/**
 * Send rejection emails. Each recipient's subject and body arrive already
 * composed (template + reason paragraph, possibly hand-edited), so every
 * person gets exactly what the admin reviewed. Only applications that are
 * still marked rejected in this cycle are emailed.
 */
export async function sendRejectionEmails(input: z.input<typeof rejectionSchema>) {
  await requireAdmin();
  const parsed = rejectionSchema.safeParse(input);
  if (!parsed.success) return { error: "Every email needs a subject and a message." };
  if (!resend) return { error: "Email isn't configured." };
  const { cycleId, emails } = parsed.data;

  const { hasUnfilledPlaceholder } = await import("@/lib/rejection");
  const unfilled = emails.filter((e) => hasUnfilledPlaceholder(e.body));
  if (unfilled.length) return { error: `${unfilled.length} email(s) still have a [placeholder] to fill in.` };

  const apps = await db
    .select({ id: applications.id, name: applications.name, email: applications.email })
    .from(applications)
    .where(
      and(
        eq(applications.cycleId, cycleId),
        eq(applications.status, "rejected"),
        inArray(applications.id, emails.map((e) => e.applicationId)),
      ),
    );
  const byId = new Map(apps.map((a) => [a.id, a]));
  const toSend = emails
    .map((e) => ({ ...e, app: byId.get(e.applicationId) }))
    .filter((e): e is typeof e & { app: NonNullable<typeof e.app> } => !!e.app && !e.app.email.endsWith("@no-email.invalid"));
  if (!toSend.length) return { error: "None of these applicants are still marked rejected with an email on file." };

  const now = new Date();
  let sent = 0;
  const failed: string[] = [];
  for (const batch of chunk(toSend, 100)) {
    try {
      const res = await resend.batch.send(
        batch.map((e) => ({
          from: EMAIL_FROM,
          to: e.app.email,
          subject: e.subject,
          html: emailShell(renderMarkdown(personalize(e.body, e.app.name))),
        })),
      );
      const raw = (res as { data?: { data?: { id: string }[] } | { id: string }[] }).data;
      const ids = Array.isArray(raw) ? raw : (raw?.data ?? []);
      const updates = batch.map((e, i) =>
        db
          .update(applications)
          .set({ decisionGroup: "rejected", decisionResendId: ids[i]?.id ?? null, decisionEmailStatus: "sent", decisionSentAt: now })
          .where(eq(applications.id, e.app.id)),
      );
      await db.batch(updates as [(typeof updates)[number], ...typeof updates]);
      sent += batch.length;
    } catch (err) {
      console.error("[decisions] rejection batch failed:", err);
      failed.push(...batch.map((e) => e.app.name));
      const fails = batch.map((e) =>
        db.update(applications).set({ decisionGroup: "rejected", decisionEmailStatus: "failed" }).where(eq(applications.id, e.app.id)),
      );
      await db.batch(fails as [(typeof fails)[number], ...typeof fails]);
    }
  }

  revalidatePath("/admin/broadcasts");
  revalidatePath("/admin/decisions/rejected");
  revalidatePath("/admin");
  await logAdminEvent({
    action: "decision.send",
    targetType: "cycle",
    targetId: cycleId,
    summary: `Sent ${sent} rejection email${sent === 1 ? "" : "s"} (${toSend
      .map((e) => `${e.app.name}: ${e.reason}`)
      .join("; ")})${failed.length ? `; FAILED: ${failed.join(", ")}` : ""}`,
  });
  if (failed.length) return { error: `Sent ${sent}, but these failed and can be retried: ${failed.join(", ")}.` };
  return { ok: true, count: sent };
}
