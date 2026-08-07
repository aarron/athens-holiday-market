import "server-only";
import { and, eq, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { applications, cycles } from "@/db/schema";
import { site } from "@/lib/site";
import { createBoothFeeInvoice, paypalConfigured } from "@/lib/paypal";
import { sendBoothFeeReminder } from "@/lib/emails";

const AMOUNT = site.applications.boothFee;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

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

  const res = await createBoothFeeInvoice({
    name: app.name,
    email: app.email,
    amount: AMOUNT,
    itemLabel: `Booth fee — ${cycleYear} ${site.name}`,
    memo: `Your $${AMOUNT} booth fee for the ${cycleYear} ${site.name} (covers both nights). Thank you for being part of the market!`,
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
    .where(and(eq(applications.cycleId, cycleId), eq(applications.status, "accepted")));

  let invoiced = 0;
  let skipped = 0;
  for (const a of rows) {
    if (a.paypalInvoiceId || invalidEmail(a.email)) { skipped++; continue; }
    const r = await invoiceApplication(a, cycleYear);
    r.ok && !r.already ? invoiced++ : skipped++;
  }
  return { invoiced, skipped, configured: true };
}

/** Send a booth-fee reminder now (manual button). Doesn't touch the auto counter. */
export async function remindApplication(appId: number) {
  const app = await db.query.applications.findFirst({ where: eq(applications.id, appId) });
  if (!app) return { error: "Not found." };
  if (app.boothFeePaid) return { error: "Booth fee is already paid." };
  if (invalidEmail(app.email)) return { error: "No valid email on file." };
  const r = await sendBoothFeeReminder(app.email, app.name, AMOUNT, app.paypalInvoiceUrl);
  if (r && "error" in r) return { error: "Couldn't send the reminder email." };
  return { ok: true };
}

/**
 * Daily cron: nudge accepted artists whose invoice is still unpaid — once at
 * ~1 week and again at ~2 weeks after invoicing. `boothFeeReminderCount` tracks
 * which nudges have gone out so none repeat.
 */
export async function runBoothFeeReminders(now = new Date()) {
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
        eq(applications.status, "accepted"),
        eq(applications.boothFeePaid, false),
        isNotNull(applications.boothFeeInvoicedAt),
      ),
    );

  let sent = 0;
  for (const a of rows) {
    if (!a.invoicedAt || invalidEmail(a.email)) continue;
    const weeks = Math.floor((now.getTime() - new Date(a.invoicedAt).getTime()) / WEEK_MS);
    // Next due nudge: 1 after >=1 week, 2 after >=2 weeks. Stop at 2.
    const due = weeks >= 2 ? 2 : weeks >= 1 ? 1 : 0;
    if (due <= a.reminderCount) continue;

    const r = await sendBoothFeeReminder(a.email, a.name, AMOUNT, a.invoiceUrl);
    if (r && "error" in r) continue;
    await db
      .update(applications)
      .set({ boothFeeReminderCount: due, updatedAt: sql`now()` })
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
