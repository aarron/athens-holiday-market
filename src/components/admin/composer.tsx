"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { emailShell, renderMarkdown } from "@/lib/email-template";
import { getBroadcastTemplates } from "@/lib/email-templates";
import { sendTestEmail, sendBroadcast, scheduleBroadcast } from "@/lib/broadcast-actions";
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

export function Composer({ counts }: { counts: Record<Segment, number> }) {
  const router = useRouter();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [segment, setSegment] = useState<Segment>("all");
  const [mode, setMode] = useState<"now" | "schedule">("now");
  const [scheduledFor, setScheduledFor] = useState("");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState("");
  const [confirming, setConfirming] = useState(false);

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
    start(async () => {
      const r = await sendTestEmail({ subject, body });
      setMsg(r && "ok" in r && r.ok ? `Test sent to ${r.to} ✓` : r?.error ?? "Couldn't send test.");
    });
  }

  function onConfirm() {
    setMsg("");
    start(async () => {
      const r =
        mode === "schedule"
          ? await scheduleBroadcast({ subject, body, segment, scheduledFor })
          : await sendBroadcast({ subject, body, segment });
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

        {/* When to send */}
        <fieldset>
          <legend className="mb-1 block text-sm font-semibold text-ink-soft">When to send</legend>
          <div className="flex flex-wrap gap-4">
            {(["now", "schedule"] as const).map((m) => (
              <label key={m} className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="when"
                  checked={mode === m}
                  onChange={() => { setMode(m); setConfirming(false); }}
                  className="h-4 w-4 accent-fern-deep"
                />
                {m === "now" ? "Send now" : "Schedule for later"}
              </label>
            ))}
          </div>
          {mode === "schedule" && (
            <div className="mt-2">
              <input
                type="datetime-local"
                aria-label="Send date and time"
                value={scheduledFor}
                onChange={(e) => setScheduledFor(e.target.value)}
                className="h-11 w-full rounded-lg border-2 border-ink/15 bg-white px-3 text-sm outline-none focus:border-fern-deep sm:w-auto"
              />
              <p className="mt-1 text-xs text-ink-soft/70">
                Scheduled emails go out on the chosen day at the daily 9:00am ET job — cancelable
                until then.
              </p>
            </div>
          )}
        </fieldset>

        <div>
          <label className="mb-1 block text-sm font-semibold text-ink-soft" htmlFor="bc-body">
            Message
            <span className="ml-2 font-normal text-ink-soft/70">
              **bold**, *italic*, [links](https://…), - lists
            </span>
          </label>
          <textarea
            id="bc-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={12}
            placeholder={"Hi friends,\n\nWe can't wait to see you at the market on..."}
            className="w-full rounded-lg border-2 border-ink/15 bg-white px-3 py-2 font-mono text-sm outline-none focus:border-fern-deep"
          />
        </div>

        {msg && <p role="status" className="text-sm font-medium text-ink-soft">{msg}</p>}

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
              disabled={pending || !subject || !body || recipientCount === 0 || !scheduleReady}
              onClick={() => setConfirming(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-fuchsia px-5 py-2.5 text-sm font-display font-bold text-white hover:opacity-90 disabled:opacity-50"
            >
              {mode === "schedule" ? "Schedule email" : "Send email"}
              {mode === "schedule" ? <ClockIcon size={16} aria-hidden /> : <ArrowRightIcon size={16} aria-hidden />}
            </button>
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
