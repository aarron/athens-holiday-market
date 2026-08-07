"use client";

import { useRef, useState, useTransition } from "react";
import { ExternalIcon } from "@/components/icons";
import {
  castVote,
  addComment,
  setStatus,
  setBoothFee,
  publishArtist,
  unpublishArtist,
  sendArtistLink,
  deleteApplication,
} from "@/lib/admin-actions";

type Vote = "yes" | "maybe" | "no";

const VOTE_OPTS: [Vote, string, string][] = [
  ["yes", "Yes", "var(--color-fern-deep)"],
  ["maybe", "Maybe", "var(--color-tangerine)"],
  ["no", "No", "var(--color-poppy)"],
];

export function VoteButtons({ applicationId, myVote }: { applicationId: number; myVote?: Vote }) {
  const [pending, start] = useTransition();
  const [current, setCurrent] = useState<Vote | undefined>(myVote);
  return (
    <div className="flex gap-2">
      {VOTE_OPTS.map(([v, label, color]) => {
        const active = current === v;
        return (
          <button
            key={v}
            disabled={pending}
            onClick={() => {
              setCurrent(v);
              start(() => castVote(applicationId, v));
            }}
            className={`h-11 flex-1 rounded-lg border-2 font-display font-bold transition-all disabled:opacity-60 ${
              active ? "text-white" : "text-ink hover:bg-cream"
            }`}
            style={active ? { backgroundColor: color, borderColor: color } : { borderColor: "var(--color-ink)", opacity: 0.9 }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

export function CommentBox({ applicationId }: { applicationId: number }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [pending, start] = useTransition();
  return (
    <div className="mt-4">
      <textarea
        ref={ref}
        rows={3}
        placeholder="Add a note for the jury…"
        className="w-full rounded-lg border-2 border-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-fern-deep"
      />
      <button
        disabled={pending}
        onClick={() => {
          const body = ref.current?.value ?? "";
          if (!body.trim()) return;
          start(async () => {
            await addComment(applicationId, body);
            if (ref.current) ref.current.value = "";
          });
        }}
        className="mt-2 rounded-lg bg-ink px-4 py-2 text-sm font-display font-semibold text-paper transition-colors hover:bg-ink-soft disabled:opacity-60"
      >
        {pending ? "Posting…" : "Post note"}
      </button>
    </div>
  );
}

const STATUS_OPTS: [string, string, string][] = [
  ["under_review", "Under review", "var(--color-sky)"],
  ["accepted", "Accept", "var(--color-fern-deep)"],
  ["waitlisted", "Waitlist", "var(--color-tangerine)"],
  ["rejected", "Reject", "var(--color-poppy)"],
];

export function DecisionControls({
  applicationId,
  status,
  boothFeePaid,
}: {
  applicationId: number;
  status: string;
  boothFeePaid: boolean;
}) {
  const [pending, start] = useTransition();
  const [cur, setCur] = useState(status);
  const [paid, setPaid] = useState(boothFeePaid);

  return (
    <div className="space-y-5">
      <div>
        <p className="font-display text-sm font-bold uppercase tracking-wide text-ink-soft">Decision</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {STATUS_OPTS.map(([s, label, color]) => {
            const active = cur === s;
            return (
              <button
                key={s}
                disabled={pending}
                onClick={() => {
                  setCur(s);
                  start(() => setStatus(applicationId, s as never));
                }}
                className="h-11 rounded-lg border-2 font-display text-sm font-bold transition-all disabled:opacity-60"
                style={active ? { backgroundColor: color, borderColor: color, color: "#fff" } : { borderColor: "rgba(23,22,27,0.15)" }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="font-display text-sm font-bold uppercase tracking-wide text-ink-soft">Booth fee</p>
        <button
          disabled={pending || cur !== "accepted"}
          onClick={() => {
            const next = !paid;
            setPaid(next);
            start(() => setBoothFee(applicationId, next));
          }}
          className={`mt-2 h-11 w-full rounded-lg border-2 font-display text-sm font-bold transition-all disabled:opacity-50 ${
            paid ? "border-fern-deep bg-fern-soft text-fern-deep" : "border-ink/15 text-ink hover:bg-cream"
          }`}
        >
          {cur !== "accepted" ? "Accept first" : paid ? "✓ Paid — mark unpaid" : "Mark booth fee paid"}
        </button>
      </div>

    </div>
  );
}

export function PublishControls({
  applicationId,
  published: initialPublished,
  slug: initialSlug,
}: {
  applicationId: number;
  published: boolean;
  slug?: string;
}) {
  const [pending, start] = useTransition();
  const [published, setPublished] = useState(initialPublished);
  const [slug, setSlug] = useState(initialSlug);
  const [msg, setMsg] = useState("");

  return (
    <div className="rounded-xl bg-white p-5 shadow-[var(--shadow-card)]">
      <h2 className="font-display text-sm font-bold uppercase tracking-wide text-ink-soft">
        Public profile
      </h2>
      {published && slug ? (
        <div className="mt-3 space-y-2">
          <a
            href={`/artists/${slug}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-1.5 rounded-lg bg-fern-soft px-4 py-2.5 text-center text-sm font-display font-bold text-fern-deep"
          >
            View public page
            <ExternalIcon size={14} aria-hidden />
          </a>
          <button
            disabled={pending}
            onClick={() =>
              start(async () => {
                await unpublishArtist(applicationId);
                setPublished(false);
                setMsg("Hidden from the directory.");
              })
            }
            className="w-full rounded-lg border-2 border-ink/15 px-4 py-2 text-sm font-display font-semibold hover:bg-cream disabled:opacity-60"
          >
            Unpublish
          </button>
        </div>
      ) : (
        <button
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await publishArtist(applicationId);
              if (r && "ok" in r && r.ok) {
                setPublished(true);
                setSlug(r.slug);
                setMsg("Published to the directory ✓");
              } else {
                setMsg((r && "error" in r && r.error) || "Couldn't publish.");
              }
            })
          }
          className="mt-3 w-full rounded-lg bg-fern-deep px-4 py-2.5 text-sm font-display font-bold text-white hover:opacity-90 disabled:opacity-60"
        >
          {pending ? "Publishing…" : "Publish to directory"}
        </button>
      )}
      {msg && <p className="mt-2 text-sm text-ink-soft">{msg}</p>}
    </div>
  );
}

export function SendArtistLinkButton({ email }: { email: string }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState("");
  return (
    <div>
      <button
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await sendArtistLink(email);
            setMsg(
              r && "ok" in r && r.ok
                ? r.skipped
                  ? "Link created (email not configured yet)."
                  : "Edit link emailed ✓"
                : r?.error || "Couldn't send.",
            );
          })
        }
        className="w-full rounded-lg border-2 border-ink/15 px-4 py-2.5 text-sm font-display font-semibold hover:bg-cream disabled:opacity-60"
      >
        {pending ? "Sending…" : "Email artist their edit link"}
      </button>
      {msg && <p className="mt-2 text-sm text-ink-soft">{msg}</p>}
    </div>
  );
}

/** Admin-only, irreversible delete of an application + everything derived from it. */
export function DeleteApplicationButton({ applicationId, name }: { applicationId: number; name: string }) {
  const [armed, setArmed] = useState(false);
  const [pending, start] = useTransition();

  if (!armed) {
    return (
      <button
        onClick={() => setArmed(true)}
        className="rounded-lg border-2 border-poppy/40 px-4 py-2.5 text-sm font-display font-bold text-poppy transition-colors hover:bg-poppy hover:text-white"
      >
        Delete this artist…
      </button>
    );
  }

  return (
    <div className="rounded-xl border-2 border-poppy/40 bg-poppy/5 p-4">
      <p className="text-sm font-semibold text-ink">
        Permanently delete <span className="font-extrabold">{name}</span>?
      </p>
      <p className="mt-1 text-sm text-ink-soft">
        This removes the application, its photos, all votes and comments, and its published artist
        page (if any). This can&apos;t be undone.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          disabled={pending}
          onClick={() => start(() => deleteApplication(applicationId))}
          className="rounded-lg bg-poppy px-5 py-2.5 text-sm font-display font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {pending ? "Deleting…" : "Yes, delete permanently"}
        </button>
        <button
          disabled={pending}
          onClick={() => setArmed(false)}
          className="rounded-lg border-2 border-ink/15 px-5 py-2.5 text-sm font-display font-semibold hover:bg-cream disabled:opacity-60"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
