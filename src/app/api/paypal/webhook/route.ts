import { NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { applications } from "@/db/schema";
import { verifyWebhookSignature } from "@/lib/paypal";
import { sendBoothFeePaid } from "@/lib/emails";
import { feeSharesForCycle } from "@/lib/booth-fee";
import { logAdminEvent } from "@/lib/audit";
import { site } from "@/lib/site";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * PayPal Invoicing webhook. Verifies the signature against PAYPAL_WEBHOOK_ID,
 * then marks the matching application's booth fee paid when its invoice is
 * paid, and emails the artist a "payment received" confirmation — once.
 */
export async function POST(req: Request) {
  const body = await req.text();

  const verified = await verifyWebhookSignature(
    {
      transmissionId: req.headers.get("paypal-transmission-id"),
      transmissionTime: req.headers.get("paypal-transmission-time"),
      transmissionSig: req.headers.get("paypal-transmission-sig"),
      certUrl: req.headers.get("paypal-cert-url"),
      authAlgo: req.headers.get("paypal-auth-algo"),
    },
    body,
  );
  if (!verified) return NextResponse.json({ error: "Invalid signature" }, { status: 401 });

  let event: { event_type?: string; resource?: { id?: string; invoice?: { id?: string } } };
  try {
    event = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Bad payload" }, { status: 400 });
  }

  if (event.event_type === "INVOICING.INVOICE.PAID") {
    // The resource is the invoice; some payloads nest it under `invoice`.
    const invoiceId = event.resource?.invoice?.id ?? event.resource?.id;
    if (invoiceId) {
      // Flip unpaid → paid and get back only rows that actually changed.
      // PayPal can deliver the same event more than once; a repeat matches no
      // unpaid row, so the confirmation email goes out exactly once.
      const newlyPaid = await db
        .update(applications)
        .set({ boothFeePaid: true, boothFeePaidAt: sql`now()`, updatedAt: sql`now()` })
        .where(and(eq(applications.paypalInvoiceId, invoiceId), eq(applications.boothFeePaid, false)))
        .returning({ id: applications.id, cycleId: applications.cycleId, name: applications.name, email: applications.email });

      for (const a of newlyPaid) {
        // Best-effort: an email problem must never make PayPal retry the webhook.
        let outcome = "sent";
        try {
          const amount = (await feeSharesForCycle(a.cycleId)).get(a.id)?.amount ?? site.applications.boothFee;
          const r = await sendBoothFeePaid(a.email, a.name, amount);
          if (r && "skipped" in r) outcome = "skipped (email not configured)";
          else if (r && "error" in r && r.error) outcome = "FAILED";
        } catch (e) {
          console.error("[paypal] payment-received email failed:", e);
          outcome = "FAILED";
        }
        await logAdminEvent({
          action: "booth_fee.paid",
          targetType: "application",
          targetId: a.id,
          actorEmail: "system:paypal",
          summary: `${a.name} paid the booth fee via PayPal; payment-received email ${outcome}`,
        });
      }
    }
  }

  return NextResponse.json({ ok: true });
}
