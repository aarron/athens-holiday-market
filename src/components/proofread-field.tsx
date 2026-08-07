"use client";

import { useState } from "react";
import { proofreadText, type ProofreadMode } from "@/lib/proofread-actions";

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
        <button
          type="button"
          onClick={() => run("grammar")}
          disabled={disabled}
          className="rounded-lg border-2 border-ink/15 px-3 py-1.5 text-sm font-semibold hover:bg-cream disabled:opacity-50"
        >
          {proofing === "grammar" ? "Checking…" : "Check grammar & spelling"}
        </button>
        <button
          type="button"
          onClick={() => run("polish")}
          disabled={disabled}
          className="rounded-lg border-2 border-ink/15 px-3 py-1.5 text-sm font-semibold hover:bg-cream disabled:opacity-50"
        >
          {proofing === "polish" ? "Polishing…" : "Polish for clarity"}
        </button>
        <span className="ml-auto text-xs text-ink-soft/70">{wordCount(value)} words</span>
      </div>

      {proofErr && <p className="text-sm font-medium text-poppy-deep">{proofErr}</p>}

      {suggestion && (
        <div className="rounded-lg border-2 border-fern-deep/25 bg-fern-soft/40 p-4">
          <p className="mb-1 text-sm font-bold text-fern-deep">Suggested version</p>
          <p className="whitespace-pre-line text-sm leading-relaxed text-ink">{suggestion}</p>
          <p className="mt-2 text-xs text-ink-soft/80">
            These are just suggestions — your words stay yours. Use them or keep your own.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                onChange(suggestion);
                setSuggestion(null);
              }}
              className="rounded-lg bg-fern-deep px-4 py-1.5 text-sm font-bold text-white hover:opacity-90"
            >
              Use this
            </button>
            <button
              type="button"
              onClick={() => setSuggestion(null)}
              className="rounded-lg border-2 border-ink/15 px-4 py-1.5 text-sm font-semibold hover:bg-cream"
            >
              Keep mine
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
