"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { emailShell, renderMarkdown } from "@/lib/email-shell";
import { getBroadcastTemplates } from "@/lib/broadcast-templates";
import { sendTestEmail, sendBroadcast, scheduleBroadcast, saveDraft } from "@/lib/broadcast-actions";
import { MarkdownToolbar } from "@/components/admin/markdown-toolbar";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { StatusMessage } from "@/components/ui/status-message";
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

/** ISO (UTC) → a local `YYYY-MM-DDTHH:mm` value for a datetime-local input. */
function isoToLocalInput(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function Composer({
  counts,
  draft,
}: {
  counts: Record<Segment, number>;
  draft?: {
    id: number;
    name: string | null;
    subject: string;
    body: string;
    segment: Segment;
    status?: string;
    scheduledForIso?: string;
  };
}) {
  const router = useRouter();
  const [name, setName] = useState(draft?.name ?? "");
  const [subject, setSubject] = useState(draft?.subject ?? "");
  const [body, setBody] = useState(draft?.body ?? "");
  const [segment, setSegment] = useState<Segment>(draft?.segment ?? "all");
  // Editing a scheduled email opens in "schedule" mode with its time pre-filled.
  const [mode, setMode] = useState<"now" | "schedule">(
    draft?.status === "scheduled" ? "schedule" : "now",
  );
  const [scheduledFor, setScheduledFor] = useState(isoToLocalInput(draft?.scheduledForIso));
  const [testTo, setTestTo] = useState("");
  const [draftId, setDraftId] = useState<number | undefined>(draft?.id);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState("");
  const [confirming, setConfirming] = useState(false);

  function onSaveDraft() {
    setMsg("");
    start(async () => {
      const r = await saveDraft({ id: draftId, name, subject, body, segment });
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
          ? await scheduleBroadcast({ name, subject, body, segment, scheduledFor, draftId })
          : await sendBroadcast({ name, subject, body, segment, draftId });
      if (r && "ok" in r && r.ok) {
        router.push("/admin/broadcasts#email");
      } else {
        setConfirming(false);
        setMsg(r?.error ?? "Couldn't send.");
      }
    });
  }

  const noContent = !subject || !body;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1fr] lg:items-start">
      {/* Compose */}
      <div className="space-y-4">
        <Field label="Start from a template">
          <Select
            defaultValue=""
            onChange={(e) => {
              const t = getBroadcastTemplates().find((x) => x.id === e.target.value);
              if (t) {
                setSubject(t.subject);
                setBody(t.body);
              }
            }}
          >
            <option value="">Blank — write from scratch</option>
            {getBroadcastTemplates().map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          htmlFor="bc-name"
          label={
            <>
              Name
              <span className="ml-2 font-normal text-ink-soft/70">
                internal only — helps you find it later
              </span>
            </>
          }
        >
          <Input
            id="bc-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={`${new Date().getFullYear()} Acceptance email`}
          />
        </Field>

        <Field label="Subject" htmlFor="bc-subject">
          <Input
            id="bc-subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="The Athens Holiday Market is back!"
          />
        </Field>

        <Field label="Send to" htmlFor="bc-segment">
          <Select id="bc-segment" value={segment} onChange={(e) => setSegment(e.target.value as Segment)}>
            {SEGMENT_GROUPS.map((g) => (
              <optgroup key={g.label} label={g.label}>
                {g.options.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label} ({counts[s.value] ?? 0})
                  </option>
                ))}
              </optgroup>
            ))}
          </Select>
        </Field>

        <Field
          htmlFor="bc-body"
          label={
            <>
              Message
              <span className="ml-2 font-normal text-ink-soft/70">
                # heading, **bold**, *italic*, [links](https://…), [[Button]](https://…), - lists, --- divider
              </span>
            </>
          }
        >
          <MarkdownToolbar textareaRef={bodyRef} value={body} onChange={setBody} />
          <Textarea
            id="bc-body"
            ref={bodyRef}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={12}
            className="font-mono"
            placeholder={"Hi friends,\n\nWe can't wait to see you at the market on..."}
          />
        </Field>

        {msg && <StatusMessage>{msg}</StatusMessage>}

        {!confirming ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-end gap-2">
              <Field label="Send a test to" htmlFor="bc-test" className="min-w-[200px] flex-1">
                <Input
                  id="bc-test"
                  value={testTo}
                  onChange={(e) => setTestTo(e.target.value)}
                  placeholder="Blank sends to you · or you@…, jamie@…"
                />
              </Field>
              <Button variant="secondary" size="sm" loading={pending} disabled={noContent} onClick={onTest}>
                Send test
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="create"
                size="sm"
                disabled={pending || noContent || recipientCount === 0}
                onClick={() => { setMode("now"); setConfirming(true); }}
              >
                Send now
                <ArrowRightIcon size={16} aria-hidden />
              </Button>
              <Button
                variant="secondary"
                size="sm"
                aria-expanded={mode === "schedule"}
                disabled={pending || noContent || recipientCount === 0}
                onClick={() => setMode(mode === "schedule" ? "now" : "schedule")}
                className={mode === "schedule" ? "!border-fern-deep !bg-fern-soft !text-fern-deep" : ""}
              >
                <ClockIcon size={16} aria-hidden />
                Schedule send
              </Button>
              <Button variant="secondary" size="sm" disabled={pending || (!subject && !body)} onClick={onSaveDraft}>
                {draftId ? "Update draft" : "Save draft"}
              </Button>
            </div>

            {mode === "schedule" && (
              <div className="rounded-lg border-2 border-fern-deep/30 bg-fern-soft/40 p-4">
                <Field label="Send date and time" htmlFor="bc-when">
                  <div className="flex flex-wrap items-center gap-3">
                    <Input
                      id="bc-when"
                      type="datetime-local"
                      value={scheduledFor}
                      onChange={(e) => setScheduledFor(e.target.value)}
                      className="!w-auto"
                    />
                    <Button variant="create" size="sm" disabled={pending || !scheduleReady} onClick={() => setConfirming(true)}>
                      Schedule
                      <ArrowRightIcon size={16} aria-hidden />
                    </Button>
                  </div>
                </Field>
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
              <Button
                variant="create"
                size="sm"
                loading={pending}
                loadingLabel={mode === "schedule" ? "Scheduling…" : "Sending…"}
                onClick={onConfirm}
              >
                {mode === "schedule" ? "Yes, schedule it" : `Yes, send to ${recipientCount}`}
              </Button>
              <Button variant="ghost" size="sm" disabled={pending} onClick={() => setConfirming(false)}>
                Cancel
              </Button>
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
