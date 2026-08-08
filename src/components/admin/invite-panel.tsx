"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { sendProspectInvites } from "@/lib/prospect-actions";
import { CloseIcon, MailboxIcon } from "@/components/icons";

/**
 * Invite shortlisted prospects to apply. The flow ends in a preview + a
 * type-"send" gate so the exact email and recipient list are reviewed before
 * anything goes out — nothing sends without that confirm.
 */
export function InvitePanel({
  ready,
  emailed,
  shortlisted,
  previewHtml,
  recipients,
}: {
  ready: number;
  emailed: number;
  shortlisted: number;
  previewHtml: string;
  recipients: { id: number; name: string; email: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const [pending, start] = useTransition();

  function send() {
    setMsg(null);
    start(async () => {
      const r = await sendProspectInvites({ confirm });
      if (r && "ok" in r && r.ok) {
        setOpen(false);
        setConfirm("");
        router.refresh();
      } else {
        setMsg({ tone: "err", text: r?.error ?? "Couldn't send." });
      }
    });
  }

  return (
    <div className="rounded-xl bg-white p-4 shadow-[var(--shadow-card)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <MailboxIcon size={18} aria-hidden />
          <div>
            <h2 className="font-display font-bold leading-tight">Invitations</h2>
            <p className="text-xs text-ink-soft">
              {ready > 0
                ? `${ready} shortlisted artist${ready === 1 ? "" : "s"} ready to invite`
                : shortlisted > 0
                  ? `${shortlisted} shortlisted, but none have an email yet — add emails to invite them`
                  : "Shortlist artists to invite them to apply"}
              {emailed > 0 && ` · ${emailed} already emailed`}
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            setMsg(null);
            setConfirm("");
            setOpen(true);
          }}
          disabled={ready === 0}
          className="rounded-lg bg-ink px-4 py-2 text-sm font-display font-bold text-paper hover:bg-ink-soft disabled:opacity-40"
        >
          Preview &amp; invite {ready > 0 ? ready : ""}
        </button>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4"
          onClick={() => !pending && setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Preview and send invitations"
        >
          <div
            className="relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-[var(--shadow-lift)] lg:flex-row"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => !pending && setOpen(false)}
              aria-label="Close"
              className="absolute right-3 top-3 z-10 rounded-full bg-ink/60 p-1.5 text-paper hover:bg-ink/80"
            >
              <CloseIcon size={18} aria-hidden />
            </button>

            {/* Email preview */}
            <div className="lg:w-3/5">
              <iframe
                title="Invitation preview"
                srcDoc={previewHtml}
                className="h-64 w-full border-0 lg:h-full"
              />
            </div>

            {/* Recipients + confirm */}
            <div className="flex flex-1 flex-col p-6">
              <h3 className="font-display text-lg font-extrabold">Send to {recipients.length}</h3>
              <p className="mt-1 text-sm text-ink-soft">
                Shortlisted artists with an email who haven&rsquo;t been invited yet. Anyone who opted
                out or unsubscribed is skipped automatically.
              </p>
              <ul className="mt-3 max-h-48 flex-1 space-y-1 overflow-y-auto rounded-lg bg-cream-soft p-3 text-sm">
                {recipients.map((r) => (
                  <li key={r.id} className="flex items-baseline justify-between gap-3">
                    <span className="font-semibold">{r.name}</span>
                    <span className="truncate text-ink-soft">{r.email}</span>
                  </li>
                ))}
              </ul>

              <label className="mt-4 block text-sm font-semibold text-ink-soft" htmlFor="invite-confirm">
                Type <span className="font-bold text-ink">send</span> to confirm
              </label>
              <input
                id="invite-confirm"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="send"
                autoComplete="off"
                className="mt-1 h-10 w-full rounded-lg border-2 border-ink/15 bg-paper px-3 text-sm outline-none focus:border-fern-deep"
              />
              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={send}
                  disabled={pending || confirm.trim().toLowerCase() !== "send"}
                  className="rounded-lg bg-fern-deep px-4 py-2 text-sm font-display font-bold text-white hover:bg-fern-deeper disabled:opacity-40"
                >
                  {pending ? "Sending…" : `Send ${recipients.length} invite${recipients.length === 1 ? "" : "s"}`}
                </button>
                <button
                  onClick={() => setOpen(false)}
                  disabled={pending}
                  className="rounded-lg px-3 py-2 text-sm font-semibold text-ink-soft hover:bg-cream"
                >
                  Cancel
                </button>
              </div>
              {msg && (
                <p className={`mt-2 text-sm ${msg.tone === "ok" ? "text-fern-deep" : "text-poppy-deep"}`}>
                  {msg.text}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
