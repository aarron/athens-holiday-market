"use client";

import { useMemo, useState, useTransition } from "react";
import { sendEventText, type TextAudience } from "@/lib/sms-actions";
import { normalizePhone } from "@/lib/phone";
import { Card } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { StatusMessage } from "@/components/ui/status-message";

export function TextArtists({ audience }: { audience: TextAudience }) {
  const { configured, year, artistCount, artistNoPhone, judgeCount } = audience;

  const [msg, setMsg] = useState("");
  const [artists, setArtists] = useState(true);
  const [judges, setJudges] = useState(false);
  const [otherEnabled, setOtherEnabled] = useState(false);
  const [other, setOther] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [pending, start] = useTransition();
  // Confirm modal state. `token` is minted when the modal opens so a
  // double-submit re-uses it and the server treats the second send as a no-op.
  const [confirming, setConfirming] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [token, setToken] = useState("");

  const chars = msg.trim().length;
  const segments = Math.max(1, Math.ceil(chars / 153));

  // Rough recipient count for the label (real de-dupe happens server-side).
  const otherCount = useMemo(
    () => other.split(/[,\n]+/).map((s) => s.trim()).filter((s) => normalizePhone(s)).length,
    [other],
  );
  const recipientCount =
    (artists ? artistCount : 0) + (judges ? judgeCount : 0) + (otherEnabled ? otherCount : 0);

  const canSend = configured && chars > 0 && recipientCount > 0 && !pending;

  function openConfirm() {
    setResult(null);
    setConfirmText("");
    setToken(crypto.randomUUID());
    setConfirming(true);
  }

  function send() {
    start(async () => {
      const r = await sendEventText({
        message: msg,
        artists,
        judges,
        other: otherEnabled ? other : "",
        clientToken: token,
      });
      if (r.ok) {
        setResult(
          "duplicate" in r && r.duplicate
            ? "Already sent — ignored the repeat."
            : `Sent to ${r.sent} ${r.sent === 1 ? "number" : "numbers"}${
                r.failed.length ? ` · ${r.failed.length} failed` : ""
              }`,
        );
        setConfirming(false);
        setMsg("");
        setOther("");
      } else {
        setResult(r.error);
        setConfirming(false);
      }
    });
  }

  if (!configured) {
    return (
      <Card>
        <p className="text-sm text-ink-soft">
          Twilio isn&apos;t configured on this environment yet. Once the credentials are set,
          you&apos;ll be able to text accepted artists here.
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <label htmlFor="tx-msg" className="text-sm font-semibold">
        Message
      </label>
      <Textarea
        id="tx-msg"
        value={msg}
        onChange={(e) => setMsg(e.target.value)}
        rows={3}
        className="mt-1"
        placeholder="e.g. Athens Holiday Market load-in starts at 3pm today at Big City Bread. See you there!"
      />
      <div className="mt-1 text-right text-xs text-ink-soft">
        {chars} chars · {segments} SMS {segments === 1 ? "segment" : "segments"} each
      </div>

      {/* Recipients */}
      <fieldset className="mt-4">
        <legend className="text-sm font-semibold">Recipients</legend>
        <div className="mt-2 space-y-2">
          <label className="flex items-center gap-2.5 text-sm">
            <input
              type="checkbox"
              checked={artists}
              onChange={(e) => setArtists(e.target.checked)}
              className="size-4 accent-fern-deep"
            />
            <span>
              Accepted artists{year ? ` (${year})` : ""}
              <span className="ml-1.5 text-ink-soft">
                — {artistCount}
                {artistNoPhone > 0 && ` · ${artistNoPhone} without a number/opt-in`}
              </span>
            </span>
          </label>

          <label className="flex items-center gap-2.5 text-sm">
            <input
              type="checkbox"
              checked={judges}
              onChange={(e) => setJudges(e.target.checked)}
              className="size-4 accent-fern-deep"
            />
            <span>
              Judges<span className="ml-1.5 text-ink-soft">— {judgeCount}</span>
            </span>
          </label>

          <label className="flex items-center gap-2.5 text-sm">
            <input
              type="checkbox"
              checked={otherEnabled}
              onChange={(e) => setOtherEnabled(e.target.checked)}
              className="size-4 accent-fern-deep"
            />
            <span>Other numbers</span>
          </label>

          {/* Input sits below the checkbox, aligned under its label. Typing a
              number auto-enables the row so the count stays in sync. */}
          <div className="pl-[26px]">
            <Input
              value={other}
              onChange={(e) => {
                setOther(e.target.value);
                if (e.target.value.trim() && !otherEnabled) setOtherEnabled(true);
              }}
              placeholder="706-555-1234, 706-555-9876"
              aria-label="Other phone numbers, comma-separated"
              className="!h-11 w-full text-sm"
            />
          </div>
        </div>
      </fieldset>

      {/* Primary action, left-aligned; recipient count to its right. */}
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button variant="create" disabled={!canSend} onClick={openConfirm}>
          Send Text
        </Button>
        <span className="text-sm text-ink-soft">
          {recipientCount === 0
            ? "No recipients selected"
            : `${recipientCount} ${recipientCount === 1 ? "recipient" : "recipients"}`}
        </span>
      </div>

      {result && <StatusMessage className="mt-3">{result}</StatusMessage>}

      {/* Type-"send" confirmation — an intentional pause before an irreversible
          blast to real phones. */}
      {confirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4" role="dialog" aria-modal="true" aria-label="Confirm text send">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-[var(--shadow-lift)]">
            <h3 className="font-display text-xl font-extrabold">
              Text {recipientCount} {recipientCount === 1 ? "phone" : "phones"}?
            </h3>
            <p className="mt-2 text-sm text-ink-soft">
              This sends an SMS to every selected number immediately and can&apos;t be recalled.
              Type <span className="font-mono font-bold">send</span> to confirm.
            </p>
            <div className="mt-3 rounded-lg bg-cream-soft p-3 text-sm">
              <span className="font-semibold">Message:</span> {msg}
            </div>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="send"
              aria-label="Type send to confirm"
              className="mt-3 !h-11"
              autoFocus
            />
            <div className="mt-4 flex items-center gap-2">
              <Button
                variant="create"
                loading={pending}
                loadingLabel="Sending…"
                disabled={confirmText.trim().toLowerCase() !== "send" || pending}
                onClick={send}
              >
                Send to {recipientCount}
              </Button>
              <Button variant="ghost" disabled={pending} onClick={() => setConfirming(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
