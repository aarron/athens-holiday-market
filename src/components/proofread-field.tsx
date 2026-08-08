"use client";

import { useState } from "react";
import { proofreadText, type ProofreadMode } from "@/lib/proofread-actions";
import { Button } from "@/components/ui/button";
import { StatusMessage } from "@/components/ui/status-message";

function wordCount(s: string) {
  const t = s.trim();
  return t ? t.split(/\s+/).length : 0;
}

/**
 * Controlled textarea with "Check grammar & spelling" and "Polish for clarity"
 * buttons. Shows the AI suggestion next to the writer's original with
 * Use this / Keep mine — nothing changes unless they accept. Reused on the
 * public application form and in the artist portal.
 */
export function ProofreadField({
  id,
  value,
  onChange,
  rows = 5,
  placeholder,
  textareaClassName,
  minWords = 3,
  required,
  invalid,
  describedBy,
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
  textareaClassName?: string;
  minWords?: number;
  required?: boolean;
  invalid?: boolean;
  describedBy?: string;
}) {
  const [proofing, setProofing] = useState<ProofreadMode | null>(null);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [proofErr, setProofErr] = useState("");

  async function run(mode: ProofreadMode) {
    setProofErr("");
    setSuggestion(null);
    setProofing(mode);
    try {
      const res = await proofreadText(value, mode);
      if ("suggestion" in res && res.suggestion) setSuggestion(res.suggestion);
      else setProofErr(("error" in res && res.error) || "Couldn't help just now.");
    } catch {
      setProofErr("Couldn't help just now. Please try again.");
    } finally {
      setProofing(null);
    }
  }

  const disabled = proofing !== null || wordCount(value) < minWords;

  return (
    <div className="space-y-2">
      <textarea
        id={id}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          if (suggestion) setSuggestion(null);
        }}
        rows={rows}
        placeholder={placeholder}
        aria-required={required || undefined}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        className={textareaClassName}
      />

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => run("grammar")}
          disabled={disabled}
          loading={proofing === "grammar"}
          loadingLabel="Checking…"
        >
          Check grammar &amp; spelling
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => run("polish")}
          disabled={disabled}
          loading={proofing === "polish"}
          loadingLabel="Polishing…"
        >
          Polish for clarity
        </Button>
        <span className="ml-auto text-xs text-ink-soft/70">{wordCount(value)} words</span>
      </div>

      {proofErr && <StatusMessage tone="error">{proofErr}</StatusMessage>}

      {suggestion && (
        <div className="rounded-lg border-2 border-fern-deep/25 bg-fern-soft/40 p-4">
          <p className="mb-1 text-sm font-bold text-fern-deep">Suggested version</p>
          <p className="whitespace-pre-line text-sm leading-relaxed text-ink">{suggestion}</p>
          <p className="mt-2 text-xs text-ink-soft/80">
            These are just suggestions — your words stay yours. Use them or keep your own.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              variant="confirm"
              size="sm"
              onClick={() => {
                onChange(suggestion);
                setSuggestion(null);
              }}
            >
              Use this
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setSuggestion(null)}>
              Keep mine
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
