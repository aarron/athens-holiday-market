import type { Metadata } from "next";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "SMS updates",
  description:
    "How the Athens Holiday Market text-message program works — who receives event-day updates, how you opt in, and how to opt out.",
  alternates: { canonical: "/sms-opt-in" },
};

/**
 * Public opt-in / SMS-terms page. Doubles as the consent proof for carrier
 * (Twilio toll-free) verification — a reviewer who isn't logged in can see the
 * exact opt-in language, the checkbox as it appears on the application form, and
 * the full program terms (frequency, rates, STOP/HELP).
 */
export default function SmsOptInPage() {
  const H2 = "font-display text-xl font-extrabold sm:text-2xl";
  return (
    <div className="mx-auto max-w-2xl px-6 pb-24 pt-24 sm:px-8 sm:pt-28">
      <h1 className="text-4xl font-extrabold leading-[1.05] sm:text-5xl">Text message updates</h1>
      <p className="mt-5 text-lg text-ink-soft">
        The {site.name} sends a small number of event-day text messages to accepted artists who ask
        for them. Here&rsquo;s exactly how it works, and how to stop.
      </p>

      <div className="mt-12 space-y-10">
        <section>
          <h2 className={H2}>How you opt in</h2>
          <p className="mt-3 text-ink-soft">
            When you apply to sell at the market, the application form asks for your mobile number and
            includes an unchecked, optional consent box. You are only added to text updates if you
            check it yourself — it is never checked for you, and it is never required to apply. This
            is the exact box that appears on the form at{" "}
            <a href="/apply" className="link">
              {site.url.replace(/^https?:\/\//, "")}/apply
            </a>
            :
          </p>

          {/* The real consent control, reproduced from the application form. */}
          <div className="mt-4 rounded-lg bg-cream-soft p-4">
            <div className="flex items-start gap-3">
              <span
                aria-hidden
                className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-[3px] bg-fern-deep text-[10px] font-bold text-white"
              >
                ✓
              </span>
              <span className="text-sm text-ink-soft">
                <span className="font-semibold text-ink">Text me event-day updates</span> about the
                market — load-in times, schedule, and weather. Msg &amp; data rates may apply; reply
                STOP to opt out. <span className="text-ink-soft/70">(Optional)</span>
              </span>
            </div>
          </div>
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
            marketing. Questions?{" "}
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
