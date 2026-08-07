"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addSubscriber, setSubscriberStatus, removeSubscriber } from "@/lib/subscriber-actions";

export type SubRow = {
  id: number;
  email: string;
  name: string | null;
  isArtist: boolean;
  status: string;
  source: string | null;
  createdAt: string;
};

const STATUS_STYLES: Record<string, string> = {
  subscribed: "bg-fern-soft text-fern-deep",
  pending: "bg-sky-soft text-sky-deep",
  unsubscribed: "bg-[#fde7e6] text-poppy-deep",
};

const FILTERS = ["active", "subscribed", "pending", "unsubscribed", "all"] as const;
const FILTER_LABEL: Record<string, string> = {
  active: "Active",
  subscribed: "Subscribed",
  pending: "Pending",
  unsubscribed: "Unsubscribed",
  all: "All",
};

export function SubscribersTable({ rows }: { rows: SubRow[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("active");
  const [artistOnly, setArtistOnly] = useState(false);

  // add form
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [isArtist, setIsArtist] = useState(false);
  const [addMsg, setAddMsg] = useState("");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (needle && !`${r.email} ${r.name ?? ""}`.toLowerCase().includes(needle)) return false;
      if (filter === "active" && r.status === "unsubscribed") return false;
      else if (filter !== "active" && filter !== "all" && r.status !== filter) return false;
      if (artistOnly && !r.isArtist) return false;
      return true;
    });
  }, [rows, q, filter, artistOnly]);

  const shown = filtered.slice(0, 100);

  function onAdd(e: React.FormEvent) {
    e.preventDefault();
    setAddMsg("");
    start(async () => {
      const r = await addSubscriber({ email, name, isArtist });
      if (r && "ok" in r && r.ok) {
        setEmail("");
        setName("");
        setIsArtist(false);
        setAddMsg("Added ✓");
        router.refresh();
      } else {
        setAddMsg(r?.error ?? "Couldn't add.");
      }
    });
  }

  const act = (fn: () => Promise<unknown>) => start(async () => {
    await fn();
    router.refresh();
  });

  return (
    <div className="space-y-5">
      {/* Add subscriber */}
      <form onSubmit={onAdd} className="rounded-xl bg-white p-4 shadow-[var(--shadow-card)]">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-soft">Email</label>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="person@email.com"
              className="h-10 w-full rounded-lg border-2 border-ink/15 bg-paper px-3 text-sm outline-none focus:border-fern-deep"
            />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-soft">Name (optional)</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-10 w-full rounded-lg border-2 border-ink/15 bg-paper px-3 text-sm outline-none focus:border-fern-deep"
            />
          </div>
          <label className="flex h-10 items-center gap-2 text-sm font-semibold text-ink-soft">
            <input type="checkbox" checked={isArtist} onChange={(e) => setIsArtist(e.target.checked)} className="h-4 w-4 accent-fern-deep" />
            Artist
          </label>
          <button
            disabled={pending}
            className="h-10 rounded-lg bg-ink px-4 text-sm font-display font-bold text-paper hover:bg-ink-soft disabled:opacity-60"
          >
            Add
          </button>
        </div>
        {addMsg && <p className="mt-2 text-sm text-ink-soft">{addMsg}</p>}
      </form>

      {/* Filters */}
      <div className="rounded-xl bg-white shadow-[var(--shadow-card)]">
        <div className="flex flex-wrap items-center gap-3 border-b border-ink/10 p-4">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search email or name…"
            className="h-10 min-w-[180px] flex-1 rounded-lg border-2 border-ink/15 bg-paper px-3 text-sm outline-none focus:border-fern-deep"
          />
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${
                  filter === f ? "bg-ink text-paper" : "bg-cream text-ink-soft hover:bg-cream/70"
                }`}
              >
                {FILTER_LABEL[f]}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-sm font-semibold text-ink-soft">
            <input type="checkbox" checked={artistOnly} onChange={(e) => setArtistOnly(e.target.checked)} className="h-4 w-4 accent-fern-deep" />
            Artists only
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-ink/10 text-xs uppercase tracking-wide text-ink-soft">
                <th className="px-5 py-4 font-semibold">Subscriber</th>
                <th className="px-5 py-4 font-semibold">Status</th>
                <th className="px-5 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.id} className="border-b border-ink/5 last:border-0 hover:bg-cream-soft">
                  <td className="px-5 py-4">
                    <div className="font-display font-bold">{r.name || r.email}</div>
                    {r.name && <div className="text-xs text-ink-soft">{r.email}</div>}
                    {r.isArtist && (
                      <span className="mt-0.5 inline-block rounded-full bg-fuchsia/10 px-2 py-0.5 text-xs font-bold text-fuchsia-deep">
                        Artist
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${STATUS_STYLES[r.status] ?? "bg-cream text-ink-soft"}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-2">
                      {r.status === "unsubscribed" ? (
                        <button
                          disabled={pending}
                          onClick={() => act(() => setSubscriberStatus(r.id, "subscribed"))}
                          className="rounded-lg border-2 border-ink/15 px-2.5 py-1 text-xs font-semibold hover:bg-cream disabled:opacity-60"
                        >
                          Resubscribe
                        </button>
                      ) : (
                        <button
                          disabled={pending}
                          onClick={() => act(() => setSubscriberStatus(r.id, "unsubscribed"))}
                          className="rounded-lg border-2 border-ink/15 px-2.5 py-1 text-xs font-semibold hover:bg-cream disabled:opacity-60"
                        >
                          Unsubscribe
                        </button>
                      )}
                      <button
                        disabled={pending}
                        onClick={() => {
                          if (confirm(`Permanently remove ${r.email}?`)) act(() => removeSubscriber(r.id));
                        }}
                        className="rounded-lg px-2.5 py-1 text-xs font-semibold text-poppy-deep hover:bg-[#fde7e6] disabled:opacity-60"
                      >
                        Remove
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-ink/10 px-5 py-4 text-sm text-ink-soft">
          Showing {shown.length} of {filtered.length}
          {filtered.length > shown.length && " — refine your search to see more"}
        </div>
      </div>
    </div>
  );
}
