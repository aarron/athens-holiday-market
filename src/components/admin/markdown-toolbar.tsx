"use client";

import { type RefObject } from "react";

type Edit = { value: string; selStart: number; selEnd: number };

/** Wrap the selection (or a placeholder) with `before`/`after`, selecting the body. */
function wrap(v: string, s: number, e: number, before: string, after: string, ph: string): Edit {
  const body = v.slice(s, e) || ph;
  const value = v.slice(0, s) + before + body + after + v.slice(e);
  const selStart = s + before.length;
  return { value, selStart, selEnd: selStart + body.length };
}

/** Insert a `[label](https://)` link/button, leaving the URL selected to type over. */
function link(v: string, s: number, e: number, doubled: boolean, ph: string): Edit {
  const label = v.slice(s, e) || ph;
  const url = "https://";
  const open = doubled ? "[[" : "[";
  const close = doubled ? "]]" : "]";
  // Buttons must sit on their own block, so pad with blank lines.
  const pad = doubled ? "\n\n" : "";
  const insert = `${pad}${open}${label}${close}(${url})${pad}`;
  const value = v.slice(0, s) + insert + v.slice(e);
  const selStart = s + pad.length + open.length + label.length + close.length + 1; // after "("
  return { value, selStart, selEnd: selStart + url.length };
}

/** Toggle a heading of `level` (# count) on the line under the cursor. */
function heading(v: string, s: number, level: number): Edit {
  const lineStart = v.lastIndexOf("\n", s - 1) + 1;
  let lineEnd = v.indexOf("\n", s);
  if (lineEnd === -1) lineEnd = v.length;
  const line = v.slice(lineStart, lineEnd);
  const current = line.match(/^(#{1,3})\s+/);
  const bare = line.replace(/^#{1,3}\s+/, "");
  // Same level again → remove it; otherwise apply this level.
  const next = current && current[1].length === level ? bare : `${"#".repeat(level)} ${bare}`;
  const value = v.slice(0, lineStart) + next + v.slice(lineEnd);
  const caret = lineStart + next.length;
  return { value, selStart: caret, selEnd: caret };
}

/** Insert a horizontal-rule block (`---`) on its own line at the cursor. */
function rule(v: string, s: number, e: number): Edit {
  const before = v.slice(0, s).replace(/\s+$/, "");
  const after = v.slice(e).replace(/^\s+/, "");
  const insert = `${before ? "\n\n" : ""}---\n\n`;
  const value = before + insert + after;
  const caret = before.length + insert.length;
  return { value, selStart: caret, selEnd: caret };
}

/** Prefix every line touched by the selection with `- ` (toggles off if present). */
function bulletList(v: string, s: number, e: number): Edit {
  const lineStart = v.lastIndexOf("\n", s - 1) + 1;
  let lineEnd = v.indexOf("\n", e);
  if (lineEnd === -1) lineEnd = v.length;
  const block = v.slice(lineStart, lineEnd);
  const allBulleted = block.split("\n").every((l) => /^\s*-\s/.test(l) || l.trim() === "");
  const next = block
    .split("\n")
    .map((l) => (l.trim() === "" ? l : allBulleted ? l.replace(/^(\s*)-\s/, "$1") : `- ${l}`))
    .join("\n");
  const value = v.slice(0, lineStart) + next + v.slice(lineEnd);
  return { value, selStart: lineStart, selEnd: lineStart + next.length };
}

const BTN =
  "inline-flex h-8 min-w-8 items-center justify-center rounded-md border border-ink/15 bg-white px-2 text-sm font-semibold text-ink transition-colors hover:bg-cream focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-fern-deep";

/**
 * Lightweight formatting bar for a plain markdown <textarea>. Applies the
 * project's supported syntax to the current selection and restores focus +
 * selection so typing continues naturally. No editor library — parity with the
 * email renderer's exact markdown subset.
 */
export function MarkdownToolbar({
  textareaRef,
  value,
  onChange,
}: {
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  value: string;
  onChange: (next: string) => void;
}) {
  function apply(fn: (v: string, s: number, e: number) => Edit) {
    const ta = textareaRef.current;
    if (!ta) return;
    const { value: next, selStart, selEnd } = fn(value, ta.selectionStart, ta.selectionEnd);
    onChange(next);
    // Restore focus + selection after React commits the new value.
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(selStart, selEnd);
    });
  }

  // Pure transforms only (no ref access here) — the textarea ref is read solely
  // inside apply(), which runs from onClick, never during render.
  const actions: { label: string; title: string; cls?: string; fn: (v: string, s: number, e: number) => Edit }[] = [
    { label: "H1", title: "Heading", fn: (v, s) => heading(v, s, 1) },
    { label: "H2", title: "Subheading", fn: (v, s) => heading(v, s, 2) },
    { label: "B", title: "Bold", cls: "font-extrabold", fn: (v, s, e) => wrap(v, s, e, "**", "**", "bold text") },
    { label: "I", title: "Italic", cls: "italic", fn: (v, s, e) => wrap(v, s, e, "*", "*", "italic text") },
    { label: "Link", title: "Insert link", fn: (v, s, e) => link(v, s, e, false, "link text") },
    { label: "Button", title: "Insert call-to-action button", fn: (v, s, e) => link(v, s, e, true, "Button label") },
    { label: "• List", title: "Bulleted list", fn: (v, s, e) => bulletList(v, s, e) },
    { label: "―", title: "Divider", fn: (v, s, e) => rule(v, s, e) },
  ];

  return (
    <div className="mb-1.5 flex flex-wrap items-center gap-1.5" role="toolbar" aria-label="Formatting">
      {actions.map((a) => (
        <button
          key={a.label}
          type="button"
          title={a.title}
          aria-label={a.title}
          onClick={() => apply(a.fn)}
          className={`${BTN} ${a.cls ?? ""}`}
        >
          {a.label}
        </button>
      ))}
    </div>
  );
}
