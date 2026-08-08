"use client";

import { useRef, useState, useTransition } from "react";
import { ExternalIcon } from "@/components/icons";
import { VOTE_STATES } from "@/components/admin/badges";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/field";
import { StatusMessage } from "@/components/ui/status-message";
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

const VOTE_ORDER: Vote[] = ["yes", "maybe", "no"];

export function VoteButtons({ applicationId, myVote }: { applicationId: number; myVote?: Vote }) {
  const [pending, start] = useTransition();
  const [current, setCurrent] = useState<Vote | undefined>(myVote);
  return (
    <div className="flex gap-2">
      {VOTE_ORDER.map((v) => {
        const s = VOTE_STATES[v];
        const active = current === v;
        return (
          <button
            key={v}
            disabled={pending}
            onClick={() => {
              const prev = current;
              setCurrent(v);
              start(async () => {
                const r = await castVote(applicationId, v);
                if (!(r && "ok" in r && r.ok)) setCurrent(prev);
              });
            }}
            className={`inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-lg border-2 font-display font-bold transition-all disabled:opacity-60 ${
              active ? "text-white" : "text-ink hover:bg-cream"
            }`}
            style={active ? { backgroundColor: s.hue, borderColor: s.hue } : { borderColor: "var(--color-ink)", opacity: 0.9 }}
          >
            <s.Icon size={18} aria-hidden />
            {s.label}
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
      <Textarea ref={ref} rows={3} placeholder="Add a note for the jury…" />
      <Button
        variant="ink"
        size="sm"
        className="mt-2"
        loading={pending}
        loadingLabel="Posting…"
        onClick={() => {
          const body = ref.current?.value ?? "";
          if (!body.trim()) return;
          start(async () => {
            await addComment(applicationId, body);
            if (ref.current) ref.current.value = "";
          });
        }}
      >
        Post note
      </Button>
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
  // A decision change is armed here and only applied on explicit confirm — a
  // stray click shouldn't grant portal login or queue someone for a blast.
  const [confirmTo, setConfirmTo] = useState<string | null>(null);

  // Optimistic, but reconciled: revert if the server write doesn't succeed.
  function apply(next: string) {
    const prev = cur;
    setCur(next);
    start(async () => {
      const r = await setStatus(applicationId, next as never);
      if (!(r && "ok" in r && r.ok)) setCur(prev);
    });
  }

  const DECISION = new Set(["accepted", "waitlisted", "rejected"]);
  const confirmLabel = confirmTo
    ? STATUS_OPTS.find(([s]) => s === confirmTo)?.[1] ?? confirmTo
    : "";

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
                onClick={() => (DECISION.has(s) && s !== cur ? setConfirmTo(s) : apply(s))}
                className="h-11 rounded-lg border-2 font-display text-sm font-bold transition-all disabled:opacity-60"
                style={active ? { backgroundColor: color, borderColor: color, color: "#fff" } : { borderColor: "rgba(23,22,27,0.15)" }}
              >
                {label}
              </button>
            );
          })}
        </div>

        {confirmTo && (
          <div className="mt-3 rounded-lg border-2 border-fuchsia/40 bg-fuchsia/5 p-3">
            <p className="text-sm font-semibold">
              Set decision to <strong>{confirmLabel}</strong>?
            </p>
            {confirmTo === "accepted" && (
              <p className="mt-1 text-xs text-ink-soft">
                Accepting grants this email portal login and includes them in accepted-artist
                emails, texts, and logistics.
              </p>
            )}
            <div className="mt-2.5 flex gap-2">
              <Button
                variant="confirm"
                size="sm"
                loading={pending}
                onClick={() => {
                  const next = confirmTo;
                  setConfirmTo(null);
                  apply(next);
                }}
              >
                Yes, set to {confirmLabel}
              </Button>
              <Button variant="ghost" size="sm" disabled={pending} onClick={() => setConfirmTo(null)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>

      <div>
        <p className="font-display text-sm font-bold uppercase tracking-wide text-ink-soft">Booth fee</p>
        <button
          disabled={pending || cur !== "accepted"}
          onClick={() => {
            const next = !paid;
            setPaid(next);
            start(async () => {
              const r = await setBoothFee(applicationId, next);
              if (!(r && "ok" in r && r.ok)) setPaid(!next);
            });
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
  const [armed, setArmed] = useState(false);

  return (
    <Card title="Public profile">
      {published && slug ? (
        <div className="space-y-2">
          <a
            href={`/artists/${slug}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-1.5 rounded-lg bg-fern-soft px-4 py-2.5 text-center text-sm font-display font-bold text-fern-deep"
          >
            View public page
            <ExternalIcon size={14} aria-hidden />
          </a>
          <Button
            variant="secondary"
            size="sm"
            className="w-full"
            disabled={pending}
            onClick={() =>
              start(async () => {
                await unpublishArtist(applicationId);
                setPublished(false);
                setMsg("Hidden from the directory.");
              })
            }
          >
            Unpublish
          </Button>
        </div>
      ) : !armed ? (
        <Button variant="confirm" size="sm" className="w-full" onClick={() => setArmed(true)}>
          Publish to directory
        </Button>
      ) : (
        <div className="rounded-lg border-2 border-fern-deep/30 bg-fern-soft/50 p-3">
          <p className="text-sm text-ink-soft">
            This makes the page public <strong className="text-ink">and emails the artist</strong>{" "}
            that it&apos;s live.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button
              variant="confirm"
              size="sm"
              loading={pending}
              loadingLabel="Publishing…"
              onClick={() =>
                start(async () => {
                  const r = await publishArtist(applicationId);
                  if (r && "ok" in r && r.ok) {
                    setPublished(true);
                    setSlug(r.slug);
                    setArmed(false);
                    setMsg(r.updatedExisting ? "Updated their existing page ✓" : "Published & artist notified ✓");
                  } else {
                    setMsg((r && "error" in r && r.error) || "Couldn't publish.");
                  }
                })
              }
            >
              Publish &amp; notify
            </Button>
            <Button variant="secondary" size="sm" disabled={pending} onClick={() => setArmed(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
      {msg && <StatusMessage className="mt-2">{msg}</StatusMessage>}
    </Card>
  );
}

export function SendArtistLinkButton({ email }: { email: string }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState("");
  return (
    <div>
      <Button
        variant="secondary"
        size="sm"
        className="w-full"
        loading={pending}
        loadingLabel="Sending…"
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
      >
        Email artist their edit link
      </Button>
      {msg && <StatusMessage className="mt-2">{msg}</StatusMessage>}
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
        className="rounded-lg border-2 border-poppy/40 px-4 py-2.5 text-sm font-display font-bold text-poppy-deep transition-colors hover:bg-poppy hover:text-white"
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
        <Button
          variant="danger"
          size="sm"
          loading={pending}
          loadingLabel="Deleting…"
          onClick={() => start(() => deleteApplication(applicationId))}
        >
          Yes, delete permanently
        </Button>
        <Button variant="secondary" size="sm" disabled={pending} onClick={() => setArmed(false)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
