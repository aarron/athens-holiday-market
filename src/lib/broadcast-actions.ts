"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { broadcasts, broadcastRecipients } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-auth";
import { resend, EMAIL_FROM } from "@/lib/resend";
import { emailShell, renderMarkdown } from "@/lib/email-template";
import { segmentRecipients } from "@/lib/broadcast-data";
import { publicEnv } from "@/lib/env";

const composeSchema = z.object({
  subject: z.string().trim().min(1, "Add a subject.").max(200),
  body: z.string().trim().min(1, "Write a message.").max(20000),
  segment: z.enum(["all", "artists", "non_artists"]),
});

function chunk<T>(arr: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

const unsubUrl = (token: string) => `${publicEnv.siteUrl}/unsubscribe?token=${token}`;
const unsubApi = (token: string) => `${publicEnv.siteUrl}/api/unsubscribe?token=${token}`;

function personalize(body: string, name: string | null) {
  const first = (name || "").trim().split(/\s+/)[0] || "there";
  return body
    .replace(/\{\{\s*first_name\s*\}\}/gi, first)
    .replace(/\{\{\s*name\s*\}\}/gi, name || "there");
}

/** Send a preview of the broadcast to the signed-in admin only. */
export async function sendTestEmail(input: { subject: string; body: string }) {
  const admin = await requireAdmin();
  const parsed = composeSchema.pick({ subject: true, body: true }).safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  if (!resend) return { error: "Email isn't configured." };

  const html = emailShell(renderMarkdown(personalize(parsed.data.body, admin.name)), {
    unsubscribeUrl: unsubUrl("preview"),
  });
  try {
    await resend.emails.send({
      from: EMAIL_FROM,
      to: admin.email,
      subject: `[Test] ${parsed.data.subject}`,
      html,
    });
    return { ok: true, to: admin.email };
  } catch {
    return { error: "Couldn't send the test email." };
  }
}

/** Send the broadcast to everyone in the chosen segment. */
export async function sendBroadcast(input: z.input<typeof composeSchema>) {
  await requireAdmin();
  const parsed = composeSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  if (!resend) return { error: "Email isn't configured." };

  const { subject, body, segment } = parsed.data;
  const recipients = await segmentRecipients(segment);
  if (recipients.length === 0) return { error: "No active recipients in that segment." };

  const [bc] = await db
    .insert(broadcasts)
    .values({ subject, body, segment, status: "sending", recipientCount: recipients.length })
    .returning({ id: broadcasts.id });

  const recRows: { broadcastId: number; email: string; resendId: string | null; status: string }[] = [];

  for (const batch of chunk(recipients, 100)) {
    const payload = batch.map((r) => ({
      from: EMAIL_FROM,
      to: r.email,
      subject,
      html: emailShell(renderMarkdown(personalize(body, r.name)), { unsubscribeUrl: unsubUrl(r.token) }),
      headers: {
        "List-Unsubscribe": `<${unsubApi(r.token)}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    }));
    try {
      const res = await resend.batch.send(payload);
      const items =
        ((res as { data?: { data?: { id: string }[] } | { id: string }[] }).data as
          | { data?: { id: string }[] }
          | { id: string }[]
          | undefined) ?? [];
      const ids = Array.isArray(items) ? items : (items.data ?? []);
      batch.forEach((r, i) =>
        recRows.push({ broadcastId: bc.id, email: r.email, resendId: ids[i]?.id ?? null, status: "sent" }),
      );
    } catch {
      batch.forEach((r) =>
        recRows.push({ broadcastId: bc.id, email: r.email, resendId: null, status: "failed" }),
      );
    }
  }

  for (const c of chunk(recRows, 500)) await db.insert(broadcastRecipients).values(c);
  await db.update(broadcasts).set({ status: "sent", sentAt: new Date() }).where(eq(broadcasts.id, bc.id));

  revalidatePath("/admin/broadcasts");
  return { ok: true, id: bc.id, count: recipients.length };
}
