import type { Metadata } from "next";
import { site } from "@/lib/site";
import { SmsOptInForm } from "@/components/sms-opt-in-form";

export const metadata: Metadata = {
  title: "SMS updates",
  description:
    "Sign up for Athens Holiday Market event-day text updates — load-in, schedule, and weather — for artists in the market. See how it works and how to opt out.",
  alternates: { canonical: "/sms-opt-in" },
};

/**
 * Public SMS opt-in for market artists. This page carries a real, completable
 * opt-in form (a visitor enters their mobile number and checks the consent box),
 * which is the opt-in cited in our Twilio A2P campaign message flow — a carrier
 * reviewer can find and complete it without logging in. Below the form are the
 * full program terms (frequency, rates, STOP/HELP, privacy).
 */
export default function SmsOptInPage() {
  const H2 = "font-display text-xl font-extrabold sm:text-2xl";
  return (
    <div className="mx-auto max-w-2xl px-6 pb-24 pt-24 sm:px-8 sm:pt-28">
      <h1 className="text-4xl font-extrabold leading-[1.05] sm:text-5xl">Market updates</h1>
      <p className="mt-5 text-lg text-ink-soft">
        Sign up for email updates about the {site.name}. If you&rsquo;re an artist in the market, you
        can <em>also</em> opt in to a few event-day text messages — but that&rsquo;s entirely
        optional, and you&rsquo;ll get email updates either way.
      </p>

      {/* Email signup is the service; SMS is a separate, optional add-on. */}
      <section className="mt-8">
        <h2 className={H2}>Sign up for updates</h2>
        <p className="mt-2 text-ink-soft">
          Your email subscribes you to market news. Texting is optional — leave the text box
          unchecked and you&rsquo;ll still be subscribed. Artists can also opt in on the{" "}
          <a href="/apply" className="link">
            application form
          </a>
          .
        </p>
        <div className="mt-4">
          <SmsOptInForm />
        </div>
      </section>

      <div id="terms" className="mt-14 space-y-10">
        <section className="rounded-xl border-2 border-ink/10 bg-cream-soft/60 p-5">
          <h2 className={H2}>SMS Terms &amp; Conditions</h2>
          <p className="mt-3 text-ink-soft">
            The full terms for this text-message program — frequency, message and data rates, how to
            opt out (STOP), how to get help (HELP), and carrier information — are published at{" "}
            <a href="/sms-terms" className="link font-semibold">
              athensholidaymarket.com/sms-terms
            </a>
            . Our{" "}
            <a href="/privacy" className="link font-semibold">
              Privacy Policy
            </a>{" "}
            covers how we handle your number.
          </p>
        </section>

        <section>
          <h2 className={H2}>What we send</h2>
          <p className="mt-3 text-ink-soft">
            Event-day logistics only — booth load-in times, setup instructions, schedule changes, and
            weather updates — sent a few times a year around the market ({site.event.days[0].label} and{" "}
            {site.event.days[1].label}, {site.event.year}). This is not a marketing or promotional
            program. Example messages:
          </p>
          <ul className="mt-4 space-y-2">
            {[
              "Athens Holiday Market: Load-in starts at 3:00pm today at the Big City Bread courtyard (Meigs & Finley). See you there! Reply STOP to opt out.",
              "Athens Holiday Market: Doors open to shoppers at 5pm today — weather's clear. Reply STOP to opt out.",
            ].map((m) => (
              <li key={m} className="rounded-lg border border-ink/10 bg-white p-3 text-sm text-ink-soft">
                {m}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className={H2}>Frequency, rates, and how to stop</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-ink-soft">
            <li>
              <strong className="font-semibold text-ink">Frequency:</strong> occasional — only around
              event days, a few messages per year.
            </li>
            <li>
              <strong className="font-semibold text-ink">Message &amp; data rates</strong> may apply,
              depending on your mobile carrier and plan.
            </li>
            <li>
              <strong className="font-semibold text-ink">Opt out any time:</strong> reply{" "}
              <span className="font-mono font-bold text-ink">STOP</span> to unsubscribe. You will
              receive a single confirmation and no further messages.
            </li>
            <li>
              <strong className="font-semibold text-ink">Help:</strong> reply{" "}
              <span className="font-mono font-bold text-ink">HELP</span>, or email us at{" "}
              <a href="mailto:hello@athensholidaymarket.com" className="link">
                hello@athensholidaymarket.com
              </a>
              .
            </li>
          </ul>
        </section>

        <section>
          <h2 className={H2}>Privacy</h2>
          <p className="mt-3 text-ink-soft">
            We use your mobile number only to send the event-day updates described above. We never
            sell or share it, and mobile opt-in data is never shared with third parties for their own
            marketing. Full details are in our{" "}
            <a href="/privacy" className="link">
              privacy policy
            </a>
            . Questions?{" "}
            <a href="/contact" className="link">
              Get in touch
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
