"use server";

import { redirect } from "next/navigation";
import { unsubscribeByToken } from "@/lib/unsubscribe";

/**
 * Confirm-then-unsubscribe. Mutation happens only on this POST (a real click on
 * the confirm page), never on GET — so email link prefetchers/scanners can't
 * silently unsubscribe people.
 */
export async function confirmUnsubscribe(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  await unsubscribeByToken(token);
  redirect(`/unsubscribe?token=${encodeURIComponent(token)}&done=1`);
}
