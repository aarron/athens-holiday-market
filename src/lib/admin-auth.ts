import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth, type AppRole } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";

export type SessionUser = {
  email: string;
  name: string | null;
  image: string | null;
  role: AppRole;
};

/** The signed-in, allowlisted user — or null. */
export async function getSessionUser(): Promise<SessionUser | null> {
  // Local-only bypass for previewing the admin without OAuth. Hard-gated to
  // non-production so it can never activate on Vercel.
  if (process.env.NODE_ENV !== "production" && process.env.ADMIN_DEV_BYPASS === "1") {
    return { email: "admin@example.com", name: "Aarron (dev)", image: null, role: "admin" };
  }

  const session = await auth();
  if (!session?.user?.email || !session.user.role) return null;
  return {
    email: session.user.email.toLowerCase(),
    name: session.user.name ?? null,
    image: session.user.image ?? null,
    role: session.user.role,
  };
}

/** Require any allowlisted user; redirect to login otherwise. */
export async function requireAuth(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/admin/login");
  return user;
}

/** Require an admin; judges get bounced to the dashboard. */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireAuth();
  if (user.role !== "admin") redirect("/admin");
  return user;
}

/** Find-or-create the DB user row for the current session (for votes/comments). */
export async function ensureDbUser() {
  const session = await requireAuth();
  let row = await db.query.users.findFirst({ where: eq(users.email, session.email) });
  if (!row) {
    [row] = await db
      .insert(users)
      .values({ email: session.email, name: session.name, image: session.image, role: session.role })
      .returning();
  }
  return row;
}
