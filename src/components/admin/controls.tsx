"use client";

import { useRef, useState, useTransition } from "react";
import { castVote, addComment, setStatus, setBoothFee, sendDecision } from "@/lib/admin-actions";

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
            className={`h-11 flex-1 rounded-md border-2 font-display font-bold transition-all disabled:opacity-60 ${
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
        className="w-full rounded-md border-2 border-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-fern-deep"
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
        className="mt-2 rounded-md bg-ink px-4 py-2 text-sm font-display font-semibold text-paper transition-colors hover:bg-ink-soft disabled:opacity-60"
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
  const [emailMsg, setEmailMsg] = useState("");

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
                className="h-11 rounded-md border-2 font-display text-sm font-bold transition-all disabled:opacity-60"
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
          className={`mt-2 h-11 w-full rounded-md border-2 font-display text-sm font-bold transition-all disabled:opacity-50 ${
            paid ? "border-fern-deep bg-fern-soft text-fern-deep" : "border-ink/15 text-ink hover:bg-cream"
          }`}
        >
          {cur !== "accepted" ? "Accept first" : paid ? "✓ Paid — mark unpaid" : "Mark booth fee paid"}
        </button>
      </div>

      <div>
        <p className="font-display text-sm font-bold uppercase tracking-wide text-ink-soft">
          Notify applicant
        </p>
        <button
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await sendDecision(applicationId);
              setEmailMsg(
                res && "error" in res && res.error
                  ? typeof res.error === "string"
                    ? res.error
                    : "Couldn't send — check Resend domain verification."
                  : res && "skipped" in res
                    ? "Email skipped (Resend not configured)."
                    : "Decision email sent ✓",
              );
            })
          }
          className="mt-2 h-11 w-full rounded-md bg-ink text-sm font-display font-bold text-paper transition-colors hover:bg-ink-soft disabled:opacity-60"
        >
          {pending ? "Working…" : "Email decision"}
        </button>
        {emailMsg && <p className="mt-2 text-sm text-ink-soft">{emailMsg}</p>}
      </div>
    </div>
  );
}
