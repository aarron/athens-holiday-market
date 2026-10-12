"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusMessage } from "@/components/ui/status-message";
import { emailShell, renderMarkdown } from "@/lib/email-shell";
import { personalize } from "@/lib/send-util";
import {
  REJECTION_REASONS,
  REJECTION_TEMPLATE,
  composeRejection,
  guessRejectionReason,
  hasUnfilledPlaceholder,
  type RejectionReason,
} from "@/lib/rejection";
import { sendRejectionEmails } from "@/lib/decision-actions";

type Recipient = {
  id: number;
  name: string;
  email: string;
  hasEmail: boolean;
  medium: string;
  category: string | null;
  decisionSentAt: string | null;
  decisionEmailStatus: string | null;
};

/** One person's draft: their reason, and a hand-edited body if they have one. */
type Draft = { reason: RejectionReason; custom: string | null };

const DRAFT_KEY = (cycleId: number) => `ahm:rejection-drafts:${cycleId}`;

export function RejectionSender({ cycleId, recipients }: { cycleId: number; recipients: Recipient[] }) {
  const router = useRouter();
  const [subject, setSubject] = useState(REJECTION_TEMPLATE.subject);
  const [template, setTemplate] = useState(REJECTION_TEMPLATE.body);
  const [reasonText, setReasonText] = useState<Record<RejectionReason, string>>(
    Object.fromEntries(REJECTION_REASONS.map((r) => [r.id, r.text])) as Record<RejectionReason, string>,
  );
  const [drafts, setDrafts] = useState<Record<number, Draft>>(() =>
    Object.fromEntries(recipients.map((r) => [r.id, { reason: guessRejectionReason(r.medium, r.category), custom: null }])),
  );
  const [open, setOpen] = useState<number | null>(null);
  const [preview, setPreview] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const [restored, setRestored] = useState(false);

  // Keep work-in-progress across reloads (this is several hand-edited emails).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY(cycleId));
      if (raw) {
        const d = JSON.parse(raw);
        /* eslint-disable react-hooks/set-state-in-effect -- one-time restore from storage */
        if (d.subject) setSubject(d.subject);
        if (d.template) setTemplate(d.template);
        if (d.reasonText) setReasonText((p) => ({ ...p, ...d.reasonText }));
        if (d.drafts) setDrafts((p) => ({ ...p, ...d.drafts }));
        setRestored(true);
        /* eslint-enable react-hooks/set-state-in-effect */
      }
    } catch {}
  }, [cycleId]);
  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY(cycleId), JSON.stringify({ subject, template, reasonText, drafts }));
    } catch {}
  }, [cycleId, subject, template, reasonText, drafts]);

  const bodyFor = (r: Recipient) => {
    const d = drafts[r.id];
    return d.custom ?? composeRejection(template, reasonText[d.reason]);
  };
  const setDraft = (id: number, patch: Partial<Draft>) => setDrafts((p) => ({ ...p, [id]: { ...p[id], ...patch } }));

  const notNotified = recipients.filter((r) => r.hasEmail && !r.decisionSentAt);
  const alreadyNotified = recipients.filter((r) => r.decisionSentAt).length;
  const missing = recipients.filter((r) => !r.hasEmail).length;
  const unfilled = notNotified.filter((r) => hasUnfilledPlaceholder(bodyFor(r)));
  const canSend =
    notNotified.length > 0 && unfilled.length === 0 && checked && confirmText.trim().toUpperCase() === "SEND" && !pending;

  const previewHtml = useMemo(() => {
    const r = recipients.find((x) => x.id === preview);
    return r ? emailShell(renderMarkdown(personalize(bodyFor(r), r.name))) : "";
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preview, drafts, template, reasonText]);

  function onSend() {
    setError("");
    start(async () => {
      const res = await sendRejectionEmails({
        cycleId,
        emails: notNotified.map((r) => ({ applicationId: r.id, reason: drafts[r.id].reason, subject, body: bodyFor(r) })),
      });
      if (res && "ok" in res && res.ok) {
        try {
          localStorage.removeItem(DRAFT_KEY(cycleId));
        } catch {}
        router.push("/admin/broadcasts");
      } else setError(res?.error ?? "Couldn't send.");
    });
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-poppy/10 p-5">
        <p className="font-display text-lg font-extrabold">
          You&apos;re about to tell <span className="text-poppy-deep">{notNotified.length}</span>{" "}
          {notNotified.length === 1 ? "person" : "people"} they weren&apos;t accepted, and why.
        </p>
        <p className="mt-1 text-sm text-ink-soft">
          Check each person&apos;s reason below, and open any email to edit it just for them. Nothing sends
          until you confirm at the bottom.
          {missing > 0 && ` ${missing} have no email on file and will be skipped.`}
          {alreadyNotified > 0 && ` ${alreadyNotified} already notified and will be skipped.`}
          {restored && " Your unsent edits from earlier were restored."}
        </p>
      </div>

      <Card>
        <h2 className="mb-3 font-display text-sm font-bold uppercase tracking-wide text-ink-soft">The template</h2>
        <Field label="Subject" className="mb-3">
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
        </Field>
        <Field
          label={
            <>
              Message{" "}
              <span className="font-normal text-ink-soft/70">
                — {"{{first_name}}"} is personalized; {"{{reason}}"} is replaced by each person&apos;s reason
              </span>
            </>
          }
        >
          <Textarea value={template} onChange={(e) => setTemplate(e.target.value)} rows={9} className="font-mono" />
        </Field>
        <h3 className="mb-2 mt-5 font-display text-sm font-bold uppercase tracking-wide text-ink-soft">Reasons</h3>
        <div className="space-y-3">
          {REJECTION_REASONS.map((r) => (
            <Field key={r.id} label={r.label}>
              <Textarea
                value={reasonText[r.id]}
                onChange={(e) => setReasonText((p) => ({ ...p, [r.id]: e.target.value }))}
                rows={3}
              />
            </Field>
          ))}
        </div>
      </Card>

      <div className="rounded-xl bg-white shadow-[var(--shadow-card)]">
        <div className="border-b border-ink/10 px-5 py-3">
          <h2 className="font-display text-sm font-bold uppercase tracking-wide text-ink-soft">
            Recipients ({recipients.length})
          </h2>
        </div>
        <ul className="divide-y divide-ink/5">
          {recipients.map((r) => {
            const d = drafts[r.id];
            const body = bodyFor(r);
            const needsFill = hasUnfilledPlaceholder(body);
            const done = !!r.decisionSentAt;
            return (
              <li key={r.id} className="px-5 py-3.5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-display font-bold">{r.name}</div>
                    <div className="truncate text-xs text-ink-soft">
                      {r.medium}
                      {" · "}
                      <span className={r.hasEmail ? "" : "font-semibold text-poppy-deep"}>
                        {r.hasEmail ? r.email : "no email on file — will skip"}
                      </span>
                    </div>
                  </div>
                  {done ? (
                    <span className="text-xs font-semibold text-ink-soft">Notified ({r.decisionEmailStatus ?? "sent"})</span>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        aria-label={`Reason for ${r.name}`}
                        value={d.reason}
                        disabled={d.custom !== null}
                        onChange={(e) => setDraft(r.id, { reason: e.target.value as RejectionReason })}
                        className="h-9 rounded-lg border-2 border-ink/15 bg-paper px-2 text-sm font-semibold disabled:opacity-50"
                      >
                        {REJECTION_REASONS.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                      <Button variant="secondary" size="sm" onClick={() => setOpen(open === r.id ? null : r.id)}>
                        {open === r.id ? "Done" : d.custom !== null ? "Edited ✎" : "Edit email"}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setPreview(preview === r.id ? null : r.id)}>
                        {preview === r.id ? "Hide" : "Preview"}
                      </Button>
                    </div>
                  )}
                </div>
                {needsFill && !done && (
                  <p className="mt-2 text-sm font-semibold text-poppy-deep">
                    Fill in the reason for {r.name.split(" ")[0]} before sending.
                  </p>
                )}
                {open === r.id && !done && (
                  <div className="mt-3">
                    <Textarea
                      value={body}
                      onChange={(e) => setDraft(r.id, { custom: e.target.value })}
                      rows={12}
                      className="font-mono"
                      aria-label={`Email to ${r.name}`}
                    />
                    <div className="mt-1.5 flex items-center justify-between text-xs text-ink-soft">
                      <span>Edits here apply only to {r.name.split(" ")[0]}&apos;s email.</span>
                      {d.custom !== null && (
                        <button className="font-semibold text-fern-deep hover:underline" onClick={() => setDraft(r.id, { custom: null })}>
                          Reset to template
                        </button>
                      )}
                    </div>
                  </div>
                )}
                {preview === r.id && (
                  <div className="mt-3 overflow-hidden rounded-lg border border-ink/10">
                    <div className="border-b border-ink/10 bg-cream-soft px-4 py-2 text-sm">
                      <strong>Subject:</strong> {subject}
                    </div>
                    <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      <div className="rounded-xl border-2 border-ink/15 bg-white p-5">
        <label className="flex items-start gap-2.5 text-sm">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            className="mt-0.5 h-4.5 w-4.5 accent-poppy-deep"
          />
          <span>
            I&apos;ve reviewed the reason and email for all {notNotified.length} people, and confirm these rejection
            emails should go to them.
          </span>
        </label>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className="text-sm text-ink-soft">
            Type <strong>SEND</strong> to confirm:
          </span>
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="SEND"
            aria-label="Type SEND to confirm"
            className="!w-28 uppercase"
          />
          <Button variant="danger" disabled={!canSend} loading={pending} loadingLabel="Sending…" onClick={onSend}>
            {`Send ${notNotified.length} rejection email${notNotified.length === 1 ? "" : "s"}`}
          </Button>
        </div>
        {unfilled.length > 0 && (
          <StatusMessage tone="error" className="mt-2">
            {unfilled.length} email{unfilled.length === 1 ? " still has" : "s still have"} a [placeholder] to fill in.
          </StatusMessage>
        )}
        {error && <StatusMessage tone="error" className="mt-2">{error}</StatusMessage>}
      </div>
    </div>
  );
}
