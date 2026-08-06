import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { subscribers } from "@/db/schema";

/** Unsubscribe a subscriber by their token. Returns true if a match was found. */
export async function unsubscribeByToken(token: string): Promise<boolean> {
  if (!token || token === "preview") return false;
  const rows = await db
    .update(subscribers)
    .set({ status: "unsubscribed" })
    .where(eq(subscribers.unsubscribeToken, token))
    .returning({ id: subscribers.id });
  return rows.length > 0;
}
