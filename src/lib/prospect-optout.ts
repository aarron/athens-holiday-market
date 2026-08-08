import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { prospects, prospectOptOuts } from "@/db/schema";

/** Resolve an invite opt-out token to the prospect it belongs to. */
export async function findProspectByInviteToken(token: string) {
  if (!token) return null;
  return db.query.prospects.findFirst({
    where: eq(prospects.inviteToken, token),
    columns: { id: true, name: true, email: true },
  });
}

/**
 * Record a cold-outreach opt-out for the email behind this token. Idempotent —
 * a repeat click (or the one-click List-Unsubscribe POST) is a no-op. Returns
 * the email that was suppressed, or null if the token didn't resolve.
 */
export async function optOutByInviteToken(token: string): Promise<string | null> {
  const p = await findProspectByInviteToken(token);
  const email = p?.email?.trim().toLowerCase();
  if (!email) return null;
  await db
    .insert(prospectOptOuts)
    .values({ email, reason: "invite" })
    .onConflictDoNothing();
  return email;
}
