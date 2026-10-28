import "server-only";
import { and, eq, isNotNull, isNull, ne, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { applications, cycles } from "@/db/schema";
import { site } from "@/lib/site";
import { createBoothFeeInvoice, paypalConfigured } from "@/lib/paypal";
import { emailSent, sendBoothFeeReminder } from "@/lib/emails";
import { NONPROFIT_CATEGORY } from "@/lib/nonprofit";
import { pairSharedBooths } from "@/lib/booths";
import { formatUsd } from "@/lib/money";

/** Non-profits never pay a booth fee (see lib/nonprofit.ts). */
const notNonprofit = or(isNull(applications.mediumCategory), ne(applications.mediumCategory, NONPROFIT_CATEGORY));

const AMOUNT = site.applications.boothFee;

/** Today's date in Athens as YYYY-MM-DD. */
function todayInAthens(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(now);
}

/** This year's booth-fee due date and the day after, as YYYY-MM-DD. */
export function boothFeeDueDates(year: number) {
  const { month, day } = site.applications.boothFeeDue;
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const due = new Date(Date.UTC(year, month - 1, day));
  return { due: iso(due), dayAfter: iso(new Date(due.getTime() + 86_400_000)) };
}

export type FeeShare = { amount: number; partnerName: string | null };

/**
 * Each accepted artist's booth fee for a cycle. Two accepted artists who share
 * a booth (matched by pairSharedBooths, the same pairing the dashboard shows)
 * each pay half; everyone else pays the full fee. Used by the invoice, the
 * reminders and the acceptance email so the amount always agrees.
 */
export async function feeSharesForCycle(cycleId: number): Promise<Map<number, FeeShare>> {
  const accepted = await db
    .select({
      id: applications.id,
      name: applications.name,
      businessName: applications.businessName,
      email: applications.email,
      shareBooth: applications.shareBooth,
      shareBoothWith: applications.shareBoothWith,
    })
    .from(applications)
    .where(and(eq(applications.cycleId, cycleId), eq(applications.status, "accepted"), notNonprofit));
  const partner = pairSharedBooths(accepted);
  const byId = new Map(accepted.map((a) => [a.id, a]));
  return new Map(
    accepted.map((a) => {
      const p = partner.get(a.id);
      return [a.id, p ? { amount: AMOUNT / 2, partnerName: byId.get(p)?.name ?? null } : { amount: AMOUNT, partnerName: null }];
    }),
  );
}

async function feeShareFor(appId: number): Promise<FeeShare> {
  const app = await db.query.applications.findFirst({ where: eq(applications.id, appId), columns: { cycleId: true } });
  if (!app) return { amount: AMOUNT, partnerName: null };
  return (await feeSharesForCycle(app.cycleId)).get(appId) ?? { amount: AMOUNT, partnerName: null };
}

type InvoiceableApp = { id: number; name: string; email: string; paypalInvoiceId: string | null };

function invalidEmail(email: string) {
  return !email || email.endsWith("@no-email.invalid");
}

/**
 * Create + send a booth-fee invoice for one accepted application and persist the
 * linkage. Idempotent: skips if already invoiced. Never throws — returns a
 * result so callers (auto-send on acceptance, manual button) can carry on.
 */
export async function invoiceApplication(
  app: InvoiceableApp,
  cycleYear: number,
): Promise<{ ok: true; already?: boolean } | { ok: false; error: string }> {
  if (!paypalConfigured()) return { ok: false, error: "PayPal is not configured." };
  if (app.paypalInvoiceId) return { ok: true, already: true };
  if (invalidEmail(app.email)) return { ok: false, error: "No valid email on file." };
  // Last line of defence: whatever the caller, a non-profit is never invoiced.
  const cat = await db.query.applications.findFirst({ where: eq(applications.id, app.id), columns: { mediumCategory: true } });
  if (cat?.mediumCategory === NONPROFIT_CATEGORY) return { ok: false, error: "Non-profits don't pay a booth fee." };

  const share = await feeShareFor(app.id);
  const res = await createBoothFeeInvoice({
    name: app.name,
    email: app.email,
    amount: share.amount,
    itemLabel: share.partnerName
      ? `Shared booth fee (half) — ${cycleYear} ${site.name}`
      : `Booth fee — ${cycleYear} ${site.name}`,
    memo: share.partnerName
      ? `Your ${formatUsd(share.amount)} half of the ${formatUsd(AMOUNT)} booth you're sharing with ${share.partnerName} at the ${cycleYear} ${site.name} (covers both nights). Thank you for being part of the market!`
      : `Your ${formatUsd(AMOUNT)} booth fee for the ${cycleYear} ${site.name} (covers both nights). Thank you for being part of the market!`,
  });
  if (!res.ok) return res;

  await db
    .update(applications)
    .set({ paypalInvoiceId: res.id, paypalInvoiceUrl: res.url, boothFeeInvoicedAt: new Date(), updatedAt: sql`now()` })
    .where(eq(applications.id, app.id));
  return { ok: true };
}

/** Send booth-fee invoices to every accepted artist in a cycle who lacks one. */
export async function invoiceAcceptedWithoutInvoice(cycleId: number) {
  if (!paypalConfigured()) return { invoiced: 0, skipped: 0, configured: false };
  const cycle = await db.query.cycles.findFirst({ where: eq(cycles.id, cycleId), columns: { year: true } });
  const cycleYear = cycle?.year ?? new Date().getFullYear();
  const rows = await db
    .select({ id: applications.id, name: applications.name, email: applications.email, paypalInvoiceId: applications.paypalInvoiceId })
    .from(applications)
    .where(and(eq(applications.cycleId, cycleId), eq(applications.status, "accepted"), notNonprofit));

  let invoiced = 0;
  let skipped = 0;
  for (const a of rows) {
    if (a.paypalInvoiceId || invalidEmail(a.email)) { skipped++; continue; }
    const r = await invoiceApplication(a, cycleYear);
    if (r.ok && !r.already) invoiced++;
    else skipped++;
  }
  return { invoiced, skipped, configured: true };
}

/** Send a booth-fee reminder now (manual button). Doesn't touch the auto counter. */
export async function remindApplication(appId: number) {
  const app = await db.query.applications.findFirst({ where: eq(applications.id, appId) });
  if (!app) return { error: "Not found." };
  if (app.boothFeePaid) return { error: "Booth fee is already paid." };
  if (app.mediumCategory === NONPROFIT_CATEGORY) return { error: "Non-profits don't pay a booth fee." };
  if (invalidEmail(app.email)) return { error: "No valid email on file." };
  const r = await sendBoothFeeReminder(app.email, app.name, (await feeShareFor(app.id)).amount, app.paypalInvoiceUrl);
  if (!emailSent(r)) return { error: "Couldn't send the reminder email." };
  return { ok: true };
}

/**
 * Daily cron: remind accepted artists whose invoice is still unpaid, on the
 * due date (Oct 31) and the day after, in Athens time. `boothFeeReminderCount`
 * records which went out (1 = due date, 2 = day after) so none repeat.
 */
export async function runBoothFeeReminders(now = new Date()) {
  const today = todayInAthens(now);
  const { due: dueDate, dayAfter } = boothFeeDueDates(Number(today.slice(0, 4)));
  const stage = today === dueDate ? 1 : today === dayAfter ? 2 : 0;
  if (stage === 0) return { sent: 0, note: `not a reminder day (due ${dueDate})` };
  const cycle = await db.query.cycles.findFirst({ where: eq(cycles.isActive, true), columns: { id: true } });
  if (!cycle) return { sent: 0, note: "no active cycle" };

  const rows = await db
    .select({
      id: applications.id,
      name: applications.name,
      email: applications.email,
      invoiceUrl: applications.paypalInvoiceUrl,
      invoicedAt: applications.boothFeeInvoicedAt,
      reminderCount: applications.boothFeeReminderCount,
    })
    .from(applications)
    .where(
      and(
        eq(applications.cycleId, cycle.id),
        eq(applications.status, "accepted"),
        eq(applications.boothFeePaid, false),
        isNotNull(applications.boothFeeInvoicedAt),
        notNonprofit,
      ),
    );

  let sent = 0;
  for (const a of rows) {
    if (!a.invoicedAt || invalidEmail(a.email)) continue;
    if (a.reminderCount >= stage) continue;

    const r = await sendBoothFeeReminder(
      a.email,
      a.name,
      (await feeShareFor(a.id)).amount,
      a.invoiceUrl,
      stage === 1 ? "due" : "overdue",
    );
    if (!emailSent(r)) continue;
    await db
      .update(applications)
      .set({ boothFeeReminderCount: stage, updatedAt: sql`now()` })
      .where(eq(applications.id, a.id));
    sent++;
  }
  return { sent };
}

/** Small helper for the cron/transparency view: how many unpaid invoices exist. */
export async function unpaidInvoiceCount(cycleId: number) {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(applications)
    .where(
      and(
        eq(applications.cycleId, cycleId),
        eq(applications.boothFeePaid, false),
        isNotNull(applications.paypalInvoiceId),
      ),
    );
  return row?.n ?? 0;
}

export { AMOUNT as BOOTH_FEE };
