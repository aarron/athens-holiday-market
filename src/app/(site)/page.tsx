import Image from "next/image";
import type { Metadata } from "next";
import { site, mapsHref } from "@/lib/site";
import { Flower, ColorWord } from "@/components/brand";
import { ButtonLink } from "@/components/ui/button";
import { SubscribeForm } from "@/components/subscribe-form";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const CATEGORIES = [
  { label: "Ceramics", color: "var(--color-teal)" },
  { label: "Textiles & Fiber", color: "var(--color-fern)" },
  { label: "Jewelry", color: "var(--color-fuchsia)" },
  { label: "Candles & Apothecary", color: "var(--color-tangerine)" },
  { label: "Prints & Paper", color: "var(--color-sky)" },
  { label: "Woodwork", color: "var(--color-berry)" },
  { label: "Leather & Bags", color: "var(--color-chartreuse)" },
  { label: "Tea & Treats", color: "var(--color-poppy)" },
];

const MARQUEE = [
  "Handmade",
  "Local Makers",
  "Festive",
  "One of a Kind",
  "Shop Local",
  "Under the Lights",
];

export default function HomePage() {
  return (
    <>
      {/* ───────────────────────── Hero ───────────────────────── */}
      <section className="relative isolate flex min-h-[calc(100svh-4.5rem)] items-center overflow-hidden">
        <video
          className="absolute inset-0 -z-20 h-full w-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          poster="/video/hero-poster.jpg"
        >
          <source src="/video/hero.mp4" type="video/mp4" />
        </video>
        {/* warm scrim for legibility */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-ink/70 via-ink/45 to-ink/80" />

        <div className="mx-auto w-full max-w-7xl px-5 py-20 sm:px-8">
          <div className="ahm-rise max-w-3xl">
            <h1 className="font-display text-[clamp(2.75rem,8vw,6rem)] font-extrabold leading-[0.95] tracking-tight text-white">
              Athens <ColorWord /> Market
            </h1>

            <p className="mt-5 max-w-xl text-lg text-white/85 sm:text-xl">
              Two festive evenings of handmade gifts from local artists and makers, in the
              twinkling courtyard at {site.host.name}. {site.tagline}
            </p>

            {/* Event quick-facts */}
            <dl className="mt-8 flex flex-wrap gap-x-8 gap-y-4">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-white/60">
                  When
                </dt>
                <dd className="mt-1 font-display text-lg font-bold text-white">
                  Dec {new Date(site.event.days[0].date + "T00:00").getDate()}–
                  {new Date(site.event.days[1].date + "T00:00").getDate()}, {site.event.year}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-white/60">
                  Time
                </dt>
                <dd className="mt-1 font-display text-lg font-bold text-white">
                  {site.event.timeLabel}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-white/60">
                  Where
                </dt>
                <dd className="mt-1 font-display text-lg font-bold text-white">
                  {site.location.name}
                </dd>
              </div>
            </dl>

            <div className="mt-9 flex flex-wrap gap-3">
              <ButtonLink href="/artists" size="lg">
                Meet the artists
              </ButtonLink>
              <ButtonLink href="/apply" size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-ink">
                Apply to sell
              </ButtonLink>
            </div>
          </div>
        </div>

        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 text-white/60">
          <span className="text-xs uppercase tracking-[0.2em]">Scroll</span>
        </div>
      </section>

      {/* ─────────────────────── Marquee band ─────────────────────── */}
      <div className="ahm-marquee-group overflow-hidden border-y-4 border-ink bg-fuchsia py-3.5">
        <div className="ahm-marquee flex w-max whitespace-nowrap">
          {[0, 1].map((dup) => (
            <div key={dup} className="flex items-center" aria-hidden={dup === 1}>
              {MARQUEE.map((word) => (
                <span key={word} className="flex items-center">
                  <span className="px-6 font-display text-lg font-bold uppercase tracking-wide text-white">
                    {word}
                  </span>
                  <Flower size={20} color="var(--color-white)" />
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ─────────────────────── Save the date ─────────────────────── */}
      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-28">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.1fr] lg:items-center">
          <div>
            <p className="font-display text-sm font-bold uppercase tracking-[0.18em] text-fuchsia">
              Save the date
            </p>
            <h2 className="mt-3 text-4xl font-extrabold sm:text-5xl">
              Two evenings under the courtyard lights.
            </h2>
            <p className="mt-5 max-w-md text-lg text-ink-soft">
              Bring your list and your friends. Sip something warm from {site.host.name}, wander
              the stalls, and find something made by hand and made with heart.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <ButtonLink href={mapsHref()} variant="ink" size="lg">
                Get directions
              </ButtonLink>
              <ButtonLink href="/contact" variant="ghost" size="lg">
                Questions? Contact us
              </ButtonLink>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {site.event.days.map((day, i) => {
              const d = new Date(day.date + "T00:00");
              const colors = ["var(--color-teal)", "var(--color-berry)"];
              return (
                <div
                  key={day.date}
                  className="rounded-lg border-2 border-ink bg-white p-6 shadow-[var(--shadow-card)]"
                >
                  <div
                    className="font-display text-6xl font-extrabold leading-none"
                    style={{ color: colors[i] }}
                  >
                    {d.getDate()}
                  </div>
                  <div className="mt-2 font-display text-lg font-bold">
                    {d.toLocaleDateString("en-US", { weekday: "long" })}
                  </div>
                  <div className="text-ink-soft">
                    {d.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                  </div>
                  <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-cream px-3 py-1 text-sm font-semibold">
                    <Flower size={14} color={colors[i]} /> {site.event.timeLabel}
                  </div>
                </div>
              );
            })}
            <div className="rounded-lg border-2 border-dashed border-ink/30 p-6 sm:col-span-2">
              <div className="flex items-start gap-3">
                <Flower size={28} color="var(--color-tangerine)" />
                <div>
                  <div className="font-display text-lg font-bold">{site.location.name}</div>
                  <div className="text-ink-soft">
                    {site.location.street} · {site.location.city}, {site.location.state}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────── About / photo ─────────────────────── */}
      <section className="bg-cream-soft">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-20 sm:px-8 lg:grid-cols-2 lg:items-center lg:py-28">
          <div className="relative">
            <div className="overflow-hidden rounded-lg border-2 border-ink shadow-[var(--shadow-lift)]">
              <Image
                src="/photos/market-courtyard.jpg"
                alt="Shoppers browsing handmade goods in the Big City Bread courtyard at the Athens Holiday Market"
                width={1600}
                height={1200}
                className="h-full w-full object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>
            <Flower
              size={72}
              color="var(--color-fuchsia)"
              className="absolute -right-5 -top-5 hidden drop-shadow-lg sm:block"
              spin
            />
          </div>

          <div>
            <p className="font-display text-sm font-bold uppercase tracking-[0.18em] text-teal">
              A courtyard full of makers
            </p>
            <h2 className="mt-3 text-4xl font-extrabold sm:text-5xl">
              A little market with a lot of heart.
            </h2>
            <p className="mt-5 text-lg text-ink-soft">
              For years, the Athens Holiday Market has turned the {site.host.name} courtyard into a
              glowing pop-up of local craft — ceramics and candles, textiles and prints, jewelry and
              jam. Every booth is a neighbor, and every gift has a story.
            </p>
            <p className="mt-4 text-lg text-ink-soft">
              It&apos;s the best kind of holiday shopping: no big-box, no shipping delays — just
              good makers, warm bread, and the whole thing lit up for the season.
            </p>
          </div>
        </div>
      </section>

      {/* ─────────────────────── What you'll find ─────────────────────── */}
      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-28">
        <div className="max-w-2xl">
          <p className="font-display text-sm font-bold uppercase tracking-[0.18em] text-berry">
            What you&apos;ll find
          </p>
          <h2 className="mt-3 text-4xl font-extrabold sm:text-5xl">
            Handmade, across every aisle.
          </h2>
          <p className="mt-5 text-lg text-ink-soft">
            A juried mix of local artists and makers. Here&apos;s a taste of what fills the stalls —
            the full lineup drops closer to the event.
          </p>
        </div>

        <ul className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {CATEGORIES.map((cat) => (
            <li key={cat.label}>
              <div
                className="group flex aspect-4/3 flex-col justify-between rounded-lg border-2 border-ink p-5 transition-transform duration-200 hover:-translate-y-1"
                style={{ backgroundColor: cat.color }}
              >
                <Flower size={26} color="rgba(255,255,255,0.9)" />
                <span className="font-display text-lg font-bold leading-tight text-white">
                  {cat.label}
                </span>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-10">
          <ButtonLink href="/artists" size="lg" variant="ink">
            See all the artists
          </ButtonLink>
        </div>
      </section>

      {/* ─────────────────────── Subscribe band ─────────────────────── */}
      <section className="bg-ink text-paper">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-20 sm:px-8 lg:grid-cols-[1fr_1fr] lg:items-center lg:py-24">
          <div>
            <div className="flex items-center gap-3">
              <Flower size={36} color="var(--color-chartreuse)" />
              <p className="font-display text-sm font-bold uppercase tracking-[0.18em] text-chartreuse">
                Stay in the loop
              </p>
            </div>
            <h2 className="mt-4 text-4xl font-extrabold text-white sm:text-5xl">
              Be the first to know.
            </h2>
            <p className="mt-4 max-w-md text-lg text-paper/70">
              Dates, the artist lineup, and market news — straight to your inbox. Makers can opt in
              to hear when applications open.
            </p>
          </div>
          <div className="lg:justify-self-end">
            <SubscribeForm tone="dark" />
          </div>
        </div>
      </section>

      {/* ─────────────────────── Apply CTA ─────────────────────── */}
      <section className="border-t-4 border-ink bg-fuchsia">
        <div className="mx-auto flex max-w-7xl flex-col items-start gap-6 px-5 py-16 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
              Make something wonderful? Come sell it with us.
            </h2>
            <p className="mt-2 text-lg text-white/85">
              Applications for {site.event.year} open on Labor Day. Booths are juried and fill fast.
            </p>
          </div>
          <ButtonLink href="/apply" size="lg" variant="ink" className="shrink-0">
            Apply to be a vendor
          </ButtonLink>
        </div>
      </section>
    </>
  );
}
