import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getSession } from "@/lib/session";
import type { AppRole } from "@/lib/roles";

export type SessionUser = {
  email: string;
  name: string | null;
  role: AppRole;
  artistId?: number;
};

/** The signed-in user — or null. */
export async function getSessionUser(): Promise<SessionUser | null> {
  // Local-only bypass for previewing the admin without email. Hard-gated to
  // non-production so it can never activate on Vercel.
  if (process.env.NODE_ENV !== "production" && process.env.ADMIN_DEV_BYPASS === "1") {
    return { email: process.env.ADMIN_DEV_EMAIL || "dev@example.com", name: "Dev admin", role: "admin" };
  }
  const s = await getSession();
  if (!s) return null;
  return { email: s.email, name: s.name ?? null, role: s.role, artistId: s.artistId };
}

/** Require any signed-in user; redirect to login otherwise. */
export async function requireAuth(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/admin/login");
  return user;
}

/** Require staff (admin or judge); artists get sent to their own portal. */
export async function requireStaff(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/admin/login");
  if (user.role === "artist") redirect("/artist");
  return user;
}

/** Require an admin; judges get bounced to the dashboard. */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireStaff();
  if (user.role !== "admin") redirect("/admin");
  return user;
}

/** Require a signed-in artist; redirect to the artist login otherwise. */
export async function requireArtist(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user || user.role !== "artist") redirect("/artist/login");
  return user;
}

/** Find-or-create the DB user row for the current staff session (votes/comments). */
export async function ensureDbUser() {
  const s = await requireStaff();
  let row = await db.query.users.findFirst({ where: eq(users.email, s.email) });
  if (!row) {
    [row] = await db
      .insert(users)
      .values({ email: s.email, name: s.name, role: s.role === "admin" ? "admin" : "judge" })
      .returning();
  }
  return row;
}
