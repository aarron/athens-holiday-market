"use server";

import { redirect } from "next/navigation";
import { optOutByInviteToken } from "@/lib/prospect-optout";

/** Confirm-button opt-out from the /invite-optout page. */
export async function confirmInviteOptOut(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  await optOutByInviteToken(token);
  redirect(`/invite-optout?token=${encodeURIComponent(token)}&done=1`);
}
