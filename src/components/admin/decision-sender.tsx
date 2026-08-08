"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { VoteTally, type Tally } from "@/components/admin/badges";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusMessage } from "@/components/ui/status-message";
import { emailShell, renderMarkdown } from "@/lib/email-template";
import { sendDecisionBatch } from "@/lib/decision-actions";

type Recipient = {
  id: number;
  name: string;
  email: string;
  status: string;
  hasEmail: boolean;
  tally: Tally;
  decisionSentAt: string | null;
  decisionEmailStatus: string | null;
};

const GROUP_COPY = {
  accepted: { verb: "accepted into", accent: "var(--color-fern-deep)", tone: "bg-fern-soft" },
  waitlist: { verb: "placed on the waitlist for", accent: "var(--color-tangerine)", tone: "bg-tangerine-soft" },
} as const;

export function DecisionSender({
  cycleId,
  group,
  recipients,
  subject: initialSubject,
  body: initialBody,
}: {
  cycleId: number;
  group: "accepted" | "waitlist";
  recipients: Recipient[];
  subject: string;
  body: string;
}) {
  const router = useRouter();
  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState(initialBody);
  const [checked, setChecked] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [resendAll, setResendAll] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState("");

  const copy = GROUP_COPY[group];
  const withEmail = recipients.filter((r) => r.hasEmail);
  const missing = recipients.length - withEmail.length;
  const alreadyNotified = recipients.filter((r) => r.decisionSentAt).length;
  // Default target: people with an email who haven't been notified yet.
  const notYetNotified = withEmail.filter((r) => !r.decisionSentAt);
  const targetCount = resendAll ? withEmail.length : notYetNotified.length;

  const previewHtml = useMemo(
    () =>
      emailShell(
        renderMarkdown(
          (body || "…").replace(/\{\{\s*first_name\s*\}\}/gi, recipients[0]?.name.split(" ")[0] ?? "Friend"),
        ),
      ),
    [body, recipients],
  );

  const canSend =
    checked && confirmText.trim().toUpperCase() === "SEND" && targetCount > 0 && !pending;

  function onSend() {
    setError("");
    start(async () => {
      const r = await sendDecisionBatch({ cycleId, group, subject, body, resendAll });
      if (r && "ok" in r && r.ok) router.push("/admin/decisions");
      else setError(r?.error ?? "Couldn't send.");
    });
  }

  return (
    <div className="space-y-6">
      {/* High-stakes banner */}
      <div className={`rounded-xl ${copy.tone} p-5`}>
        <p className="font-display text-lg font-extrabold">
          You&apos;re about to email <span style={{ color: copy.accent }}>{targetCount}</span>{" "}
          {targetCount === 1 ? "person" : "people"} that they&apos;ve been {copy.verb} the market.
        </p>
        <p className="mt-1 text-sm text-ink-soft">
          Review every recipient and their votes below. This can&apos;t be undone.
          {missing > 0 && ` ${missing} applicant(s) have no email on file and will be skipped.`}
          {alreadyNotified > 0 &&
            (resendAll
              ? ` ${alreadyNotified} already notified — they'll be emailed again.`
              : ` ${alreadyNotified} already notified and will be skipped.`)}
        </p>
      </div>

      {/* Email editor */}
      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-sm font-bold uppercase tracking-wide text-ink-soft">The email</h2>
          <button
            onClick={() => setShowPreview((v) => !v)}
            className="text-sm font-semibold text-fern-deep hover:underline"
          >
            {showPreview ? "Hide preview" : "Preview"}
          </button>
        </div>
        <Field label="Subject" className="mb-3">
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
        </Field>
        <Field
          label={<>Message <span className="font-normal text-ink-soft/70">— {"{{first_name}}"} is personalized</span></>}
        >
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={10} className="font-mono" />
        </Field>
        {showPreview && (
          <div className="mt-4 overflow-hidden rounded-lg border border-ink/10">
            <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
          </div>
        )}
      </Card>

      {/* Recipient list with votes */}
      <div className="rounded-xl bg-white shadow-[var(--shadow-card)]">
        <div className="border-b border-ink/10 px-5 py-3">
          <h2 className="font-display text-sm font-bold uppercase tracking-wide text-ink-soft">
            Recipients ({withEmail.length})
          </h2>
        </div>
        <div className="max-h-[420px] overflow-auto">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead className="sticky top-0 bg-white">
              <tr className="border-b border-ink/10 text-xs uppercase tracking-wide text-ink-soft">
                <th className="px-5 py-2 font-semibold">Artist</th>
                <th className="px-5 py-2 font-semibold">Votes</th>
                <th className="px-5 py-2 font-semibold">Notified</th>
              </tr>
            </thead>
            <tbody>
              {recipients.map((r) => (
                <tr key={r.id} className="border-b border-ink/5 last:border-0">
                  <td className="px-5 py-2.5">
                    <div className="font-display font-bold">{r.name}</div>
                    <div className={`text-xs ${r.hasEmail ? "text-ink-soft" : "font-semibold text-poppy-deep"}`}>
                      {r.hasEmail ? r.email : "no email on file — will skip"}
                    </div>
                  </td>
                  <td className="px-5 py-2.5">
                    <VoteTally tally={r.tally} />
                  </td>
                  <td className="px-5 py-2.5 text-xs text-ink-soft">
                    {r.decisionSentAt ? `${r.decisionEmailStatus ?? "sent"}` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirm gate */}
      <div className="rounded-xl border-2 border-ink/15 bg-white p-5">
        {alreadyNotified > 0 && (
          <label className="mb-3 flex items-start gap-2.5 text-sm">
            <input
              type="checkbox"
              checked={resendAll}
              onChange={(e) => setResendAll(e.target.checked)}
              className="mt-0.5 h-4.5 w-4.5 accent-tangerine"
            />
            <span>
              Re-send to the <strong>{alreadyNotified}</strong> already notified too (normally
              skipped, so you can safely notify late additions without re-emailing everyone).
            </span>
          </label>
        )}
        <label className="flex items-start gap-2.5 text-sm">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            className="mt-0.5 h-4.5 w-4.5 accent-fern-deep"
          />
          <span>
            I&apos;ve reviewed all {targetCount} recipients and their votes, and confirm this{" "}
            <strong>{group === "accepted" ? "acceptance" : "waitlist"}</strong> email should go to
            them.
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
          <Button
            variant="confirm"
            disabled={!canSend}
            loading={pending}
            loadingLabel="Sending…"
            onClick={onSend}
            style={{ backgroundColor: copy.accent }}
          >
            {`Send ${targetCount} ${group === "accepted" ? "acceptance" : "waitlist"} email${targetCount === 1 ? "" : "s"}`}
          </Button>
        </div>
        {error && <StatusMessage tone="error" className="mt-2">{error}</StatusMessage>}
      </div>
    </div>
  );
}
