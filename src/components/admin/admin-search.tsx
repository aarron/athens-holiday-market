"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { adminSearch, type SearchResults } from "@/lib/search-actions";
import { StatusBadge, BoothFeeBadge } from "@/components/admin/badges";

function normalizedStatus(s: string) {
  // We waitlist rather than reject — show legacy "rejected" as waitlisted.
  return s === "rejected" ? "waitlisted" : s;
}

export function AdminSearch() {
  const [q, setQ] = useState("");
  const [res, setRes] = useState<SearchResults | null>(null);
  const [, start] = useTransition();
  const seq = useRef(0);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setRes(null);
      return;
    }
    const id = ++seq.current;
    const timer = setTimeout(() => {
      start(async () => {
        const r = await adminSearch(term);
        if (id === seq.current) setRes(r); // drop stale responses
      });
    }, 250);
    return () => clearTimeout(timer);
  }, [q]);

  const count = res ? res.applications.length + res.subscribers.length : 0;

  return (
    <div className="rounded-xl bg-white p-4 shadow-[var(--shadow-card)] sm:p-5">
      <div className="relative">
        <svg
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-soft"
          width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2.2" strokeLinecap="round" aria-hidden
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.2-3.2" />
        </svg>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          type="search"
          placeholder="Search everyone — name, email, business, website…"
          aria-label="Search applications and subscribers"
          className="h-12 w-full rounded-lg border-2 border-ink/15 bg-paper pl-11 pr-4 text-base outline-none transition-colors focus:border-fern-deep"
        />
      </div>

      {res && (
        <div className="mt-3">
          {count === 0 ? (
            <p className="px-1 py-3 text-sm text-ink-soft">
              No people match &ldquo;{res.query}&rdquo;.
            </p>
          ) : (
            <div className="space-y-4">
              {res.applications.length > 0 && (
                <Group label={`Applications (${res.applications.length})`}>
                  {res.applications.map((a) => (
                    <Link
                      key={a.id}
                      href={`/admin/applications/${a.id}`}
                      className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 rounded-lg px-3 py-2.5 hover:bg-cream-soft"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-baseline gap-x-2">
                          <span className="font-display font-bold">{a.name}</span>
                          {a.businessName && (
                            <span className="text-sm text-ink-soft">· {a.businessName}</span>
                          )}
                        </div>
                        <div className="truncate text-sm text-ink-soft">{a.email}</div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="rounded-full bg-cream px-2 py-0.5 text-xs font-bold text-ink-soft tabular-nums">
                          {a.year}
                        </span>
                        <StatusBadge status={normalizedStatus(a.status)} />
                        <BoothFeeBadge paid={a.boothFeePaid} status={a.status} />
                      </div>
                    </Link>
                  ))}
                </Group>
              )}

              {res.subscribers.length > 0 && (
                <Group label={`Subscribers (${res.subscribers.length})`}>
                  {res.subscribers.map((s) => (
                    <div
                      key={s.id}
                      className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 rounded-lg px-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-baseline gap-x-2">
                          <span className="font-display font-bold">{s.name || "—"}</span>
                          {s.isArtist && (
                            <span className="rounded-full bg-fuchsia-soft px-2 py-0.5 text-xs font-bold text-fuchsia-deep">
                              Artist
                            </span>
                          )}
                        </div>
                        <a href={`mailto:${s.email}`} className="truncate text-sm link">
                          {s.email}
                        </a>
                      </div>
                      <div className="flex shrink-0 items-center gap-2 text-xs text-ink-soft">
                        <span className={s.status === "unsubscribed" ? "font-semibold text-poppy-deep" : "font-semibold text-fern-deep"}>
                          {s.status === "unsubscribed" ? "Unsubscribed" : "Subscribed"}
                        </span>
                        {s.subscribedAt && (
                          <span className="tabular-nums">· {new Date(s.subscribedAt).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </Group>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="px-3 pb-1 font-display text-xs font-bold uppercase tracking-wide text-ink-soft">
        {label}
      </h3>
      <div className="divide-y divide-ink/5">{children}</div>
    </div>
  );
}
