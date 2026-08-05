"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { StatusBadge, BoothFeeBadge, VoteTally, type Tally } from "@/components/admin/badges";
import { SafeImg } from "@/components/admin/safe-img";

export type Row = {
  id: number;
  name: string;
  medium: string;
  submittedAt: string;
  tally: Tally;
  status: string;
  boothFeePaid: boolean;
  photo: string | null;
};

const FILTERS = [
  { key: "all", label: "All" },
  { key: "pending", label: "To review" },
  { key: "accepted", label: "Accepted" },
  { key: "waitlisted", label: "Waitlisted" },
  { key: "rejected", label: "Rejected" },
] as const;

type SortKey = "recent" | "name" | "yes";

export function ApplicationsTable({ rows }: { rows: Row[] }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["key"]>("all");
  const [sort, setSort] = useState<SortKey>("recent");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let out = rows.filter((r) => {
      if (needle && !`${r.name} ${r.medium}`.toLowerCase().includes(needle)) return false;
      if (filter === "all") return true;
      if (filter === "pending") return r.status === "submitted" || r.status === "under_review";
      return r.status === filter;
    });
    out = [...out].sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "yes") return b.tally.yes - a.tally.yes;
      return b.submittedAt.localeCompare(a.submittedAt);
    });
    return out;
  }, [rows, q, filter, sort]);

  return (
    <div className="rounded-xl bg-white shadow-[var(--shadow-card)]">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 border-b border-ink/10 p-4">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search artists or mediums…"
          className="h-10 flex-1 rounded-md border-2 border-ink/15 bg-paper px-3 text-sm outline-none focus:border-fern-deep"
        />
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${
                filter === f.key ? "bg-ink text-paper" : "bg-cream text-ink-soft hover:bg-cream/70"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="h-10 rounded-md border-2 border-ink/15 bg-paper px-2 text-sm outline-none"
        >
          <option value="recent">Newest</option>
          <option value="name">Name A–Z</option>
          <option value="yes">Most “yes”</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-ink/10 text-xs uppercase tracking-wide text-ink-soft">
              <th className="px-4 py-3 font-semibold">Artist</th>
              <th className="px-4 py-3 font-semibold">Medium</th>
              <th className="px-4 py-3 font-semibold">Votes</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Booth fee</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="group border-b border-ink/5 last:border-0 hover:bg-cream-soft">
                <td className="px-4 py-3">
                  <Link href={`/admin/applications/${r.id}`} className="flex items-center gap-3">
                    <SafeImg
                      src={r.photo}
                      alt=""
                      flowerSize={16}
                      className="h-10 w-10 shrink-0 rounded-md object-cover"
                    />
                    <span className="font-display font-bold group-hover:text-fern-deep">
                      {r.name}
                    </span>
                  </Link>
                </td>
                <td className="max-w-[260px] px-4 py-3 text-ink-soft">
                  <span className="line-clamp-1">{r.medium}</span>
                </td>
                <td className="px-4 py-3">
                  <VoteTally tally={r.tally} />
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={r.status} />
                </td>
                <td className="px-4 py-3">
                  <BoothFeeBadge paid={r.boothFeePaid} status={r.status} />
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-ink-soft">
                  No applications match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="border-t border-ink/10 px-4 py-3 text-sm text-ink-soft">
        {filtered.length} of {rows.length} applications
      </div>
    </div>
  );
}
