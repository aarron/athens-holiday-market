import "server-only";
import { and, eq, gt, lt } from "drizzle-orm";
import { db } from "@/db";
import { rateLimits } from "@/db/schema";

/** Best-effort client IP from proxy headers (Vercel sets x-forwarded-for). */
export function clientIp(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    "unknown"
  );
}

/**
 * Fixed-window per-key rate limiter backed by the rate_limits table. Returns
 * true if the request is allowed (and records it), false if the key has hit
 * `max` within `windowMs`. Fails OPEN on a DB error — throttling must never
 * take a public endpoint down.
 */
export async function rateLimit(
  bucket: string,
  key: string,
  max: number,
  windowMs: number,
): Promise<boolean> {
  const since = new Date(Date.now() - windowMs);
  try {
    const recent = await db
      .select({ id: rateLimits.id })
      .from(rateLimits)
      .where(and(eq(rateLimits.bucket, bucket), eq(rateLimits.key, key), gt(rateLimits.createdAt, since)));
    if (recent.length >= max) return false;
    await db.insert(rateLimits).values({ bucket, key });
    // Opportunistic prune of this bucket/key's stale rows (cheap, keeps table small).
    await db
      .delete(rateLimits)
      .where(and(eq(rateLimits.bucket, bucket), eq(rateLimits.key, key), lt(rateLimits.createdAt, since)));
    return true;
  } catch (e) {
    console.error("[rate-limit] check failed (allowing):", bucket, e);
    return true;
  }
}
