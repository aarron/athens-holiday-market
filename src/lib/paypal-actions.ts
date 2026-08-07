"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { applications, cycles } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-auth";
import { invoiceApplication, remindApplication } from "@/lib/booth-fee";
import { paypalConfigured } from "@/lib/paypal";

/** Manually create + send a booth-fee invoice for one application (admin only). */
export async function sendBoothFeeInvoice(applicationId: number) {
  await requireAdmin();
  if (!paypalConfigured()) return { error: "PayPal isn't configured yet." };

  const app = await db
    .select({
      id: applications.id,
      name: applications.name,
      email: applications.email,
      status: applications.status,
      paypalInvoiceId: applications.paypalInvoiceId,
      year: cycles.year,
    })
    .from(applications)
    .innerJoin(cycles, eq(applications.cycleId, cycles.id))
    .where(eq(applications.id, applicationId))
    .then((r) => r[0]);

  if (!app) return { error: "Not found." };
  if (app.status !== "accepted") return { error: "Only accepted artists are invoiced." };

  const res = await invoiceApplication(app, app.year);
  if (!res.ok) return { error: res.error };
  revalidatePath(`/admin/applications/${applicationId}`);
  return res.already ? { ok: true, already: true } : { ok: true };
}

/** Send a booth-fee reminder email now (admin only). */
export async function sendBoothFeeReminderNow(applicationId: number) {
  await requireAdmin();
  const res = await remindApplication(applicationId);
  if ("error" in res) return { error: res.error };
  revalidatePath(`/admin/applications/${applicationId}`);
  return { ok: true };
}
