"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { StatusBadge, BoothFeeBadge, VoteTally, type Tally } from "@/components/admin/badges";
import { SafeImg } from "@/components/admin/safe-img";
import { ChevronUpIcon, ChevronDownIcon } from "@/components/icons";

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

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "To review" },
  { value: "accepted", label: "Accepted" },
  { value: "waitlisted", label: "Waitlisted" },
  { value: "rejected", label: "Rejected" },
] as const;

const PAYMENT_OPTIONS = [
  { value: "all", label: "Any payment" },
  { value: "paid", label: "Fee paid" },
  { value: "unpaid", label: "Fee unpaid" },
] as const;

type SortCol = "name" | "medium" | "yes" | "status" | "fee" | "recent";
const STATUS_RANK: Record<string, number> = {
  accepted: 0,
  waitlisted: 1,
  under_review: 2,
  submitted: 3,
  rejected: 4,
};

const selectCls =
  "h-10 rounded-lg border-2 border-ink/15 bg-paper px-2.5 text-sm font-semibold text-ink outline-none focus:border-fern-deep";

export function ApplicationsTable({ rows }: { rows: Row[] }) {
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_OPTIONS)[number]["value"]>("all");
  const [paymentFilter, setPaymentFilter] =
    useState<(typeof PAYMENT_OPTIONS)[number]["value"]>("all");
  const [sortCol, setSortCol] = useState<SortCol>("recent");
  const [dir, setDir] = useState<"asc" | "desc">("desc");

  function sortBy(col: SortCol) {
    if (col === sortCol) setDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortCol(col);
      setDir(col === "name" || col === "medium" ? "asc" : "desc");
    }
  }

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const out = rows.filter((r) => {
      if (needle && !`${r.name} ${r.medium}`.toLowerCase().includes(needle)) return false;
      // status
      if (statusFilter === "pending") {
        if (r.status !== "submitted" && r.status !== "under_review") return false;
      } else if (statusFilter !== "all" && r.status !== statusFilter) {
        return false;
      }
      // payment (only meaningful for accepted artists)
      if (paymentFilter === "paid" && !(r.status === "accepted" && r.boothFeePaid)) return false;
      if (paymentFilter === "unpaid" && !(r.status === "accepted" && !r.boothFeePaid)) return false;
      return true;
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
  }, [rows, q, statusFilter, paymentFilter, sortCol, dir]);

  const hasFilters = q || statusFilter !== "all" || paymentFilter !== "all";

  const Th = ({ col, label }: { col: SortCol; label: string }) => (
    <th className="px-5 py-4 font-semibold">
      <button
        onClick={() => sortBy(col)}
        className={`inline-flex items-center gap-1 uppercase tracking-wide transition-colors hover:text-ink ${
          sortCol === col ? "text-ink" : ""
        }`}
      >
        {label}
        {sortCol === col ? (
          dir === "asc" ? (
            <ChevronUpIcon size={12} aria-hidden />
          ) : (
            <ChevronDownIcon size={12} aria-hidden />
          )
        ) : (
          <ChevronDownIcon size={12} className="opacity-30" aria-hidden />
        )}
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
          className="h-10 min-w-[180px] flex-1 rounded-lg border-2 border-ink/15 bg-paper px-3 text-sm outline-none focus:border-fern-deep"
        />
        <span className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Filter by:</span>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className={selectCls}
          aria-label="Filter by status"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select
          value={paymentFilter}
          onChange={(e) => setPaymentFilter(e.target.value as typeof paymentFilter)}
          className={selectCls}
          aria-label="Filter by payment"
        >
          {PAYMENT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {hasFilters && (
          <button
            onClick={() => {
              setQ("");
              setStatusFilter("all");
              setPaymentFilter("all");
            }}
            className="h-10 rounded-lg px-3 text-sm font-semibold text-ink-soft hover:bg-cream"
          >
            Clear
          </button>
        )}
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
                <td className="px-5 py-4">
                  <Link href={`/admin/applications/${r.id}`} className="flex items-center gap-3">
                    <SafeImg
                      src={r.photo}
                      alt=""
                      flowerSize={16}
                      className="h-10 w-10 shrink-0 rounded-lg object-cover"
                    />
                    <span className="font-display font-bold group-hover:text-fern-deep">{r.name}</span>
                  </Link>
                </td>
                <td className="max-w-[260px] px-5 py-4 text-ink-soft">
                  <span className="line-clamp-1">{r.medium}</span>
                </td>
                <td className="px-5 py-4">
                  <VoteTally tally={r.tally} />
                </td>
                <td className="px-5 py-4">
                  <StatusBadge status={r.status} />
                </td>
                <td className="px-5 py-4">
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

      <div className="border-t border-ink/10 px-5 py-4 text-sm text-ink-soft">
        {filtered.length} of {rows.length} applications
      </div>
    </div>
  );
}
