import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { applications } from "@/db/schema";
import { verifyWebhookSignature } from "@/lib/paypal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * PayPal Invoicing webhook. Verifies the signature against PAYPAL_WEBHOOK_ID,
 * then marks the matching application's booth fee paid when its invoice is paid.
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
      await db
        .update(applications)
        .set({ boothFeePaid: true, boothFeePaidAt: sql`now()`, updatedAt: sql`now()` })
        .where(eq(applications.paypalInvoiceId, invoiceId));
    }
  }

  return NextResponse.json({ ok: true });
}
