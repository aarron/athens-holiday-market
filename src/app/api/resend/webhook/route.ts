import { NextResponse } from "next/server";
import crypto from "crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { broadcastRecipients, subscribers, applications, prospects, prospectOptOuts } from "@/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RANK: Record<string, number> = {
  sent: 0,
  delivered: 1,
  opened: 2,
  clicked: 3,
  bounced: 9,
  complained: 9,
  failed: 9,
};

const EVENT_STATUS: Record<string, string> = {
  "email.sent": "sent",
  "email.delivered": "delivered",
  "email.opened": "opened",
  "email.clicked": "clicked",
  "email.bounced": "bounced",
  "email.complained": "complained",
  "email.failed": "failed",
};

function verify(secret: string, svixId: string, svixTs: string, svixSig: string, body: string) {
  try {
    const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
    const expected = crypto
      .createHmac("sha256", key)
      .update(`${svixId}.${svixTs}.${body}`)
      .digest("base64");
    return svixSig.split(" ").some((part) => {
      const sig = part.split(",")[1];
      if (!sig || sig.length !== expected.length) return false;
      return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
    });
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  const body = await req.text();
  const secret = process.env.RESEND_WEBHOOK_SECRET;

  // No secret configured for this endpoint yet → accept but do nothing.
  if (!secret) {
    console.warn("[resend webhook] RESEND_WEBHOOK_SECRET not set; skipping.");
    return NextResponse.json({ ok: true, skipped: true });
  }

  const svixId = req.headers.get("svix-id") ?? "";
  const svixTs = req.headers.get("svix-timestamp") ?? "";
  const svixSig = req.headers.get("svix-signature") ?? "";
  if (!verify(secret, svixId, svixTs, svixSig, body)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: { type?: string; data?: { email_id?: string; to?: string | string[] } };
  try {
    event = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Bad payload" }, { status: 400 });
  }

  const status = EVENT_STATUS[event.type ?? ""];
  const emailId = event.data?.email_id;
  if (!status || !emailId) return NextResponse.json({ ok: true });

  const rec = await db.query.broadcastRecipients.findFirst({
    where: eq(broadcastRecipients.resendId, emailId),
  });
  if (rec && (RANK[status] ?? 0) >= (RANK[rec.status] ?? 0)) {
    await db
      .update(broadcastRecipients)
      .set({ status, updatedAt: new Date() })
      .where(eq(broadcastRecipients.id, rec.id));
  }

  // Per-applicant decision-email receipts.
  const app = await db.query.applications.findFirst({
    where: eq(applications.decisionResendId, emailId),
    columns: { id: true, decisionEmailStatus: true },
  });
  if (app && (RANK[status] ?? 0) >= (RANK[app.decisionEmailStatus ?? "sent"] ?? 0)) {
    await db
      .update(applications)
      .set({ decisionEmailStatus: status })
      .where(eq(applications.id, app.id));
  }

  // Per-prospect invitation receipts.
  const prospect = await db.query.prospects.findFirst({
    where: eq(prospects.invitedResendId, emailId),
    columns: { id: true, inviteEmailStatus: true },
  });
  if (prospect && (RANK[status] ?? 0) >= (RANK[prospect.inviteEmailStatus ?? "sent"] ?? 0)) {
    await db
      .update(prospects)
      .set({ inviteEmailStatus: status as typeof prospect.inviteEmailStatus })
      .where(eq(prospects.id, prospect.id));
  }

  // Suppress bounced / complained addresses from future sends.
  if (status === "bounced" || status === "complained") {
    const to = Array.isArray(event.data?.to) ? event.data?.to[0] : event.data?.to;
    const email = (to ?? rec?.email)?.toLowerCase();
    if (email) {
      await db
        .update(subscribers)
        .set({ status: "unsubscribed" })
        .where(eq(subscribers.email, email));
      // Also keep cold-outreach off this address.
      await db.insert(prospectOptOuts).values({ email, reason: status }).onConflictDoNothing();
    }
  }

  return NextResponse.json({ ok: true });
}
