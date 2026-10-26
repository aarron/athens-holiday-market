"use client";

import { useEffect, useRef, useState } from "react";

export type SaveState = "idle" | "saving" | "saved" | "error";

/**
 * Save `value` (via `save`) about a second after it stops changing. Skips the
 * first render, so opening a page never writes anything.
 */
export function useAutosave<T>(value: T, save: (v: T) => Promise<{ ok?: boolean } | { error?: string } | undefined>, delay = 900) {
  const [state, setState] = useState<SaveState>("idle");
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const first = useRef(true);
  const json = JSON.stringify(value);
  const saveRef = useRef(save);
  // An edit still waiting out the delay, so leaving the page doesn't drop it.
  const pending = useRef<string | null>(null);
  useEffect(() => {
    saveRef.current = save;
  });

  useEffect(() => {
    const flush = () => {
      if (pending.current === null) return;
      const v = pending.current;
      pending.current = null;
      void saveRef.current(JSON.parse(v) as T);
    };
    // A reload or closed tab can't finish a save, so ask first (only in the
    // second after typing); in-app navigation unmounts and flushes below.
    const warn = (e: BeforeUnloadEvent) => {
      if (pending.current !== null) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => {
      window.removeEventListener("beforeunload", warn);
      flush();
    };
  }, []);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    pending.current = json;
    const t = setTimeout(async () => {
      pending.current = null;
      setState("saving");
      try {
        const r = await saveRef.current(JSON.parse(json) as T);
        if (r && "error" in r && r.error) setState("error");
        else {
          setState("saved");
          setSavedAt(new Date());
        }
      } catch {
        setState("error");
      }
    }, delay);
    return () => clearTimeout(t);
  }, [json, delay]);

  return { state, savedAt };
}

/** "Saving…" / "Saved" / "Couldn't save" label for a save state. */
export function saveLabel(state: SaveState): string {
  return state === "saving" ? "Saving…" : state === "saved" ? "Saved" : state === "error" ? "Couldn't save — check your connection" : "";
}
