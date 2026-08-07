import Link from "next/link";
import Image from "next/image";
import { requireStaff } from "@/lib/admin-auth";
import { countPendingArtistReviews } from "@/lib/admin-data";
import { AdminNav, AdminMobileNav } from "@/components/admin/admin-nav";
import { AvatarMenu } from "@/components/admin/avatar-menu";

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
                src="/brand/logo-athens-holiday-market.svg"
                alt="Athens Holiday Market"
                width={1024}
                height={942}
                priority
                className="h-20 w-auto sm:h-24"
              />
            </span>
          </Link>

          <AdminNav role={user.role} pendingReviews={pendingReviews} />

          <AvatarMenu name={user.name ?? null} email={user.email} role={user.role} />
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-5 pb-10 pt-24 sm:px-8">
        <AdminMobileNav role={user.role} pendingReviews={pendingReviews} />
        {children}
      </main>
    </div>
  );
}
