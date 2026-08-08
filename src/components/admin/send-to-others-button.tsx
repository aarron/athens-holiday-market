"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { resendBroadcastToMany } from "@/lib/broadcast-actions";
import { Button } from "@/components/ui/button";

/**
 * "Send to others" on a sent email — resends that same email to a free-form list
 * of addresses (comma / space / newline separated), for ad-hoc additions to the
 * market. New recipients roll into the campaign's report; existing ones skip.
 */
export function SendToOthersButton({ broadcastId }: { broadcastId: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [emails, setEmails] = useState("");
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const [pending, start] = useTransition();

  function submit() {
    setMsg(null);
    start(async () => {
      const r = await resendBroadcastToMany({ broadcastId, emails });
      if (r && "ok" in r && r.ok) {
        const bits = [`Sent to ${r.sent}`];
        if (r.skipped) bits.push(`${r.skipped} already on it`);
        if (r.failed) bits.push(`${r.failed} failed`);
        if (r.invalid.length) bits.push(`${r.invalid.length} invalid`);
        setMsg({ tone: r.failed ? "err" : "ok", text: `${bits.join(" · ")} ✓` });
        setEmails("");
        router.refresh();
      } else {
        setMsg({ tone: "err", text: r?.error ?? "Couldn't send." });
      }
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="link whitespace-nowrap text-sm font-semibold"
      >
        Send to others
      </button>
    );
  }

  return (
    <div className="w-72 space-y-2 text-left">
      <textarea
        aria-label="Email addresses, comma separated"
        value={emails}
        onChange={(e) => setEmails(e.target.value)}
        placeholder="artist@email.com, another@email.com"
        rows={3}
        className="w-full rounded-lg border-2 border-ink/15 bg-paper px-3 py-2 text-sm outline-none focus:border-fern-deep"
      />
      <div className="flex items-center gap-2">
        <Button variant="create" size="sm" loading={pending} disabled={!emails.trim()} onClick={submit}>
          Send
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={() => {
            setOpen(false);
            setMsg(null);
          }}
        >
          Cancel
        </Button>
      </div>
      {msg && (
        <p className={`text-xs ${msg.tone === "ok" ? "text-fern-deep" : "text-poppy-deep"}`}>{msg.text}</p>
      )}
    </div>
  );
}
