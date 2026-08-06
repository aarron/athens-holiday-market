"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { z } from "zod";
import { db } from "@/db";
import { subscribers } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-auth";

const addSchema = z.object({
  email: z.string().trim().email(),
  name: z.string().trim().max(120).optional(),
  isArtist: z.boolean().optional(),
});

export async function addSubscriber(input: z.input<typeof addSchema>) {
  await requireAdmin();
  const parsed = addSchema.safeParse(input);
  if (!parsed.success) return { error: "Enter a valid email address." };
  const { email, name, isArtist } = parsed.data;
  await db
    .insert(subscribers)
    .values({
      email: email.toLowerCase(),
      name: name || null,
      isArtist: !!isArtist,
      status: "subscribed",
      unsubscribeToken: randomUUID(),
      source: "admin",
      confirmedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: subscribers.email,
      set: { status: "subscribed", isArtist: !!isArtist, ...(name ? { name } : {}) },
    });
  revalidatePath("/admin/subscribers");
  return { ok: true };
}

export async function setSubscriberStatus(id: number, status: "subscribed" | "unsubscribed") {
  await requireAdmin();
  await db.update(subscribers).set({ status }).where(eq(subscribers.id, id));
  revalidatePath("/admin/subscribers");
  return { ok: true };
}

export async function removeSubscriber(id: number) {
  await requireAdmin();
  await db.delete(subscribers).where(eq(subscribers.id, id));
  revalidatePath("/admin/subscribers");
  return { ok: true };
}
