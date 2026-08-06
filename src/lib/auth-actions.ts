"use server";

import { redirect } from "next/navigation";
import { resolveIdentity, createMagicToken } from "@/lib/magic";
import { sendMagicLink } from "@/lib/emails";
import { destroySession } from "@/lib/session";
import { publicEnv } from "@/lib/env";

export type MagicState = { ok?: boolean; error?: string };

/** Email a magic link if the address has access. Response is always generic. */
export async function requestMagicLink(_prev: MagicState, formData: FormData): Promise<MagicState> {
  const email = String(formData.get("email") ?? "").toLowerCase().trim();
  if (!email || !email.includes("@")) return { error: "Please enter a valid email address." };

  const identity = await resolveIdentity(email);
  if (identity) {
    const raw = await createMagicToken(email);
    await sendMagicLink(email, `${publicEnv.siteUrl}/auth/verify?token=${raw}`);
  }
  // No account enumeration: same message whether or not the email has access.
  return { ok: true };
}

export async function signOutAction() {
  await destroySession();
  redirect("/");
}
