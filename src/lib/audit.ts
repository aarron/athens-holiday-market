import "server-only";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { adminEvents } from "@/db/schema";
import { getSessionUser } from "@/lib/admin-auth";

type AuditInput = {
  action: string;
  targetType?: string;
  targetId?: number | null;
  summary: string;
  /** Override the actor (e.g. cron jobs with no session). Defaults to the
   *  signed-in admin's email, or "system". */
  actorEmail?: string;
};

/**
 * Append one row to the admin audit log. Best-effort: a logging failure must
 * never break the action it records, so errors are swallowed (and logged).
 */
export async function logAdminEvent(input: AuditInput): Promise<void> {
  try {
    const actor = input.actorEmail ?? (await getSessionUser())?.email ?? "system";
    await db.insert(adminEvents).values({
      actorEmail: actor,
      action: input.action,
      targetType: input.targetType ?? null,
      targetId: input.targetId ?? null,
      summary: input.summary,
    });
  } catch (e) {
    console.error("[audit] failed to record event:", input.action, e);
  }
}

/** Most-recent audit events for the admin activity view. */
export async function listAdminEvents(limit = 200) {
  return db.query.adminEvents.findMany({
    orderBy: [desc(adminEvents.createdAt)],
    limit,
  });
}
