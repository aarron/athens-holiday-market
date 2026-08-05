import Link from "next/link";
import { signOut } from "@/auth";
import { requireAuth } from "@/lib/admin-auth";
import { Flower } from "@/components/brand";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAuth();

  return (
    <div className="min-h-screen bg-paper">
      <header className="sticky top-0 z-40 border-b-2 border-ink/10 bg-white">
        <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between gap-4 px-5 sm:px-8">
          <Link href="/admin" className="flex items-center gap-2.5">
            <Flower size={30} color="var(--color-fuchsia)" />
            <span className="font-display text-lg font-extrabold tracking-tight">
              Jury Console
            </span>
            <span className="hidden rounded-full bg-cream px-2.5 py-0.5 text-xs font-semibold text-ink-soft sm:inline">
              Athens Holiday Market
            </span>
          </Link>

          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-ink-soft sm:inline">
              {user.name ?? user.email}
              <span className="ml-2 rounded-full bg-fern-soft px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-fern-deep">
                {user.role}
              </span>
            </span>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/admin/login" });
              }}
            >
              <button className="rounded-md border-2 border-ink/15 px-3 py-1.5 text-sm font-semibold transition-colors hover:bg-cream">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-5 py-8 sm:px-8">{children}</main>
    </div>
  );
}
