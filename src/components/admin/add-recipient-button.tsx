"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { resendBroadcastToOne } from "@/lib/broadcast-actions";
import { Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

/**
 * Tertiary "Add recipient" action on a sent email — sends that same email to
 * one more person (e.g. a last-minute artist) and records them on the report.
 */
export function AddRecipientButton({ broadcastId }: { broadcastId: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const [pending, start] = useTransition();

  function submit() {
    setMsg(null);
    start(async () => {
      const r = await resendBroadcastToOne({ broadcastId, email, name: name || undefined });
      if (r && "ok" in r && r.ok) {
        setMsg({ tone: "ok", text: `Sent to ${r.email} ✓` });
        setEmail("");
        setName("");
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
        Add recipient
      </button>
    );
  }

  return (
    <div className="w-64 space-y-2 text-left">
      <Input
        aria-label="Recipient email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="artist@email.com"
        className="!h-9 text-sm"
      />
      <Input
        aria-label="Recipient name (optional)"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Name (optional)"
        className="!h-9 text-sm"
      />
      <div className="flex items-center gap-2">
        <Button variant="create" size="sm" loading={pending} disabled={!email} onClick={submit}>
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
        <p className={`text-xs ${msg.tone === "ok" ? "text-fern-deep" : "text-poppy-deep"}`}>
          {msg.text}
        </p>
      )}
    </div>
  );
}
