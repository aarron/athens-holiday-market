import "server-only";
import crypto from "crypto";
import { and, eq, isNull, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { prospects, prospectOptOuts, subscribers } from "@/db/schema";
import { resend } from "@/lib/resend-client";
import { emailShell } from "@/lib/email-shell";
import { site } from "@/lib/site";
import { splitProspectName } from "@/lib/prospects";
import { chunk } from "@/lib/send-util";

/** From address for cold invites — separate var so it can point at a dedicated
 *  sending identity, but falls back to the market's normal From. */
export function inviteFrom(): string {
  return process.env.INVITE_EMAIL_FROM || `${site.name} <hello@athensholidaymarket.com>`;
}

const applyUrl = `${site.url}/apply`;
const optOutUrl = (token: string) => `${site.url}/invite-optout?token=${token}`;
const optOutApi = (token: string) => `${site.url}/api/invite-optout?token=${token}`;

/** A warm, personal invitation to apply. Kept plain and human — not a blast. */
export function inviteEmailHtml(opts: { name: string | null; token: string }): string {
  const first = greetingName(opts.name);
  const inner = `
    <p style="margin:0 0 14px;line-height:1.6">Hi ${first},</p>
    <p style="margin:0 0 14px;line-height:1.6">
      I help run the <strong>${site.name}</strong> — a juried, two-evening holiday market in the
      courtyard at Big City Bread Cafe in Athens, GA, now in its 25th year. We came across your work
      and loved it, and I wanted to personally invite you to apply for our ${site.event.year} market.
    </p>
    <p style="margin:0 0 14px;line-height:1.6">
      It's a warm, well-run show put on by working artists, with a courtyard full of shoppers who come
      specifically to buy handmade and support the makers. Applications open on Labor Day and space is
      limited — a small jury curates the lineup each year.
    </p>
    <p style="margin:22px 0;text-align:center">
      <a href="${applyUrl}" style="display:inline-block;background:#3f7d22;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:700">Apply to sell →</a>
    </p>
    <p style="margin:0 0 14px;line-height:1.6">
      If this isn't a fit, no worries at all — just
      <a href="${optOutUrl(opts.token)}" style="color:#9c1c50">let us know</a> and we won't reach out again.
    </p>
    <p style="margin:0;line-height:1.6">Warmly,<br/>The ${site.name} team</p>`;
  return emailShell(inner, { unsubscribeUrl: optOutUrl(opts.token) });
}

export function inviteSubject(): string {
  return `An invitation to apply — ${site.name} ${site.event.year}`;
}

function greetingName(name: string | null): string {
  if (!name) return "there";
  const { maker, business } = splitProspectName(name);
  // Prefer the maker's first name; fall back to "there" rather than greeting a
  // business ("Hi R. Wood Studio,") which reads oddly.
  if (maker) return maker.split(/\s+/)[0];
  // If the name looks like a person (two words, no business-y punctuation), use it.
  if (/^[A-Za-z]+\s+[A-Za-z]+$/.test(business)) return business.split(/\s+/)[0];
  return "there";
}

export type Invitable = { id: number; name: string; email: string };

/**
 * Shortlisted prospects who can be invited: valid email, not already invited
 * (unless resending), and not suppressed by a prospect opt-out or an
 * unsubscribed subscriber — the combined suppression list.
 */
export async function listInvitableProspects(
  cycleId: number,
  opts: { resendAll?: boolean } = {},
): Promise<Invitable[]> {
  const conds = [
    eq(prospects.cycleId, cycleId),
    eq(prospects.status, "shortlisted"),
    isNotNull(prospects.email),
  ];
  if (!opts.resendAll) conds.push(isNull(prospects.invitedAt));

  const rows = await db
    .select({ id: prospects.id, name: prospects.name, email: prospects.email })
    .from(prospects)
    .where(and(...conds));

  // Combined suppression: prospect opt-outs + unsubscribed subscribers.
  const [optOuts, unsubs] = await Promise.all([
    db.select({ email: prospectOptOuts.email }).from(prospectOptOuts),
    db
      .select({ email: subscribers.email })
      .from(subscribers)
      .where(eq(subscribers.status, "unsubscribed")),
  ]);
  const suppressed = new Set(
    [...optOuts, ...unsubs].map((r) => r.email.trim().toLowerCase()),
  );

  return rows
    .filter((r): r is Invitable => !!r.email && !suppressed.has(r.email.toLowerCase()))
    .map((r) => ({ id: r.id, name: r.name, email: r.email }));
}

/** Send invitations to the given prospects. Batched; records a per-recipient
 *  receipt (invitedResendId + status) and a unique opt-out token. */
export async function deliverProspectInvites(recipients: Invitable[]) {
  if (!resend || recipients.length === 0) return { sent: 0, failed: 0 };

  let sent = 0;
  let failed = 0;
  const subject = inviteSubject();

  for (const batch of chunk(recipients, 100)) {
    // A fresh opt-out token per prospect, persisted before the send.
    const withTokens = batch.map((r) => ({ ...r, token: crypto.randomBytes(16).toString("hex") }));
    const payload = withTokens.map((r) => ({
      from: inviteFrom(),
      to: r.email,
      subject,
      html: inviteEmailHtml({ name: r.name, token: r.token }),
      headers: {
        "List-Unsubscribe": `<${optOutApi(r.token)}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    }));

    let ids: (string | null)[] = [];
    try {
      const res = await resend.batch.send(payload);
      const raw = (res as { data?: { data?: { id: string }[] } | { id: string }[] }).data;
      const items = Array.isArray(raw) ? raw : (raw?.data ?? []);
      ids = withTokens.map((_, i) => items[i]?.id ?? null);
      sent += batch.length;
    } catch (e) {
      console.error("[invite] batch send failed:", e);
      failed += batch.length;
      ids = withTokens.map(() => null);
    }

    const now = new Date();
    const updates = withTokens.map((r, i) =>
      db
        .update(prospects)
        .set({
          invitedAt: now,
          invitedResendId: ids[i],
          inviteEmailStatus: ids[i] ? "sent" : "failed",
          inviteToken: r.token,
          updatedAt: now,
        })
        .where(eq(prospects.id, r.id)),
    );
    if (updates.length) await db.batch(updates as [(typeof updates)[number], ...typeof updates]);
  }

  return { sent, failed };
}

/** Count of shortlisted prospects still awaiting an invite, and already invited. */
export async function inviteCounts(cycleId: number) {
  const ready = await listInvitableProspects(cycleId);
  const invited = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(prospects)
    .where(and(eq(prospects.cycleId, cycleId), isNotNull(prospects.invitedAt)));
  return { ready: ready.length, invited: invited[0]?.n ?? 0 };
}
