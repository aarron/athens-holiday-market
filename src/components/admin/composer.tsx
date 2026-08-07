"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { emailShell, renderMarkdown } from "@/lib/email-template";
import { getBroadcastTemplates } from "@/lib/email-templates";
import { sendTestEmail, sendBroadcast } from "@/lib/broadcast-actions";
import { ArrowRightIcon } from "@/components/icons";

type Segment = "all" | "artists" | "non_artists";
const SEGMENTS: { value: Segment; label: string }[] = [
  { value: "all", label: "Everyone" },
  { value: "artists", label: "Artists only" },
  { value: "non_artists", label: "Everyone except artists" },
];

export function Composer({ counts }: { counts: Record<Segment, number> }) {
  const router = useRouter();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [segment, setSegment] = useState<Segment>("all");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState("");
  const [confirming, setConfirming] = useState(false);

  const recipientCount = counts[segment] ?? 0;
  const previewHtml = useMemo(() => {
    const sample = (body || "_Your message will appear here…_")
      .replace(/\{\{\s*first_name\s*\}\}/gi, "Friend")
      .replace(/\{\{\s*name\s*\}\}/gi, "Friend");
    return emailShell(renderMarkdown(sample));
  }, [body]);

  function onTest() {
    setMsg("");
    start(async () => {
      const r = await sendTestEmail({ subject, body });
      setMsg(r && "ok" in r && r.ok ? `Test sent to ${r.to} ✓` : r?.error ?? "Couldn't send test.");
    });
  }

  function onSend() {
    setMsg("");
    start(async () => {
      const r = await sendBroadcast({ subject, body, segment });
      if (r && "ok" in r && r.ok) {
        router.push(`/admin/broadcasts/${r.id}`);
      } else {
        setConfirming(false);
        setMsg(r?.error ?? "Couldn't send.");
      }
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1fr] lg:items-start">
      {/* Compose */}
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-semibold text-ink-soft">Start from a template</label>
          <select
            defaultValue=""
            onChange={(e) => {
              const t = getBroadcastTemplates().find((x) => x.id === e.target.value);
              if (t) {
                setSubject(t.subject);
                setBody(t.body);
              }
            }}
            className="h-11 w-full rounded-lg border-2 border-ink/15 bg-white px-3 text-sm outline-none focus:border-fern-deep"
          >
            <option value="">Blank — write from scratch</option>
            {getBroadcastTemplates().map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold text-ink-soft">Subject</label>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="The Athens Holiday Market is back!"
            className="h-12 w-full rounded-lg border-2 border-ink/15 bg-white px-3 outline-none focus:border-fern-deep"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold text-ink-soft">Send to</label>
          <select
            value={segment}
            onChange={(e) => setSegment(e.target.value as Segment)}
            className="h-12 w-full rounded-lg border-2 border-ink/15 bg-white px-3 outline-none focus:border-fern-deep"
          >
            {SEGMENTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label} ({counts[s.value] ?? 0})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold text-ink-soft">
            Message
            <span className="ml-2 font-normal text-ink-soft/70">
              **bold**, *italic*, [links](https://…), - lists
            </span>
          </label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={12}
            placeholder={"Hi friends,\n\nWe can't wait to see you at the market on..."}
            className="w-full rounded-lg border-2 border-ink/15 bg-white px-3 py-2 font-mono text-sm outline-none focus:border-fern-deep"
          />
        </div>

        {msg && <p className="text-sm font-medium text-ink-soft">{msg}</p>}

        {!confirming ? (
          <div className="flex flex-wrap gap-3">
            <button
              disabled={pending || !subject || !body}
              onClick={onTest}
              className="rounded-lg border-2 border-ink/15 px-4 py-2.5 text-sm font-display font-semibold hover:bg-cream disabled:opacity-50"
            >
              {pending ? "Working…" : "Send test to me"}
            </button>
            <button
              disabled={pending || !subject || !body || recipientCount === 0}
              onClick={() => setConfirming(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-fuchsia px-5 py-2.5 text-sm font-display font-bold text-white hover:opacity-90 disabled:opacity-50"
            >
              Send broadcast
              <ArrowRightIcon size={16} aria-hidden />
            </button>
          </div>
        ) : (
          <div className="rounded-xl border-2 border-fuchsia/40 bg-fuchsia/5 p-4">
            <p className="font-display font-bold">
              Send to {recipientCount} {recipientCount === 1 ? "person" : "people"}?
            </p>
            <p className="mt-1 text-sm text-ink-soft">This can&apos;t be undone.</p>
            <div className="mt-3 flex gap-3">
              <button
                disabled={pending}
                onClick={onSend}
                className="rounded-lg bg-fuchsia px-5 py-2.5 text-sm font-display font-bold text-white hover:opacity-90 disabled:opacity-60"
              >
                {pending ? "Sending…" : `Yes, send to ${recipientCount}`}
              </button>
              <button
                disabled={pending}
                onClick={() => setConfirming(false)}
                className="rounded-lg px-4 py-2.5 text-sm font-semibold text-ink-soft hover:bg-cream"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Live preview */}
      <div className="lg:sticky lg:top-24">
        <p className="mb-2 text-sm font-semibold text-ink-soft">Preview</p>
        <div className="overflow-hidden rounded-xl border border-ink/10">
          <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
        </div>
      </div>
    </div>
  );
}
