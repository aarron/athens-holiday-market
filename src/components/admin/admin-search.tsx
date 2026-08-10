"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { adminSearch, type SearchResults, type PersonHit } from "@/lib/search-actions";
import { BoothFeeBadge } from "@/components/admin/badges";
import { ExternalIcon } from "@/components/icons";

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

  const count = res ? res.people.length + res.subscribers.length : 0;

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
          aria-label="Search applicants and subscribers"
          className="h-12 w-full rounded-lg border-2 border-ink/15 bg-paper pl-11 pr-4 text-base outline-none transition-colors focus:border-fern-deep"
        />
      </div>

      {res && (
        <div className="mt-3">
          {count === 0 ? (
            <p className="px-1 py-3 text-sm text-ink-soft">
              No one matches &ldquo;{res.query}&rdquo;.
            </p>
          ) : (
            <div className="space-y-4">
              {res.people.length > 0 && (
                <section>
                  <h3 className="px-1 pb-1.5 font-display text-xs font-bold uppercase tracking-wide text-ink-soft">
                    People ({res.people.length})
                  </h3>
                  <div className="grid gap-3">
                    {res.people.map((p) => (
                      <PersonCard key={p.email} p={p} />
                    ))}
                  </div>
                </section>
              )}

              {res.subscribers.length > 0 && (
                <section>
                  <h3 className="px-1 pb-1.5 font-display text-xs font-bold uppercase tracking-wide text-ink-soft">
                    Mailing list only ({res.subscribers.length})
                  </h3>
                  <div className="divide-y divide-ink/5 rounded-lg border border-ink/10">
                    {res.subscribers.map((s) => (
                      <div key={s.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-3 py-2.5">
                        <div className="min-w-0">
                          <span className="font-display font-bold">{s.name || "—"}</span>
                          {s.isArtist && (
                            <span className="ml-2 rounded-full bg-fuchsia-soft px-2 py-0.5 text-xs font-bold text-fuchsia-deep">
                              Artist
                            </span>
                          )}
                          <a href={`mailto:${s.email}`} className="block truncate text-sm link">{s.email}</a>
                        </div>
                        <span className={`text-xs font-semibold ${s.status === "unsubscribed" ? "text-poppy-deep" : "text-fern-deep"}`}>
                          {s.status === "unsubscribed" ? "Unsubscribed" : "Subscribed"}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function yearList(p: PersonHit, outcome: "accepted" | "waitlisted") {
  return p.years.filter((y) => y.outcome === outcome).map((y) => y.year);
}

function PersonCard({ p }: { p: PersonHit }) {
  const applied = p.years.map((y) => y.year);
  const accepted = yearList(p, "accepted");
  const waitlisted = yearList(p, "waitlisted");

  return (
    <div className="rounded-lg border border-ink/10 bg-paper/40 p-3.5">
      {/* Header: identity + this-year status */}
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1.5">
        <div className="min-w-0">
          <Link
            href={`/admin/applications/${p.appId}`}
            className="font-display text-base font-bold hover:text-fern-deep"
          >
            {p.name}
          </Link>
          {p.businessName && <span className="ml-2 text-sm text-ink-soft">· {p.businessName}</span>}
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-ink-soft">
            <a href={`mailto:${p.email}`} className="link">{p.email}</a>
            {p.phone && <span>{p.phone}</span>}
            {p.website && (
              <a href={p.website.startsWith("http") ? p.website : `https://${p.website}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 link">
                Website <ExternalIcon size={12} aria-hidden />
              </a>
            )}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {p.current?.accepted && (
            <span className="inline-flex items-center gap-1.5 text-xs">
              <span className="font-semibold text-ink-soft tabular-nums">{p.current.year} fee</span>
              <BoothFeeBadge paid={p.current.boothFeePaid} status="accepted" />
            </span>
          )}
          {p.current && !p.current.accepted && (
            <span className="rounded-full bg-cream px-2 py-0.5 text-xs font-semibold text-ink-soft tabular-nums">
              {p.current.year} applicant
            </span>
          )}
        </div>
      </div>

      {/* History */}
      <div className="mt-2.5 flex flex-col gap-1 text-sm">
        <HistoryLine label="Applied" years={applied} className="text-ink-soft" />
        {accepted.length > 0 && <HistoryLine label="Accepted" years={accepted} className="text-fern-deep" />}
        {waitlisted.length > 0 && <HistoryLine label="Waitlisted" years={waitlisted} className="text-tangerine-deep" />}
      </div>

      {/* Quick links */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm font-semibold">
        <Link href={`/admin/applications/${p.appId}`} className="link">Open application →</Link>
        {p.publishedSlug && (
          <a href={`/artists/${p.publishedSlug}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 link">
            Live page <ExternalIcon size={13} aria-hidden />
          </a>
        )}
        {p.current?.invoiceUrl && (
          <a href={p.current.invoiceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 link">
            PayPal invoice <ExternalIcon size={13} aria-hidden />
          </a>
        )}
        {p.mailing && (
          <span className={`text-xs font-semibold ${p.mailing === "unsubscribed" ? "text-poppy-deep" : "text-ink-soft"}`}>
            {p.mailing === "unsubscribed" ? "Unsubscribed" : "On mailing list"}
          </span>
        )}
      </div>
    </div>
  );
}

function HistoryLine({ label, years, className }: { label: string; years: number[]; className: string }) {
  return (
    <div className="flex gap-2">
      <span className="w-20 shrink-0 font-semibold text-ink-soft">{label}</span>
      <span className={`tabular-nums ${className}`}>{years.join(", ") || "—"}</span>
    </div>
  );
}
