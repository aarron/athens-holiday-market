import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { settings } from "@/db/schema";

/**
 * Saved copy for the decision-email pages (Email & Text → Accepted,
 * Non-profits, Waitlist, Rejected), one draft per page per year, kept on the
 * server so edits survive reloads, other computers, and sending. The rejection
 * page also keeps a record of exactly what each person was sent.
 *
 * Plain module (no "use server"): only called from authenticated server code.
 */
export type DecisionGroupKey = "accepted" | "nonprofit" | "waitlist" | "rejected";

export type DecisionDraft = {
  subject?: string;
  /** The editable message (for rejections, the template with {{reason}}). */
  body?: string;
  /** Rejections: the reason paragraphs, keyed by reason id. */
  reasonText?: Record<string, string>;
  /** Rejections: each person's chosen reason and any one-off edit. */
  people?: Record<string, { reason?: string; custom?: string | null }>;
  /** Rejections: exactly what each person was sent (name already filled in). */
  sent?: Record<string, { subject: string; body: string; at: string }>;
  updatedAt?: string;
  updatedBy?: string;
};

export const DECISION_GROUPS: DecisionGroupKey[] = ["accepted", "nonprofit", "waitlist", "rejected"];

const keyFor = (cycleId: number, group: DecisionGroupKey) => `decision_draft:${cycleId}:${group}`;

export async function readDecisionDraft(cycleId: number, group: DecisionGroupKey): Promise<DecisionDraft | null> {
  const row = await db.query.settings.findFirst({ where: eq(settings.key, keyFor(cycleId, group)) });
  return row?.value && typeof row.value === "object" ? (row.value as DecisionDraft) : null;
}

export async function writeDecisionDraft(cycleId: number, group: DecisionGroupKey, draft: DecisionDraft) {
  await db
    .insert(settings)
    .values({ key: keyFor(cycleId, group), value: draft })
    .onConflictDoUpdate({ target: settings.key, set: { value: draft, updatedAt: new Date() } });
}
