"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import Image from "next/image";
import { site } from "@/lib/site";
import { ButtonLink } from "@/components/ui/button";

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b-2 border-ink/10 bg-paper/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-5 sm:px-8">
        <Link
          href="/"
          aria-label={site.name}
          className="relative z-10 mt-2 shrink-0 self-start transition-transform duration-300 hover:scale-[1.02]"
        >
          <span className="block rounded-xl bg-white p-2.5 shadow-[var(--shadow-lift)] ring-1 ring-black/5">
            <Image
              src="/brand/logo.png"
              alt={site.name}
              width={1000}
              height={920}
              priority
              className="h-[70px] w-auto sm:h-[86px]"
            />
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {site.nav.map((item) => {
            const active =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative rounded-md px-3.5 py-2 font-display text-[0.95rem] font-medium transition-colors ${
                  active ? "text-fuchsia" : "text-ink hover:text-fuchsia"
                }`}
              >
                {item.label}
                {active && (
                  <span className="absolute inset-x-3.5 -bottom-0.5 h-0.5 rounded-full bg-fuchsia" />
                )}
              </Link>
            );
          })}
          <ButtonLink href="/apply" size="md" className="ml-2">
            Apply to sell
          </ButtonLink>
        </nav>

        <button
          type="button"
          aria-label="Toggle menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="flex h-11 w-11 items-center justify-center rounded-md border-2 border-ink/15 md:hidden"
        >
          <span className="relative block h-4 w-5">
            <span
              className={`absolute left-0 h-0.5 w-5 bg-ink transition-all ${open ? "top-2 rotate-45" : "top-0"}`}
            />
            <span
              className={`absolute left-0 top-2 h-0.5 w-5 bg-ink transition-all ${open ? "opacity-0" : ""}`}
            />
            <span
              className={`absolute left-0 h-0.5 w-5 bg-ink transition-all ${open ? "top-2 -rotate-45" : "top-4"}`}
            />
          </span>
        </button>
      </div>

      {open && (
        <nav className="border-t-2 border-ink/10 bg-paper px-5 pb-5 pt-2 md:hidden">
          {site.nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="block rounded-md px-3 py-3 font-display text-lg font-medium text-ink hover:bg-cream"
            >
              {item.label}
            </Link>
          ))}
          <ButtonLink href="/apply" size="lg" className="mt-2 w-full" onClick={() => setOpen(false)}>
            Apply to sell
          </ButtonLink>
        </nav>
      )}
    </header>
  );
}
