import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { bootstrapAdmins, bootstrapJudges } from "@/lib/env";

export type AppRole = "admin" | "judge";

/**
 * Resolve a signed-in Google account to an app role, or null if not allowed.
 * Order: env bootstrap allowlists first, then the DB `users` table.
 * DB lookups are best-effort so auth still works before the DB is provisioned.
 */
async function resolveRole(email?: string | null): Promise<AppRole | null> {
  if (!email) return null;
  const addr = email.toLowerCase();

  if (bootstrapAdmins.includes(addr)) return "admin";
  if (bootstrapJudges.includes(addr)) return "judge";

  if (process.env.DATABASE_URL) {
    try {
      const { db } = await import("@/db");
      const { users } = await import("@/db/schema");
      const { eq } = await import("drizzle-orm");
      const row = await db.query.users.findFirst({
        where: eq(users.email, addr),
        columns: { role: true },
      });
      if (row) return row.role;
    } catch {
      // DB not ready — fall through to deny.
    }
  }
  return null;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  session: { strategy: "jwt" },
  pages: { signIn: "/admin/login" },
  callbacks: {
    async signIn({ user }) {
      const role = await resolveRole(user.email);
      return role !== null; // deny non-allowlisted accounts
    },
    async jwt({ token }) {
      // Attach role to the token so pages/middleware can gate without a DB hit.
      token.role = (await resolveRole(token.email)) ?? undefined;
      return token;
    },
    async session({ session, token }) {
      if (session.user) session.user.role = token.role as AppRole | undefined;
      return session;
    },
  },
});
