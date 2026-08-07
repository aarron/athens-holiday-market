import type { Metadata } from "next";
import Image from "next/image";
import { site, mapsHref } from "@/lib/site";
import { ButtonLink } from "@/components/ui/button";
import { Flower } from "@/components/brand";
import { MapPinIcon, ClockIcon, ArrowRightIcon, ExternalIcon } from "@/components/icons";

export const metadata: Metadata = {
  title: "Venue",
  description:
    "The Athens Holiday Market is hosted in the courtyard at Big City Bread Cafe — a beloved family-run bakery and cafe in Athens, GA. Grab a coffee or a bite while you shop.",
  alternates: { canonical: "/venue" },
};

export default function VenuePage() {
  const { host } = site;

  return (
    <div className="mx-auto max-w-7xl px-5 pb-16 pt-24 sm:px-8 sm:pb-20 sm:pt-28">
      {/* Hero image */}
      <div className="overflow-hidden rounded-xl shadow-[var(--shadow-lift)]">
        <div className="relative aspect-[16/9] sm:aspect-[21/9]">
          <Image
            src="/venue/big-city-bread-cafe.webp"
            alt="Inside Big City Bread Cafe"
            fill
            priority
            className="object-cover"
            sizes="(max-width: 1280px) 100vw, 1280px"
          />
        </div>
      </div>

      {/* Intro + logo */}
      <div className="mt-10 grid items-center gap-10 lg:mt-14 lg:grid-cols-[1.25fr_1fr] lg:gap-20">
        <div>
          <div className="flex items-center gap-2">
            <Flower size={22} color="var(--color-fuchsia)" />
            <p className="font-display text-sm font-bold uppercase tracking-[0.18em] text-fuchsia">
              The venue
            </p>
          </div>
          <h1 className="mt-3 text-4xl font-extrabold sm:text-6xl">Big City Bread Cafe</h1>
          <p className="mt-5 text-lg text-ink-soft">
            Our market sets up in the courtyard at Big City Bread — a family-run bakery and cafe that
            has been an Athens favorite since {host.since}. Come for the handmade gifts and make an
            evening of it: dinner, drinks, and holiday baked goods are all just steps from the stalls.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <ButtonLink
              href={host.orderUrl}
              variant="primary"
              size="md"
              className="inline-flex items-center gap-1.5"
              target="_blank"
              rel="noreferrer"
            >
              Order online
              <ExternalIcon size={16} aria-hidden />
            </ButtonLink>
            <ButtonLink
              href={host.menuUrl}
              variant="outline"
              size="md"
              className="inline-flex items-center gap-1.5"
              target="_blank"
              rel="noreferrer"
            >
              View menu
              <ExternalIcon size={16} aria-hidden />
            </ButtonLink>
          </div>
        </div>
        <div className="flex justify-center lg:justify-start">
          <Image
            src="/venue/big-city-bread-logo.webp"
            alt="Big City Bread Cafe"
            width={2500}
            height={1000}
            className="h-auto w-full max-w-[360px] mix-blend-multiply"
            priority
          />
        </div>
      </div>

      {/* Divider */}
      <div className="my-10 border-t border-ink/10 lg:my-12" />

      {/* About + Visit — headings top-aligned */}
      <div className="grid gap-10 lg:grid-cols-[1.25fr_1fr] lg:gap-20 lg:items-start">
        {/* Left: about the cafe — plain text, no box */}
        <div>
          <h2 className="font-display text-sm font-bold uppercase tracking-[0.16em] text-fern-deep">
            About the cafe
          </h2>
          <div className="mt-3 space-y-4 text-lg text-ink-soft">
            <p>
              A locally owned, family-run bakery and cafe, Big City Bread has been baking bread and
              feeding Athens for more than 25 years. Everything is made in house — breads, pastries,
              and cakes — with meals built around locally sourced produce, meats, and cheeses.
            </p>
            <p>
              Stop in for breakfast, brunch, or lunch, or a weeknight dinner with beer and wine.
              Coffee lovers are in good hands too, with espresso drinks pulled from locally roasted
              beans. Dine indoors or out on the patio — the same courtyard that fills with makers
              during the market.
            </p>
          </div>
        </div>

        {/* Right: visit info */}
        <div>
          <h2 className="font-display text-sm font-bold uppercase tracking-[0.16em] text-fern-deep">
            Visit
          </h2>

          <div className="mt-4 flex items-start gap-2.5">
            <MapPinIcon size={22} className="mt-0.5 shrink-0 text-fern-deep" aria-hidden />
            <div>
              <p className="font-display text-lg font-extrabold">{host.name}</p>
              <address className="mt-0.5 not-italic text-ink-soft">{host.address}</address>
              <a
                href={host.phoneHref}
                className="mt-1 inline-block font-semibold text-fern-deep underline underline-offset-4"
              >
                {host.phone}
              </a>
            </div>
          </div>

          <div className="mt-5 flex items-start gap-2.5">
            <ClockIcon size={22} className="mt-0.5 shrink-0 text-fern-deep" aria-hidden />
            <div>
              <p className="font-display text-sm font-bold uppercase tracking-wide text-ink-soft">
                Cafe hours
              </p>
              <ul className="mt-1 space-y-0.5 text-ink-soft">
                {host.hours.map((h) => (
                  <li key={h.days}>
                    <span className="font-semibold text-ink">{h.days}:</span> {h.time}
                  </li>
                ))}
              </ul>
              <p className="mt-1 text-xs text-ink-soft/70">
                Cafe hours are separate from market hours — the market runs{" "}
                {site.event.timeLabel} on {site.event.days[0].label} &amp;{" "}
                {site.event.days[1].label}.
              </p>
            </div>
          </div>

          <div className="mt-6">
            <ButtonLink
              href={mapsHref()}
              variant="ink"
              size="md"
              className="inline-flex items-center gap-1.5"
            >
              Get directions
              <ArrowRightIcon size={16} aria-hidden />
            </ButtonLink>
          </div>

          <p className="mt-8 text-xs text-ink-soft/70">
            Big City Bread Cafe is our gracious host — please support them when you visit the market.
          </p>
        </div>
      </div>
    </div>
  );
}
