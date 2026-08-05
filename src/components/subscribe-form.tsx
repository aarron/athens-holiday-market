"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function SubscribeForm({ tone = "light" }: { tone?: "light" | "dark" }) {
  const [email, setEmail] = useState("");
  const [isArtist, setIsArtist] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  const dark = tone === "dark";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setMessage("");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, isArtist }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setStatus("error");
        setMessage(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      setStatus("done");
    } catch {
      setStatus("error");
      setMessage("Network error. Please try again.");
    }
  }

  if (status === "done") {
    return (
      <div
        className={`rounded-lg border-2 p-6 ${
          dark ? "border-paper/20 bg-white/5 text-paper" : "border-fern/40 bg-fern-soft text-ink"
        }`}
        role="status"
      >
        <p className="font-display text-xl font-bold">You&apos;re on the list! 🎉</p>
        <p className={`mt-1 ${dark ? "text-paper/70" : "text-ink-soft"}`}>
          We&apos;ll email you as soon as this year&apos;s dates and artist lineup are set.
          {isArtist && " We&apos;ve noted you're a maker interested in showing your work."}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="w-full max-w-lg">
      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="sr-only" htmlFor="subscribe-email">
          Email address
        </label>
        <input
          id="subscribe-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
          className={`h-14 flex-1 rounded-md border-2 px-4 text-base outline-none transition-colors ${
            dark
              ? "border-paper/25 bg-white/10 text-paper placeholder:text-paper/50 focus:border-fuchsia"
              : "border-ink/20 bg-white text-ink placeholder:text-ink-soft/60 focus:border-fuchsia"
          }`}
        />
        <Button type="submit" size="lg" disabled={status === "loading"}>
          {status === "loading" ? "Adding…" : "Notify me"}
        </Button>
      </div>

      <label
        className={`mt-3 flex cursor-pointer items-center gap-2.5 text-sm ${
          dark ? "text-paper/80" : "text-ink-soft"
        }`}
      >
        <input
          type="checkbox"
          checked={isArtist}
          onChange={(e) => setIsArtist(e.target.checked)}
          className="h-4.5 w-4.5 accent-fuchsia"
        />
        I&apos;m an artist or maker interested in showing my work.
      </label>

      {status === "error" && (
        <p className="mt-2 text-sm font-medium text-poppy">{message}</p>
      )}
    </form>
  );
}
