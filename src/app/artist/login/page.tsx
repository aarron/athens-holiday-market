import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/admin-auth";
import { Flower } from "@/components/brand";
import { MagicLinkForm } from "@/components/magic-link-form";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Artist sign in", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function ArtistLogin() {
  const user = await getSessionUser();
  if (user?.role === "artist") redirect("/artist");
  if (user) redirect("/admin");

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-5">
      <div className="w-full max-w-md rounded-2xl bg-white p-10 text-center shadow-[var(--shadow-lift)]">
        <Flower size={56} color="var(--color-fuchsia)" spin className="mx-auto" />
        <h1 className="mt-6 text-3xl font-extrabold">Artist sign in</h1>
        <p className="mt-2 text-ink-soft">
          Accepted artists — enter the email you applied with and we&apos;ll send you a link to
          build your {site.name} page.
        </p>

        <div className="mt-8 text-left">
          <MagicLinkForm />
        </div>

        <p className="mt-6 text-sm text-ink-soft/70">
          Only artists accepted into the market can sign in here.
        </p>
      </div>
    </div>
  );
}
