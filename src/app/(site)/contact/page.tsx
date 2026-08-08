import type { Metadata } from "next";
import { site, mapsHref } from "@/lib/site";
import { ContactForm } from "@/components/contact-form";
import { Flower } from "@/components/brand";
import { ButtonLink } from "@/components/ui/button";
import { MapPinIcon, MailIcon, ArrowRightIcon } from "@/components/icons";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Get in touch with the Athens Holiday Market team, and find directions to the Big City Bread courtyard in Athens, GA.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  const mapEmbed = `https://www.google.com/maps?q=${encodeURIComponent(site.location.mapsQuery)}&output=embed`;

  return (
    <div className="mx-auto max-w-7xl px-5 pb-16 pt-24 sm:px-8 sm:pb-20 sm:pt-28">
      <div className="max-w-2xl">
        <div className="flex items-center gap-2">
          <Flower size={22} color="var(--color-fuchsia)" />
          <p className="font-display text-sm font-bold uppercase tracking-[0.18em] text-fuchsia-deep">
            Say hello
          </p>
        </div>
        <h1 className="mt-3 text-4xl font-extrabold sm:text-6xl">Get in touch.</h1>
        <p className="mt-5 text-lg text-ink-soft">
          Questions about the market, applying, or visiting? Send us a note and we&apos;ll get back
          to you.
        </p>
      </div>

      <div className="mt-12 grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:items-stretch">
        {/* Form */}
        <div className="flex flex-col rounded-xl bg-white p-6 shadow-[var(--shadow-card)] sm:p-8">
          <ContactForm />
        </div>

        {/* Directions — plain content, not boxed */}
        <div className="space-y-5">
          <div>
            <h2 className="font-display text-sm font-bold uppercase tracking-[0.16em] text-fern-deep">
              Find the market
            </h2>
            <div className="mt-3 flex items-start gap-2.5">
              <MapPinIcon size={24} className="mt-0.5 shrink-0 text-fern-deep" aria-hidden />
              <div>
                <p className="font-display text-xl font-extrabold">{site.location.name}</p>
                <address className="mt-1 not-italic text-ink-soft">
                  {site.location.street}
                  <br />
                  {site.location.city}, {site.location.state}
                </address>
              </div>
            </div>
            <p className="mt-4 text-sm text-ink-soft">
              Held outside at{" "}
              <a
                href={site.host.url}
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-fern-deep underline underline-offset-4"
              >
                {site.host.name}
              </a>
              .
            </p>
            <div className="mt-5">
              <ButtonLink href={mapsHref()} variant="ink" size="md" className="inline-flex items-center gap-1.5">
                Get directions
                <ArrowRightIcon size={16} aria-hidden />
              </ButtonLink>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-ink/10 shadow-[var(--shadow-card)]">
            <iframe
              title={`Map to ${site.location.name}`}
              src={mapEmbed}
              width="100%"
              height="300"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              style={{ border: 0, display: "block" }}
            />
          </div>

          <p className="flex flex-wrap items-center gap-1.5 text-sm text-ink-soft">
            <MailIcon size={16} className="text-fuchsia-deep" aria-hidden />
            Prefer email? <a href={`mailto:${site.contactEmail}`} className="link font-semibold">{site.contactEmail}</a>
          </p>
        </div>
      </div>
    </div>
  );
}
