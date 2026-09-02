import type { Metadata } from "next";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "SMS Terms & Conditions",
  description:
    "Terms and conditions for the Athens Holiday Market text-message (SMS) program: what we send, how often, message and data rates, and how to opt out or get help.",
  alternates: { canonical: "/sms-terms" },
};

/**
 * SMS Terms & Conditions. A standalone, plainly-titled T&C document — carrier
 * (A2P 10DLC) reviewers look for a page that is explicitly the program's terms
 * and contains the standard CTIA elements: program description, frequency,
 * message & data rates, STOP/HELP instructions, support contact, carrier
 * liability disclaimer, and a privacy policy link. Linked from the opt-in
 * checkbox on /sms-opt-in and cited in the campaign message flow.
 */
export default function SmsTermsPage() {
  const H2 = "font-display text-xl font-extrabold sm:text-2xl";
  const P = "mt-3 text-ink-soft";
  return (
    <div className="mx-auto max-w-2xl px-6 pb-24 pt-24 sm:px-8 sm:pt-28">
      <h1 className="text-4xl font-extrabold leading-[1.05] sm:text-5xl">SMS Terms &amp; Conditions</h1>
      <p className="mt-4 text-sm text-ink-soft">Last updated: August 2026</p>
      <p className="mt-6 text-lg text-ink-soft">
        These terms govern the {site.name} text-message (SMS) program (the &ldquo;Program&rdquo;).
        By opting in, you agree to these terms and to our{" "}
        <a href="/privacy" className="link">
          Privacy Policy
        </a>
        .
      </p>

      <div className="mt-12 space-y-10">
        <section>
          <h2 className={H2}>1. Program description</h2>
          <p className={P}>
            The {site.name} Program sends event-day text messages to people who have opted in —
            primarily artists exhibiting at the market. Messages cover event logistics such as booth
            load-in times, setup instructions, schedule changes, and weather updates for the market
            ({site.event.days[0].label} and {site.event.days[1].label}, {site.event.year}). The
            Program is informational; it is not used for third-party marketing.
          </p>
        </section>

        <section>
          <h2 className={H2}>2. How to opt in</h2>
          <p className={P}>
            You can opt in by checking the unchecked, optional consent box and entering your mobile
            number on our{" "}
            <a href="/sms-opt-in" className="link">
              sign-up form
            </a>{" "}
            or on the artist application form. Consent to receive texts is <strong>not</strong> a
            condition of purchase, of applying, or of using any {site.name} service.
          </p>
        </section>

        <section>
          <h2 className={H2}>3. Message frequency</h2>
          <p className={P}>
            Message frequency varies. Expect only a few messages per year, concentrated around
            event days.
          </p>
        </section>

        <section>
          <h2 className={H2}>4. Message and data rates</h2>
          <p className={P}>
            <strong className="text-ink">Message and data rates may apply.</strong> Charges are
            billed by your mobile carrier according to your plan. Check with your carrier for details.
          </p>
        </section>

        <section>
          <h2 className={H2}>5. How to opt out (STOP)</h2>
          <p className={P}>
            You can cancel at any time. Text{" "}
            <span className="font-mono font-bold text-ink">STOP</span> to unsubscribe. After you
            send STOP, we will send one final message confirming you have been unsubscribed, and you
            will receive no further messages from the Program. To rejoin, sign up again or text{" "}
            <span className="font-mono font-bold text-ink">START</span>.
          </p>
        </section>

        <section>
          <h2 className={H2}>6. Help and support (HELP)</h2>
          <p className={P}>
            For help, text <span className="font-mono font-bold text-ink">HELP</span> at any time,
            or contact us directly at{" "}
            <a href="mailto:hello@athensholidaymarket.com" className="link">
              hello@athensholidaymarket.com
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className={H2}>7. Supported carriers and liability</h2>
          <p className={P}>
            The Program is supported by major U.S. carriers. Carriers are not liable for delayed or
            undelivered messages. Message delivery is subject to effective transmission from your
            network operator.
          </p>
        </section>

        <section>
          <h2 className={H2}>8. Privacy</h2>
          <p className={P}>
            We use your mobile number only to deliver the Program messages described above.{" "}
            <strong className="text-ink">
              No mobile information will be shared with third parties or affiliates for marketing or
              promotional purposes.
            </strong>{" "}
            Text-messaging originator opt-in data and consent are not shared with any third parties.
            See our{" "}
            <a href="/privacy" className="link">
              Privacy Policy
            </a>{" "}
            for full details.
          </p>
        </section>

        <section>
          <h2 className={H2}>9. Changes to these terms</h2>
          <p className={P}>
            We may update these terms from time to time. The current version is always available at
            this page. Continued participation in the Program after a change constitutes acceptance
            of the updated terms.
          </p>
        </section>
      </div>
    </div>
  );
}
