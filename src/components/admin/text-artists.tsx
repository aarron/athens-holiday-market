"use client";

import { useState, useTransition } from "react";
import { sendEventText, sendTestText } from "@/lib/sms-actions";

export function TextArtists({
  recipientCount,
  noPhoneCount,
  configured,
}: {
  recipientCount: number;
  noPhoneCount: number;
  configured: boolean;
}) {
  const [msg, setMsg] = useState("");
  const [confirm, setConfirm] = useState("");
  const [testTo, setTestTo] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const chars = msg.trim().length;
  const segments = Math.max(1, Math.ceil(chars / 153));
  const canSend =
    configured && confirm.trim().toUpperCase() === "SEND" && chars > 0 && recipientCount > 0 && !pending;

  if (!configured) {
    return (
      <div className="rounded-xl bg-white p-6 shadow-[var(--shadow-card)]">
        <h2 className="font-display text-lg font-extrabold">Text artists</h2>
        <p className="mt-2 text-sm text-ink-soft">
          Twilio isn&apos;t configured on this environment yet. Once the credentials are set,
          you&apos;ll be able to text accepted artists here.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-white p-6 shadow-[var(--shadow-card)]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-lg font-extrabold">Text artists</h2>
        <span className="text-sm text-ink-soft">
          {recipientCount} accepted {recipientCount === 1 ? "artist" : "artists"} opted in to texts
          {noPhoneCount > 0 && ` · ${noPhoneCount} without a number/opt-in`}
        </span>
      </div>
      <p className="mt-1 text-sm text-ink-soft">
        Event-day heads-ups (load-in time, weather, reminders) sent straight to phones via SMS.
      </p>

      <textarea
        value={msg}
        onChange={(e) => setMsg(e.target.value)}
        rows={3}
        placeholder="e.g. Athens Holiday Market load-in starts at 3pm today at Big City Bread. See you there!"
        className="mt-4 w-full rounded-lg border-2 border-ink/15 px-3 py-2 text-sm outline-none focus:border-fern-deep"
      />
      <div className="mt-1 text-right text-xs text-ink-soft">
        {chars} chars · {segments} SMS {segments === 1 ? "segment" : "segments"} each
      </div>

      {/* Test send */}
      <div className="mt-4 flex flex-wrap items-center gap-2 rounded-lg bg-cream-soft p-3">
        <span className="text-sm font-semibold">Send a test:</span>
        <input
          value={testTo}
          onChange={(e) => setTestTo(e.target.value)}
          placeholder="your mobile #"
          className="w-40 rounded-lg border-2 border-ink/15 px-2 py-1 text-sm outline-none focus:border-fern-deep"
        />
        <button
          disabled={pending || !testTo.trim() || chars === 0}
          onClick={() =>
            start(async () => {
              const r = await sendTestText(testTo, msg);
              setResult(r.ok ? `Test sent to ${r.to} ✓` : r.error);
            })
          }
          className="rounded-lg border-2 border-ink/15 px-3 py-1 text-sm font-semibold hover:bg-white disabled:opacity-50"
        >
          Send test
        </button>
      </div>

      {/* Blast with confirmation */}
      <div className="mt-4 border-t border-ink/10 pt-4">
        <label className="text-sm font-semibold">
          Text all {recipientCount} accepted artists — type <span className="font-mono">SEND</span> to confirm
        </label>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="SEND"
            className="w-28 rounded-lg border-2 border-ink/15 px-3 py-2 text-sm outline-none focus:border-poppy"
          />
          <button
            disabled={!canSend}
            onClick={() =>
              start(async () => {
                const r = await sendEventText(msg);
                if (r.ok) {
                  setResult(
                    `Sent to ${r.sent} artist${r.sent === 1 ? "" : "s"}${
                      r.failed.length ? ` · ${r.failed.length} failed (${r.failed.join(", ")})` : ""
                    }`,
                  );
                  setMsg("");
                  setConfirm("");
                } else {
                  setResult(r.error);
                }
              })
            }
            className="rounded-lg bg-poppy px-5 py-2 text-sm font-display font-bold text-white hover:opacity-90 disabled:opacity-50"
          >
            {pending ? "Sending…" : `Text ${recipientCount} artists`}
          </button>
        </div>
      </div>

      {result && <p className="mt-3 text-sm font-semibold text-ink">{result}</p>}
    </div>
  );
}
