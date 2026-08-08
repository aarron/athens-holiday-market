"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { emailShell, renderMarkdown } from "@/lib/email-template";
import { getBroadcastTemplates } from "@/lib/email-templates";
import { sendTestEmail, sendBroadcast, scheduleBroadcast, saveDraft } from "@/lib/broadcast-actions";
import { MarkdownToolbar } from "@/components/admin/markdown-toolbar";
import { ArrowRightIcon, ClockIcon } from "@/components/icons";

type Segment = "all" | "artists" | "non_artists" | "accepted" | "waitlisted" | "applicants";
const SEGMENT_GROUPS: { label: string; options: { value: Segment; label: string }[] }[] = [
  {
    label: "Mailing list",
    options: [
      { value: "all", label: "Everyone" },
      { value: "artists", label: "Artists only" },
      { value: "non_artists", label: "Everyone except artists" },
    ],
  },
  {
    label: "This year’s applications",
    options: [
      { value: "accepted", label: "Accepted artists" },
      { value: "waitlisted", label: "Waitlisted" },
      { value: "applicants", label: "All applicants" },
    ],
  },
];

const fmtWhen = (v: string) =>
  new Date(v).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });

export function Composer({
  counts,
  draft,
}: {
  counts: Record<Segment, number>;
  draft?: { id: number; subject: string; body: string; segment: Segment };
}) {
  const router = useRouter();
  const [subject, setSubject] = useState(draft?.subject ?? "");
  const [body, setBody] = useState(draft?.body ?? "");
  const [segment, setSegment] = useState<Segment>(draft?.segment ?? "all");
  const [mode, setMode] = useState<"now" | "schedule">("now");
  const [scheduledFor, setScheduledFor] = useState("");
  const [testTo, setTestTo] = useState("");
  const [draftId, setDraftId] = useState<number | undefined>(draft?.id);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState("");
  const [confirming, setConfirming] = useState(false);

  function onSaveDraft() {
    setMsg("");
    start(async () => {
      const r = await saveDraft({ id: draftId, subject, body, segment });
      if (r && "ok" in r && r.ok) {
        setDraftId(r.id);
        setMsg("Draft saved ✓");
      } else {
        setMsg(r?.error ?? "Couldn't save the draft.");
      }
    });
  }

  const recipientCount = counts[segment] ?? 0;
  const scheduleReady = mode === "schedule" ? !!scheduledFor : true;
  const previewHtml = useMemo(() => {
    const sample = (body || "_Your message will appear here…_")
      .replace(/\{\{\s*first_name\s*\}\}/gi, "Friend")
      .replace(/\{\{\s*name\s*\}\}/gi, "Friend");
    return emailShell(renderMarkdown(sample));
  }, [body]);

  function onTest() {
    setMsg("");
    const emails = testTo.split(/[,\s]+/).map((s) => s.trim()).filter(Boolean);
    start(async () => {
      const r = await sendTestEmail({ subject, body, to: emails.length ? emails : undefined });
      setMsg(r && "ok" in r && r.ok ? `Test sent to ${r.to} ✓` : r?.error ?? "Couldn't send test.");
    });
  }

  function onConfirm() {
    setMsg("");
    start(async () => {
      const r =
        mode === "schedule"
          ? await scheduleBroadcast({ subject, body, segment, scheduledFor, draftId })
          : await sendBroadcast({ subject, body, segment, draftId });
      if (r && "ok" in r && r.ok) {
        router.push("/admin/broadcasts");
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
          <label className="mb-1 block text-sm font-semibold text-ink-soft" htmlFor="bc-subject">Subject</label>
          <input
            id="bc-subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="The Athens Holiday Market is back!"
            className="h-12 w-full rounded-lg border-2 border-ink/15 bg-white px-3 outline-none focus:border-fern-deep"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold text-ink-soft" htmlFor="bc-segment">Send to</label>
          <select
            id="bc-segment"
            value={segment}
            onChange={(e) => setSegment(e.target.value as Segment)}
            className="h-12 w-full rounded-lg border-2 border-ink/15 bg-white px-3 outline-none focus:border-fern-deep"
          >
            {SEGMENT_GROUPS.map((g) => (
              <optgroup key={g.label} label={g.label}>
                {g.options.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label} ({counts[s.value] ?? 0})
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold text-ink-soft" htmlFor="bc-body">
            Message
            <span className="ml-2 font-normal text-ink-soft/70">
              # heading, **bold**, *italic*, [links](https://…), [[Button]](https://…), - lists, --- divider
            </span>
          </label>
          <MarkdownToolbar textareaRef={bodyRef} value={body} onChange={setBody} />
          <textarea
            id="bc-body"
            ref={bodyRef}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={12}
            placeholder={"Hi friends,\n\nWe can't wait to see you at the market on..."}
            className="w-full rounded-lg border-2 border-ink/15 bg-white px-3 py-2 font-mono text-sm outline-none focus:border-fern-deep"
          />
        </div>

        {msg && <p role="status" className="text-sm font-medium text-ink-soft">{msg}</p>}

        {!confirming ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-end gap-2">
              <div className="min-w-[200px] flex-1">
                <label htmlFor="bc-test" className="mb-1 block text-xs font-semibold text-ink-soft">
                  Send a test to
                </label>
                <input
                  id="bc-test"
                  type="text"
                  value={testTo}
                  onChange={(e) => setTestTo(e.target.value)}
                  placeholder="Blank sends to you · or you@…, jamie@…"
                  className="h-10 w-full rounded-lg border-2 border-ink/15 bg-white px-3 text-sm outline-none focus:border-fern-deep"
                />
              </div>
              <button
                disabled={pending || !subject || !body}
                onClick={onTest}
                className="h-10 rounded-lg border-2 border-ink/15 px-4 text-sm font-display font-semibold hover:bg-cream disabled:opacity-50"
              >
                {pending ? "Working…" : "Send test"}
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                disabled={pending || !subject || !body || recipientCount === 0}
                onClick={() => { setMode("now"); setConfirming(true); }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-fuchsia px-5 py-2.5 text-sm font-display font-bold text-white hover:opacity-90 disabled:opacity-50"
              >
                Send now
                <ArrowRightIcon size={16} aria-hidden />
              </button>
              <button
                disabled={pending || !subject || !body || recipientCount === 0}
                aria-expanded={mode === "schedule"}
                onClick={() => setMode(mode === "schedule" ? "now" : "schedule")}
                className={`inline-flex items-center gap-1.5 rounded-lg border-2 px-5 py-2.5 text-sm font-display font-bold transition-colors disabled:opacity-50 ${
                  mode === "schedule" ? "border-fern-deep bg-fern-soft text-fern-deep" : "border-ink/15 text-ink hover:bg-cream"
                }`}
              >
                <ClockIcon size={16} aria-hidden />
                Schedule send
              </button>
              <button
                disabled={pending || (!subject && !body)}
                onClick={onSaveDraft}
                className="rounded-lg border-2 border-ink/15 px-4 py-2.5 text-sm font-display font-semibold hover:bg-cream disabled:opacity-50"
              >
                {draftId ? "Update draft" : "Save draft"}
              </button>
            </div>

            {mode === "schedule" && (
              <div className="rounded-lg border-2 border-fern-deep/30 bg-fern-soft/40 p-4">
                <label htmlFor="bc-when" className="mb-1 block text-sm font-semibold text-ink-soft">
                  Send date and time
                </label>
                <div className="flex flex-wrap items-center gap-3">
                  <input
                    id="bc-when"
                    type="datetime-local"
                    value={scheduledFor}
                    onChange={(e) => setScheduledFor(e.target.value)}
                    className="h-11 rounded-lg border-2 border-ink/15 bg-white px-3 text-sm outline-none focus:border-fern-deep"
                  />
                  <button
                    disabled={pending || !scheduleReady}
                    onClick={() => setConfirming(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-fuchsia px-5 py-2.5 text-sm font-display font-bold text-white hover:opacity-90 disabled:opacity-50"
                  >
                    Schedule
                    <ArrowRightIcon size={16} aria-hidden />
                  </button>
                </div>
                <p className="mt-2 text-xs text-ink-soft/70">
                  Goes out on the chosen day at the daily 9:00am ET job — cancelable until then.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-xl border-2 border-fuchsia/40 bg-fuchsia/5 p-4">
            <p className="font-display font-bold">
              {mode === "schedule"
                ? `Schedule to ${recipientCount} ${recipientCount === 1 ? "person" : "people"} for ${fmtWhen(scheduledFor)}?`
                : `Send to ${recipientCount} ${recipientCount === 1 ? "person" : "people"} now?`}
            </p>
            <p className="mt-1 text-sm text-ink-soft">
              {mode === "schedule" ? "You can cancel it before it sends." : "This can’t be undone."}
            </p>
            <div className="mt-3 flex gap-3">
              <button
                disabled={pending}
                onClick={onConfirm}
                className="rounded-lg bg-fuchsia px-5 py-2.5 text-sm font-display font-bold text-white hover:opacity-90 disabled:opacity-60"
              >
                {pending
                  ? mode === "schedule" ? "Scheduling…" : "Sending…"
                  : mode === "schedule" ? "Yes, schedule it" : `Yes, send to ${recipientCount}`}
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
