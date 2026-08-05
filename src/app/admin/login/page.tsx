import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { signIn } from "@/auth";
import { getSessionUser } from "@/lib/admin-auth";
import { Flower } from "@/components/brand";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Admin sign in", robots: { index: false } };

export default async function AdminLogin() {
  // Already signed in? Go straight to the dashboard.
  if (await getSessionUser()) redirect("/admin");

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-5">
      <div className="w-full max-w-md rounded-2xl bg-white p-10 text-center shadow-[var(--shadow-lift)]">
        <Flower size={56} color="var(--color-fuchsia)" className="mx-auto" />
        <h1 className="mt-6 text-3xl font-extrabold">Jury &amp; Admin</h1>
        <p className="mt-2 text-ink-soft">
          Sign in with your Google account to review applications and cast votes.
        </p>

        <form
          className="mt-8"
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/admin" });
          }}
        >
          <Button type="submit" size="lg" variant="ink" className="w-full">
            Sign in with Google
          </Button>
        </form>

        <p className="mt-6 text-sm text-ink-soft/70">
          Access is limited to approved jury members and organizers.
        </p>
      </div>
    </div>
  );
}
