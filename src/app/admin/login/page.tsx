import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/admin-auth";
import { Flower } from "@/components/brand";
import { MagicLinkForm } from "@/components/magic-link-form";

export const metadata: Metadata = { title: "Staff login", robots: { index: false } };
export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  invalid: "That login link was invalid. Please request a new one.",
  expired: "That link has expired or was already used. Please request a new one.",
  noaccess: "That email isn't on the jury/organizer list.",
};

export default async function AdminLogin({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getSessionUser();
  if (user) redirect(user.role === "artist" ? "/artist" : "/admin");

  const { error } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-5">
      <div className="w-full max-w-md rounded-xl bg-white p-10 text-center shadow-[var(--shadow-lift)]">
        <Flower size={56} color="var(--color-fuchsia)" className="mx-auto" />
        <h1 className="mt-6 text-3xl font-extrabold">Jury &amp; Admin</h1>
        <p className="mt-2 text-ink-soft">
          Enter your email and we&apos;ll send you a one-time login link.
        </p>

        {error && ERRORS[error] && (
          <p className="mt-4 rounded-lg bg-[#fde7e6] px-4 py-2 text-sm font-medium text-poppy">
            {ERRORS[error]}
          </p>
        )}

        <div className="mt-8 text-left">
          <MagicLinkForm />
        </div>

        <p className="mt-6 text-sm text-ink-soft/70">
          Access is limited to approved jury members and organizers.
        </p>
      </div>
    </div>
  );
}
