"use client";

import { useState, useTransition } from "react";
import { addDirectArtist } from "@/lib/exhibit-actions";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { StatusMessage } from "@/components/ui/status-message";

/**
 * Add an artist who never applied (e.g. a last-minute dropout replacement).
 * Creates a direct-add accepted application for the active cycle and emails
 * them a magic link to complete their profile.
 */
export function AddArtistForm() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [pending, start] = useTransition();

  function submit() {
    setMsg(null);
    start(async () => {
      const r = await addDirectArtist({ name, email });
      if (r && "ok" in r && r.ok) {
        setMsg({
          tone: "success",
          text: `Invite ${r.resent ? "re-sent" : "sent"} to ${email} — they'll get a link to complete their profile.`,
        });
        setName("");
        setEmail("");
      } else {
        setMsg({ tone: "error", text: r?.error ?? "Couldn't add that artist." });
      }
    });
  }

  if (!open) {
    return (
      <Button variant="create" size="sm" onClick={() => setOpen(true)}>
        + Add an artist
      </Button>
    );
  }

  return (
    <Card title="Add an artist" hint="For someone added outside the application round — a last-minute fill-in. They'll get an email to complete their profile, then you publish it.">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Name" htmlFor="add-name">
          <Input id="add-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jamie Rivera" />
        </Field>
        <Field label="Email" htmlFor="add-email">
          <Input id="add-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jamie@email.com" />
        </Field>
      </div>
      {msg && <StatusMessage tone={msg.tone} className="mt-3">{msg.text}</StatusMessage>}
      <div className="mt-4 flex items-center gap-2">
        <Button variant="create" size="sm" loading={pending} disabled={!name || !email} onClick={submit}>
          Add &amp; send invite
        </Button>
        <Button variant="ghost" size="sm" disabled={pending} onClick={() => { setOpen(false); setMsg(null); }}>
          Cancel
        </Button>
      </div>
    </Card>
  );
}
