"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Flower } from "@/components/brand";

export function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [company, setCompany] = useState(""); // honeypot — real users leave blank
  const renderedAt = useRef(0);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [errMsg, setErrMsg] = useState("");

  useEffect(() => {
    renderedAt.current = Date.now();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setErrMsg("");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message, company, renderedAt: renderedAt.current }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setStatus("error");
        setErrMsg(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      setStatus("done");
    } catch {
      setStatus("error");
      setErrMsg("Network error. Please try again.");
    }
  }

  if (status === "done") {
    return (
      <div
        className="flex h-full flex-col items-center justify-center rounded-xl border-2 border-fern/40 bg-fern-soft p-8 text-center"
        role="status"
      >
        <Flower size={44} color="var(--color-fern-deep)" className="mx-auto" />
        <p className="mt-4 font-display text-xl font-bold">Message sent! 🎉</p>
        <p className="mt-1 text-ink-soft">
          Thanks for reaching out — we&apos;ll get back to you as soon as we can.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex h-full flex-col gap-4">
      {/* Honeypot: hidden from people, tempting to bots */}
      <div aria-hidden className="absolute left-[-9999px] top-[-9999px] h-0 w-0 overflow-hidden">
        <label>
          Company
          <input
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-ink-soft">Your name</span>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-12 w-full rounded-md border-2 border-ink/15 bg-white px-3 outline-none focus:border-fern-deep"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-ink-soft">Email</span>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-12 w-full rounded-md border-2 border-ink/15 bg-white px-3 outline-none focus:border-fern-deep"
          />
        </label>
      </div>

      <label className="flex flex-1 flex-col">
        <span className="mb-1 block text-sm font-semibold text-ink-soft">Message</span>
        <textarea
          required
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="How can we help?"
          className="w-full flex-1 resize-none rounded-md border-2 border-ink/15 bg-white px-3 py-2 outline-none focus:border-fern-deep sm:min-h-[160px]"
        />
      </label>

      {status === "error" && <p className="text-sm font-medium text-poppy">{errMsg}</p>}

      <Button type="submit" size="lg" disabled={status === "loading"}>
        {status === "loading" ? "Sending…" : "Send message"}
      </Button>
    </form>
  );
}
