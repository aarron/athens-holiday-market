import Link from "next/link";
import Image from "next/image";
import { requireStaff } from "@/lib/admin-auth";
import { countPendingArtistReviews } from "@/lib/admin-data";
import { signOutAction } from "@/lib/auth-actions";
import { AdminNav } from "@/components/admin/admin-nav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireStaff();
  const pendingReviews = await countPendingArtistReviews();

  return (
    <div className="min-h-screen bg-paper">
      <header className="sticky top-0 z-40 border-b-2 border-ink/10 bg-white">
        <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between gap-4 px-5 sm:px-8">
          <Link
            href="/admin"
            aria-label="Athens Holiday Market — Jury Console"
            className="relative z-10 mt-2 shrink-0 self-start transition-transform duration-300 hover:scale-[1.02]"
          >
            <span className="block rounded-xl bg-white p-2.5 shadow-[var(--shadow-lift)] ring-1 ring-black/5">
              <Image
                src="/brand/logo.png"
                alt="Athens Holiday Market"
                width={1000}
                height={920}
                priority
                className="h-14 w-auto sm:h-16"
              />
            </span>
          </Link>

          <AdminNav role={user.role} pendingReviews={pendingReviews} />

          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-ink-soft sm:inline">
              {user.name ?? user.email}
              <span className="ml-2 rounded-full bg-fern-soft px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-fern-deep">
                {user.role}
              </span>
            </span>
            <form action={signOutAction}>
              <button className="rounded-md border-2 border-ink/15 px-3 py-1.5 text-sm font-semibold transition-colors hover:bg-cream">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-5 pb-10 pt-24 sm:px-8">{children}</main>
    </div>
  );
}
