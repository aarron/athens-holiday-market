"use server";

import { revalidatePath } from "next/cache";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { applications, votes, comments } from "@/db/schema";
import { ensureDbUser, requireAdmin } from "@/lib/admin-auth";
import { sendDecisionEmail } from "@/lib/emails";

type VoteValue = "yes" | "maybe" | "no";
type Status = "submitted" | "under_review" | "accepted" | "waitlisted" | "rejected";

/** Cast or change the current user's vote on an application. */
export async function castVote(applicationId: number, value: VoteValue) {
  const user = await ensureDbUser();
  await db
    .insert(votes)
    .values({ applicationId, userId: user.id, value })
    .onConflictDoUpdate({
      target: [votes.applicationId, votes.userId],
      set: { value, updatedAt: sql`now()` },
    });
  revalidatePath(`/admin/applications/${applicationId}`);
  revalidatePath("/admin");
}

/** Post a note/comment on an application (any jury member or admin). */
export async function addComment(applicationId: number, body: string) {
  const trimmed = body.trim();
  if (!trimmed) return;
  const user = await ensureDbUser();
  await db.insert(comments).values({ applicationId, userId: user.id, body: trimmed.slice(0, 4000) });
  revalidatePath(`/admin/applications/${applicationId}`);
}

/** Set an application's decision status (admin only). */
export async function setStatus(applicationId: number, status: Status) {
  await requireAdmin();
  await db
    .update(applications)
    .set({ status, updatedAt: sql`now()` })
    .where(eq(applications.id, applicationId));
  revalidatePath(`/admin/applications/${applicationId}`);
  revalidatePath("/admin");
}

/** Toggle whether the booth fee has been paid (admin only). */
export async function setBoothFee(applicationId: number, paid: boolean) {
  await requireAdmin();
  await db
    .update(applications)
    .set({ boothFeePaid: paid, boothFeePaidAt: paid ? sql`now()` : null, updatedAt: sql`now()` })
    .where(eq(applications.id, applicationId));
  revalidatePath(`/admin/applications/${applicationId}`);
  revalidatePath("/admin");
}

/** Email the applicant their decision based on current status (admin only). */
export async function sendDecision(applicationId: number) {
  await requireAdmin();
  const app = await db.query.applications.findFirst({ where: eq(applications.id, applicationId) });
  if (!app) return { error: "Not found" };
  if (!["accepted", "waitlisted", "rejected"].includes(app.status)) {
    return { error: "Set a decision (accept / waitlist / reject) before emailing." };
  }
  const res = await sendDecisionEmail(app.email, app.name, app.status as "accepted" | "waitlisted" | "rejected");
  return res;
}
