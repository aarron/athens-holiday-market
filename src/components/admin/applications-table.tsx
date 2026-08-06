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

type SortCol = "name" | "medium" | "yes" | "status" | "fee" | "recent";
const STATUS_RANK: Record<string, number> = {
  accepted: 0,
  waitlisted: 1,
  under_review: 2,
  submitted: 3,
  rejected: 4,
};

export function ApplicationsTable({ rows }: { rows: Row[] }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["key"]>("all");
  const [sortCol, setSortCol] = useState<SortCol>("recent");
  const [dir, setDir] = useState<"asc" | "desc">("desc");

  function sortBy(col: SortCol) {
    if (col === sortCol) {
      setDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(col);
      setDir(col === "name" || col === "medium" ? "asc" : "desc");
    }
  }

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const out = rows.filter((r) => {
      if (needle && !`${r.name} ${r.medium}`.toLowerCase().includes(needle)) return false;
      if (filter === "all") return true;
      if (filter === "pending") return r.status === "submitted" || r.status === "under_review";
      return r.status === filter;
    });
    out.sort((a, b) => {
      let cmp = 0;
      switch (sortCol) {
        case "name":
          cmp = a.name.localeCompare(b.name);
          break;
        case "medium":
          cmp = a.medium.localeCompare(b.medium);
          break;
        case "yes":
          cmp = a.tally.yes - b.tally.yes;
          break;
        case "status":
          cmp = (STATUS_RANK[a.status] ?? 9) - (STATUS_RANK[b.status] ?? 9);
          break;
        case "fee":
          cmp = Number(a.boothFeePaid) - Number(b.boothFeePaid);
          break;
        default:
          cmp = a.submittedAt.localeCompare(b.submittedAt);
      }
      return dir === "asc" ? cmp : -cmp;
    });
    return out;
  }, [rows, q, filter, sortCol, dir]);

  const Th = ({ col, label, className = "" }: { col: SortCol; label: string; className?: string }) => (
    <th className={`px-4 py-3 font-semibold ${className}`}>
      <button
        onClick={() => sortBy(col)}
        className={`inline-flex items-center gap-1 uppercase tracking-wide transition-colors hover:text-ink ${
          sortCol === col ? "text-ink" : ""
        }`}
      >
        {label}
        <span className="text-[0.6rem]">
          {sortCol === col ? (dir === "asc" ? "▲" : "▼") : "↕"}
        </span>
      </button>
    </th>
  );

  return (
    <div className="rounded-xl bg-white shadow-[var(--shadow-card)]">
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
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-ink/10 text-xs text-ink-soft">
              <Th col="name" label="Artist" />
              <Th col="medium" label="Medium" />
              <Th col="yes" label="Votes" />
              <Th col="status" label="Status" />
              <Th col="fee" label="Booth fee" />
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
                    <span className="font-display font-bold group-hover:text-fern-deep">{r.name}</span>
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
