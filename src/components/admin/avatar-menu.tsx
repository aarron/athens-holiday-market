"use client";

import { useEffect, useRef, useState } from "react";
import { signOutAction } from "@/lib/auth-actions";

const COLORS = ["#3f7d22", "#d21c96", "#17a898", "#f07f22", "#9c1c50", "#45bced"];

function initialsOf(name: string | null, email: string) {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

function colorFor(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return COLORS[h % COLORS.length];
}

export function AvatarMenu({
  name,
  email,
  role,
}: {
  name: string | null;
  email: string;
  role: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white ring-1 ring-black/10 transition-transform hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fern-deep"
        style={{ backgroundColor: colorFor(email) }}
      >
        {initialsOf(name, email)}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-60 rounded-xl border border-ink/10 bg-white p-2 shadow-[var(--shadow-lift)]"
        >
          <div className="px-3 py-2">
            {name && <p className="truncate text-sm font-bold">{name}</p>}
            <p className="truncate text-xs text-ink-soft">{email}</p>
            <span className="mt-1.5 inline-block rounded-full bg-fern-soft px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-fern-deep">
              {role}
            </span>
          </div>
          <div className="my-1 border-t border-ink/10" />
          <form action={signOutAction}>
            <button
              role="menuitem"
              className="w-full rounded-md px-3 py-2 text-left text-sm font-semibold transition-colors hover:bg-cream"
            >
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
