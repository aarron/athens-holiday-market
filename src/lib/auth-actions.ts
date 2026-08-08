"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { resolveIdentity, createMagicToken } from "@/lib/magic";
import { sendMagicLink } from "@/lib/emails";
import { destroySession } from "@/lib/session";
import { publicEnv } from "@/lib/env";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export type MagicState = { ok?: boolean; error?: string };

/** Email a magic link if the address has access. Response is always generic. */
export async function requestMagicLink(_prev: MagicState, formData: FormData): Promise<MagicState> {
  const email = String(formData.get("email") ?? "").toLowerCase().trim();
  if (!email || !email.includes("@")) return { error: "Please enter a valid email address." };

  // Throttle per IP and per target email so a known staff address can't be
  // email-bombed and login_tokens can't grow unbounded. Generic response either
  // way — still no account enumeration.
  const ip = clientIp(await headers());
  const okIp = await rateLimit("magic-link-ip", ip, 10, 15 * 60_000);
  const okEmail = await rateLimit("magic-link-email", email, 3, 15 * 60_000);
  if (!okIp || !okEmail) {
    return { ok: true };
  }

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
