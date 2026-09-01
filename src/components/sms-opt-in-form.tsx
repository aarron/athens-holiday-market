"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Flower } from "@/components/brand";
import { CelebrateIcon } from "@/components/icons";
import { SMS_CONSENT_TEXT } from "@/lib/sms";

const field =
  "w-full rounded-lg border-2 border-ink/15 bg-white px-4 py-3 text-base text-ink outline-none transition-colors focus:border-fern-deep placeholder:text-ink-soft/60";

/**
 * Market-updates signup. The base service is the EMAIL newsletter — anyone can
 * subscribe with just their email. SMS is a strictly-optional add-on: a separate,
 * unchecked checkbox plus a mobile field. Leaving it unchecked still subscribes
 * you to email updates, so SMS consent is never a condition of the service
 * (fixing the carrier "forced consent" rejection). The SMS opt-in recorded here
 * is the opt-in cited in our A2P campaign message flow.
 */
export function SmsOptInForm() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [smsConsent, setSmsConsent] = useState(false);
  const [company, setCompany] = useState(""); // honeypot — real users leave blank
  const renderedAt = useRef(0);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [errMsg, setErrMsg] = useState("");
  const [optedSms, setOptedSms] = useState(false);

  useEffect(() => {
    renderedAt.current = Date.now();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrMsg("");
    // Only guard the SMS add-on: if they asked for texts, we need a number.
    // Email alone is always enough to subscribe.
    if (smsConsent && phone.trim() === "") {
      setErrMsg("Add your mobile number to get texts, or uncheck the text-updates box.");
      return;
    }
    setStatus("loading");
    try {
      // Base service: email updates. Always happens.
      const sub = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name }),
      });
      if (!sub.ok) {
        const data = await sub.json().catch(() => ({}));
        setStatus("error");
        setErrMsg(data.error ?? "Please enter a valid email address.");
        return;
      }
      // Optional add-on: record the SMS opt-in only when explicitly chosen.
      let sms = false;
      if (smsConsent && phone.trim()) {
        const r = await fetch("/api/sms-opt-in", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, phone, consent: true, company, renderedAt: renderedAt.current }),
        });
        sms = r.ok;
      }
      setOptedSms(sms);
      setStatus("done");
    } catch {
      setStatus("error");
      setErrMsg("Network error. Please try again.");
    }
  }

  if (status === "done") {
    return (
      <div role="status" className="rounded-xl border-2 border-fern/40 bg-fern-soft p-6 text-center">
        <Flower size={40} color="var(--color-fern-deep)" className="mx-auto" />
        <p className="mt-3 flex items-center justify-center gap-2 font-display text-xl font-bold">
          <CelebrateIcon size={22} className="text-fern-deep" aria-hidden />
          You&rsquo;re on the list!
        </p>
        <p className="mx-auto mt-2 max-w-sm text-ink-soft">
          We&rsquo;ll email you market updates
          {optedSms ? (
            <>
              {" "}
              and text you event-day updates. Reply <strong>STOP</strong> to the texts any time.
            </>
          ) : (
            <>.</>
          )}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="rounded-xl border-2 border-ink/10 bg-white p-5 sm:p-6" noValidate>
      <div className="grid gap-4">
        <div>
          <label htmlFor="mu-email" className="block font-display text-sm font-bold text-ink">
            Email address
          </label>
          <input
            id="mu-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={`mt-1.5 ${field}`}
            placeholder="you@email.com"
          />
        </div>

        <div>
          <label htmlFor="mu-name" className="block font-display text-sm font-bold text-ink">
            Name <span className="font-normal text-ink-soft">(optional)</span>
          </label>
          <input
            id="mu-name"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={`mt-1.5 ${field}`}
            placeholder="Jamie Rivera"
          />
        </div>

        {/* Optional SMS add-on — clearly separate from the email signup above. */}
        <fieldset className="rounded-lg border border-ink/10 bg-cream-soft/60 p-4">
          <legend className="px-1 text-xs font-bold uppercase tracking-wide text-ink-soft">
            Optional: text updates
          </legend>

          <label htmlFor="mu-consent" className="flex items-start gap-3">
            <input
              id="mu-consent"
              type="checkbox"
              checked={smsConsent}
              onChange={(e) => setSmsConsent(e.target.checked)}
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

          <div className="mt-3">
            <label htmlFor="mu-phone" className="block text-sm font-semibold text-ink">
              Mobile number <span className="font-normal text-ink-soft">(only if you want texts)</span>
            </label>
            <input
              id="mu-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={`mt-1.5 ${field}`}
              placeholder="(706) 555-0142"
            />
          </div>
        </fieldset>

        {/* Honeypot — visually hidden, real users never fill it. */}
        <div aria-hidden className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
          <label htmlFor="mu-company">Company</label>
          <input
            id="mu-company"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
          />
        </div>

        {errMsg && (
          <p role="alert" className="text-sm font-medium text-poppy-deep">
            {errMsg}
          </p>
        )}

        <Button type="submit" variant="primary" loading={status === "loading"} loadingLabel="Signing up…">
          Sign up for updates
        </Button>
        <p className="text-center text-xs text-ink-soft">
          Email updates only — texting is optional, and you can subscribe without it.
        </p>
      </div>
    </form>
  );
}
