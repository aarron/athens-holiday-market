import type { Metadata } from "next";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How the Athens Holiday Market collects, uses, and protects your information — including our text-message program.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  const H2 = "font-display text-xl font-extrabold sm:text-2xl";
  return (
    <div className="mx-auto max-w-2xl px-6 pb-24 pt-24 sm:px-8 sm:pt-28">
      <h1 className="text-4xl font-extrabold leading-[1.05] sm:text-5xl">Privacy Policy</h1>
      <p className="mt-4 text-sm text-ink-soft">Last updated: August 2026</p>
      <p className="mt-6 text-lg text-ink-soft">
        The {site.name} (&ldquo;we,&rdquo; &ldquo;us&rdquo;) runs a juried artist market in Athens,
        Georgia. This policy explains what information we collect, how we use it, and the choices you
        have. Questions? Email{" "}
        <a href="mailto:hello@athensholidaymarket.com" className="link">
          hello@athensholidaymarket.com
        </a>
        .
      </p>

      <div className="mt-12 space-y-10">
        <section>
          <h2 className={H2}>Information we collect</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-ink-soft">
            <li>
              <strong className="font-semibold text-ink">Applications:</strong> your name, business
              or booth name, email, mobile number, website and social links, a description of your
              work, and photos you upload.
            </li>
            <li>
              <strong className="font-semibold text-ink">Mailing list:</strong> your name and email,
              if you subscribe to market news.
            </li>
            <li>
              <strong className="font-semibold text-ink">Messages you send us</strong> through the
              contact form or by email.
            </li>
          </ul>
        </section>

        <section>
          <h2 className={H2}>How we use it</h2>
          <p className="mt-3 text-ink-soft">
            We use your information only to run the market: to review applications and notify you of
            a decision, to send accepted artists event-day logistics, to invoice booth fees, to send
            market news you asked for, and to respond to your questions. We do not use it for any
            other purpose.
          </p>
        </section>

        <section>
          <h2 className={H2}>Text messages (SMS)</h2>
          <p className="mt-3 text-ink-soft">
            Accepted artists may opt in to occasional event-day text updates by checking a consent
            box on our application form. You can reply <strong className="font-semibold text-ink">STOP</strong>{" "}
            at any time to unsubscribe, or <strong className="font-semibold text-ink">HELP</strong> for
            help. Full details are on our{" "}
            <a href="/sms-opt-in" className="link">
              SMS terms
            </a>{" "}
            page.
          </p>
          <p className="mt-3 rounded-lg bg-cream-soft p-4 text-ink-soft">
            <strong className="font-semibold text-ink">
              No mobile information will be shared with third parties or affiliates for marketing or
              promotional purposes.
            </strong>{" "}
            Text-messaging originator opt-in data and consent are not shared with any third parties.
          </p>
        </section>

        <section>
          <h2 className={H2}>How we share information</h2>
          <p className="mt-3 text-ink-soft">
            <strong className="font-semibold text-ink">We do not sell or rent your personal
            information.</strong>{" "}
            We share it only with the service providers that help us operate the market — website
            hosting, our email sender, our text-message provider, and our payment processor for booth
            fees — and only so they can perform those services for us. Accepted artists&rsquo; public
            profiles (name, work, and the photos and links they choose) appear on our public artist
            directory. We may also disclose information if required by law.
          </p>
        </section>

        <section>
          <h2 className={H2}>Your choices</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-ink-soft">
            <li>Unsubscribe from emails using the link in any message.</li>
            <li>Opt out of texts by replying STOP.</li>
            <li>
              Ask us to access or delete your information by emailing{" "}
              <a href="mailto:hello@athensholidaymarket.com" className="link">
                hello@athensholidaymarket.com
              </a>
              .
            </li>
          </ul>
        </section>

        <section>
          <h2 className={H2}>Retention</h2>
          <p className="mt-3 text-ink-soft">
            We keep application and contact information for as long as needed to run the market and
            our records year to year, and remove it on request where we&rsquo;re able.
          </p>
        </section>
      </div>
    </div>
  );
}
