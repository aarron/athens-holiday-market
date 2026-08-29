"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Flower } from "@/components/brand";
import { CelebrateIcon } from "@/components/icons";
import { SMS_CONSENT_TEXT } from "@/lib/sms";

const field =
  "w-full rounded-lg border-2 border-ink/15 bg-white px-4 py-3 text-base text-ink outline-none transition-colors focus:border-fern-deep placeholder:text-ink-soft/60";

/**
 * Public, working SMS opt-in. A visitor enters their mobile number and checks
 * the (unchecked) consent box to receive event-day market text updates — a real,
 * completable opt-in a carrier reviewer can verify, and the primary opt-in cited
 * in our A2P campaign message flow. Submissions post to /api/sms-opt-in, which
 * records the consent. No SMS is sent until the A2P campaign is approved.
 */
export function SmsOptInForm() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [company, setCompany] = useState(""); // honeypot — real users leave blank
  const renderedAt = useRef(0);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [errMsg, setErrMsg] = useState("");

  useEffect(() => {
    renderedAt.current = Date.now();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrMsg("");
    if (!consent) {
      setErrMsg("Please check the box to agree to receive text updates.");
      return;
    }
    setStatus("loading");
    try {
      const res = await fetch("/api/sms-opt-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, consent, company, renderedAt: renderedAt.current }),
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
        role="status"
        className="rounded-xl border-2 border-fern/40 bg-fern-soft p-6 text-center"
      >
        <Flower size={40} color="var(--color-fern-deep)" className="mx-auto" />
        <p className="mt-3 flex items-center justify-center gap-2 font-display text-xl font-bold">
          <CelebrateIcon size={22} className="text-fern-deep" aria-hidden />
          You&rsquo;re signed up!
        </p>
        <p className="mx-auto mt-2 max-w-sm text-ink-soft">
          We&rsquo;ll text you event-day updates around the market. Reply <strong>STOP</strong> any
          time to unsubscribe, or <strong>HELP</strong> for help.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="rounded-xl border-2 border-ink/10 bg-white p-5 sm:p-6" noValidate>
      <div className="grid gap-4">
        <div>
          <label htmlFor="sms-name" className="block font-display text-sm font-bold text-ink">
            Name <span className="font-normal text-ink-soft">(optional)</span>
          </label>
          <input
            id="sms-name"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={`mt-1.5 ${field}`}
            placeholder="Jamie Rivera"
          />
        </div>

        <div>
          <label htmlFor="sms-phone" className="block font-display text-sm font-bold text-ink">
            Mobile number
          </label>
          <input
            id="sms-phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={`mt-1.5 ${field}`}
            placeholder="(706) 555-0142"
          />
        </div>

        {/* Honeypot — visually hidden, real users never fill it. */}
        <div aria-hidden className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
          <label htmlFor="sms-company">Company</label>
          <input
            id="sms-company"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
          />
        </div>

        <label htmlFor="sms-consent" className="flex items-start gap-3">
          <input
            id="sms-consent"
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-1 h-4 w-4 shrink-0 accent-fern-deep"
          />
          <span className="text-sm text-ink-soft">
            {SMS_CONSENT_TEXT}{" "}
            <a href="#terms" className="link">
              Program terms
            </a>{" "}
            and{" "}
            <a href="/privacy" className="link">
              privacy policy
            </a>
            .
          </span>
        </label>

        {errMsg && (
          <p role="alert" className="text-sm font-medium text-poppy-deep">
            {errMsg}
          </p>
        )}

        <Button type="submit" variant="primary" loading={status === "loading"} loadingLabel="Signing up…">
          Sign up for text updates
        </Button>
      </div>
    </form>
  );
}
