import Link from "next/link";
import { requireArtist } from "@/lib/admin-auth";
import { signOutAction } from "@/lib/auth-actions";
import { Flower } from "@/components/brand";

export default async function ArtistPortalLayout({ children }: { children: React.ReactNode }) {
  const user = await requireArtist();
  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b-2 border-ink/10 bg-white">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between gap-4 px-5">
          <Link href="/artist" className="flex items-center gap-2.5">
            <Flower size={28} color="var(--color-fuchsia)" />
            <span className="font-display text-lg font-extrabold tracking-tight">Artist portal</span>
          </Link>
          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-ink-soft sm:inline">{user.email}</span>
            <form action={signOutAction}>
              <button className="rounded-md border-2 border-ink/15 px-3 py-1.5 text-sm font-semibold hover:bg-cream">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-5 py-8">{children}</main>
    </div>
  );
}
