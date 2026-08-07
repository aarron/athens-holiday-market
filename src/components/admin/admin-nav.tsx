"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = {
  href: string;
  label: string;
  match: (p: string) => boolean;
  adminOnly?: boolean;
  badge?: number;
};

function buildItems(role: string, pendingReviews: number): Item[] {
  const items: Item[] = [
    { href: "/admin", label: "Dashboard", match: (p) => p === "/admin" || p.startsWith("/admin/applications") },
    { href: "/admin/artists", label: "Artist pages", match: (p) => p.startsWith("/admin/artists"), badge: pendingReviews },
    { href: "/admin/social-kit", label: "Social kit", match: (p) => p.startsWith("/admin/social-kit") },
    // Decisions live inside the Email hub, so both paths light up "Email & Text".
    { href: "/admin/broadcasts", label: "Email & Text", adminOnly: true, match: (p) => p.startsWith("/admin/broadcasts") || p.startsWith("/admin/decisions") },
    { href: "/admin/subscribers", label: "Subscribers", adminOnly: true, match: (p) => p.startsWith("/admin/subscribers") },
  ];
  return items.filter((i) => !i.adminOnly || role === "admin");
}

function Badge({ n }: { n?: number }) {
  if (!n) return null;
  return (
    <span className="ml-1.5 rounded-full bg-tangerine px-1.5 py-0.5 text-xs font-bold text-white">{n}</span>
  );
}

/** Full-width scrollable nav strip shown under the header on small screens. */
export function AdminMobileNav({ role, pendingReviews }: { role: string; pendingReviews: number }) {
  const path = usePathname();
  const items = buildItems(role, pendingReviews);
  return (
    <nav
      aria-label="Admin sections"
      className="mb-6 flex gap-1.5 overflow-x-auto rounded-xl bg-white p-2 shadow-[var(--shadow-card)] md:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
    >
      {items.map((i) => {
        const active = i.match(path);
        return (
          <Link
            key={i.href}
            href={i.href}
            aria-current={active ? "page" : undefined}
            className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${
              active ? "bg-fern-soft text-fern-deep" : "text-ink hover:bg-cream"
            }`}
          >
            {i.label}
            <Badge n={i.badge} />
          </Link>
        );
      })}
    </nav>
  );
}

export function AdminNav({ role, pendingReviews }: { role: string; pendingReviews: number }) {
  const path = usePathname();
  const items = buildItems(role, pendingReviews);

  return (
    <nav className="hidden items-center gap-1 md:flex">
      {items
        .filter((i) => !i.adminOnly || role === "admin")
        .map((i) => {
          const active = i.match(path);
          return (
            <Link
              key={i.href}
              href={i.href}
              aria-current={active ? "page" : undefined}
              className={`relative rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                active ? "bg-fern-soft text-fern-deep" : "text-ink hover:bg-cream"
              }`}
            >
              {i.label}
              {i.badge ? (
                <span className="ml-1.5 rounded-full bg-tangerine px-1.5 py-0.5 text-xs font-bold text-white">
                  {i.badge}
                </span>
              ) : null}
            </Link>
          );
        })}
    </nav>
  );
}
