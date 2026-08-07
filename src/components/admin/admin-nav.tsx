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

export function AdminNav({ role, pendingReviews }: { role: string; pendingReviews: number }) {
  const path = usePathname();

  const items: Item[] = [
    { href: "/admin", label: "Dashboard", match: (p) => p === "/admin" || p.startsWith("/admin/applications") },
    { href: "/admin/artists", label: "Artist pages", match: (p) => p.startsWith("/admin/artists"), badge: pendingReviews },
    // Decisions live inside the Email hub, so both paths light up "Email & Text".
    { href: "/admin/broadcasts", label: "Email & Text", adminOnly: true, match: (p) => p.startsWith("/admin/broadcasts") || p.startsWith("/admin/decisions") },
    { href: "/admin/subscribers", label: "Subscribers", adminOnly: true, match: (p) => p.startsWith("/admin/subscribers") },
  ];

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
              className={`relative rounded-md px-3 py-2 text-sm font-semibold transition-colors ${
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
