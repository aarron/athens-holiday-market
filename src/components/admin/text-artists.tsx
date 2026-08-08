"use client";

import { useState, useTransition } from "react";
import { sendEventText, sendTestText } from "@/lib/sms-actions";
import { Card } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { StatusMessage } from "@/components/ui/status-message";

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
      <Textarea
        value={msg}
        onChange={(e) => setMsg(e.target.value)}
        rows={3}
        placeholder="e.g. Athens Holiday Market load-in starts at 3pm today at Big City Bread. See you there!"
      />
      <div className="mt-1 text-right text-xs text-ink-soft">
        {chars} chars · {segments} SMS {segments === 1 ? "segment" : "segments"} each
      </div>

      {/* Send — primary blast first, then the optional test, so the main flow reads straight through. */}
      <div className="mt-4 border-t border-ink/10 pt-4">
        <label htmlFor="tx-confirm" className="text-sm font-semibold">
          Text all {recipientCount} accepted artists — type <span className="font-mono">SEND</span> to confirm
        </label>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Input
            id="tx-confirm"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="SEND"
            aria-label="Type SEND to confirm"
            className="!w-28 uppercase"
          />
          <Button
            variant="danger"
            size="sm"
            disabled={!canSend}
            loading={pending}
            loadingLabel="Sending…"
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
          >
            {`Text ${recipientCount} artists`}
          </Button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-ink-soft">
          <span>Or send a test to your phone:</span>
          <Input
            value={testTo}
            onChange={(e) => setTestTo(e.target.value)}
            placeholder="your mobile #"
            aria-label="Test mobile number"
            className="!w-40"
          />
          <Button
            variant="secondary"
            size="sm"
            disabled={pending || !testTo.trim() || chars === 0}
            onClick={() =>
              start(async () => {
                const r = await sendTestText(testTo, msg);
                setResult(r.ok ? `Test sent to ${r.to} ✓` : r.error);
              })
            }
          >
            Send test
          </Button>
        </div>
      </div>

      {result && <StatusMessage className="mt-3">{result}</StatusMessage>}
    </Card>
  );
}
