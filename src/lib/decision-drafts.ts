"use server";

import { requireAdmin } from "@/lib/admin-auth";
import {
  DECISION_GROUPS,
  readDecisionDraft,
  writeDecisionDraft,
  type DecisionDraft,
  type DecisionGroupKey,
} from "@/lib/decision-draft-store";

/**
 * Save a decision page's edits (admin only). The record of sent emails is
 * owned by the send itself, so it's always preserved here, never overwritten.
 */
export async function saveDecisionDraft(
  cycleId: number,
  group: DecisionGroupKey,
  draft: Pick<DecisionDraft, "subject" | "body" | "reasonText" | "people">,
) {
  const me = await requireAdmin();
  if (!DECISION_GROUPS.includes(group) || !Number.isInteger(cycleId)) return { error: "Unknown page." };
  const size = JSON.stringify(draft).length;
  if (size > 200_000) return { error: "That's too much text to save." };
  const existing = await readDecisionDraft(cycleId, group);
  const updatedAt = new Date().toISOString();
  await writeDecisionDraft(cycleId, group, {
    subject: draft.subject,
    body: draft.body,
    reasonText: draft.reasonText,
    people: draft.people,
    sent: existing?.sent,
    updatedAt,
    updatedBy: me.email,
  });
  return { ok: true as const, updatedAt };
}

/** Throw away saved edits and go back to the default template (admin only). */
export async function resetDecisionDraft(cycleId: number, group: DecisionGroupKey) {
  const me = await requireAdmin();
  if (!DECISION_GROUPS.includes(group)) return { error: "Unknown page." };
  const existing = await readDecisionDraft(cycleId, group);
  await writeDecisionDraft(cycleId, group, { sent: existing?.sent, updatedAt: new Date().toISOString(), updatedBy: me.email });
  return { ok: true as const };
}
