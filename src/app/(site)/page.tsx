import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { site, mapsHref } from "@/lib/site";
import { Flower, ColorWord } from "@/components/brand";
import { ButtonLink } from "@/components/ui/button";
import { SubscribeForm } from "@/components/subscribe-form";
import { CalendarIcon, ClockIcon, MapPinIcon } from "@/components/icons";
import { CountdownClock } from "@/components/countdown";
import { HeroVideo } from "@/components/hero-video";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const CATEGORIES: { label: string; color: string; img: string; pos?: string }[] = [
  { label: "Pottery", color: "var(--color-teal)", img: "/photos/categories/ceramics.jpg" },
  { label: "Textiles & Fiber", color: "var(--color-fern)", img: "/photos/categories/textiles.jpg" },
  { label: "Jewelry", color: "var(--color-fuchsia)", img: "/photos/categories/jewelry.jpg" },
  { label: "Candles", color: "var(--color-tangerine)", img: "/photos/categories/candles.jpg" },
  { label: "Prints & Paper", color: "var(--color-sky)", img: "/photos/categories/prints.jpg" },
  { label: "Woodwork", color: "var(--color-berry)", img: "/photos/categories/woodwork.jpg" },
  // Portrait photo of hanging bags — bias the crop lower so the bags show, not the straps.
  { label: "Leather & Bags", color: "var(--color-chartreuse)", img: "/photos/categories/leather.jpg", pos: "center 72%" },
  { label: "Tea & Treats", color: "var(--color-poppy)", img: "/photos/categories/treats.jpg" },
];

const MARQUEE = [
  "Handmade",
  "Local Artists",
  "Festive",
  "One of a Kind",
  "Shop Local",
  "Live Holiday Music",
];

export default function HomePage() {
  return (
    <>
      {/* ───────────────────────── Hero ───────────────────────── */}
      <section className="relative isolate flex min-h-[calc(100svh-4.5rem)] items-center overflow-hidden">
        <HeroVideo />
        {/* warm scrim for legibility */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-ink/70 via-ink/45 to-ink/80" />

        <div className="mx-auto w-full max-w-7xl px-5 py-20 sm:px-8">
          <div className="ahm-rise max-w-3xl">
            <h1 className="font-display text-[clamp(2.75rem,8vw,6rem)] font-extrabold leading-[0.95] tracking-tight text-white">
              Athens <ColorWord /> Market
            </h1>

            <p className="mt-5 max-w-xl text-lg text-white/85 sm:text-xl">
              Two festive evenings of handmade art and gifts from local and regional artists under
              the twinkling courtyard lights at the {site.host.name}.
            </p>

            {/* Event quick-facts (plain divs — an icon+label+value layout isn't a
                valid <dl> grouping, and list semantics aren't needed here) */}
            <div className="mt-8 flex flex-wrap gap-x-8 gap-y-4">
              <div className="flex items-start gap-2.5">
                <CalendarIcon size={22} className="mt-0.5 shrink-0 text-chartreuse" aria-hidden />
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-white/80">When</div>
                  <div className="mt-1 font-display text-lg font-bold text-white">
                    Dec {new Date(site.event.days[0].date + "T00:00").getDate()}–
                    {new Date(site.event.days[1].date + "T00:00").getDate()}, {site.event.year}
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <ClockIcon size={22} className="mt-0.5 shrink-0 text-chartreuse" aria-hidden />
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-white/80">Time</div>
                  <div className="mt-1 font-display text-lg font-bold text-white">{site.event.timeLabel}</div>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <MapPinIcon size={22} className="mt-0.5 shrink-0 text-chartreuse" aria-hidden />
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-white/80">Where</div>
                  <div className="mt-1 font-display text-lg font-bold text-white">{site.location.name}</div>
                </div>
              </div>
            </div>

            <div className="mt-9 flex flex-wrap gap-3">
              <ButtonLink href="/artists" size="lg">
                Meet the artists
              </ButtonLink>
              <ButtonLink href="/apply" size="lg" variant="outline" className="border-white text-white hover:!bg-white hover:!text-ink">
                Apply to sell
              </ButtonLink>
            </div>
          </div>
        </div>

        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 text-white/80">
          <span className="text-xs uppercase tracking-[0.2em]">Scroll</span>
        </div>
      </section>

      {/* ─────────────────────── Marquee band ─────────────────────── */}
      <div aria-hidden="true" className="ahm-marquee-group overflow-hidden bg-fern py-3.5">
        {/* Two identical groups, each wide enough to exceed any viewport, so
            translateX(-50%) loops seamlessly with no blank gap. */}
        <div className="ahm-marquee flex w-max whitespace-nowrap">
          {[0, 1].map((dup) => (
            <div key={dup} className="flex shrink-0 items-center" aria-hidden={dup === 1}>
              {[...MARQUEE, ...MARQUEE, ...MARQUEE].map((word, i) => (
                <span key={`${word}-${i}`} className="flex items-center">
                  <span className="px-6 font-display text-lg font-bold uppercase tracking-wide text-ink">
                    {word}
                  </span>
                  <Flower size={20} color="var(--color-ink)" />
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ──────────────── Countdown + signup (one box) ──────────────── */}
      <section className="bg-white">
        <div className="mx-auto max-w-3xl px-5 py-12 text-center sm:px-8 sm:py-14">
          <div>
            <div className="flex items-center justify-center gap-2">
              <ClockIcon size={18} className="text-fuchsia-deep" aria-hidden />
              <p className="font-display text-sm font-bold uppercase tracking-[0.18em] text-fuchsia-deep">
                The countdown is on
              </p>
            </div>
            <h2 className="mt-3 text-3xl font-extrabold sm:text-4xl">Athens Holiday Market opens in…</h2>
            <div className="mt-8">
              <CountdownClock />
            </div>

            <div className="my-8 border-t border-ink/10" />

            <h3 className="font-display text-2xl font-extrabold sm:text-3xl">Send me a reminder email</h3>
            <p className="mx-auto mt-1.5 max-w-md text-ink-soft">
              We&apos;ll send the artist lineup and a reminder before the market — no spam, just
              holiday cheer.
            </p>
            <div className="mt-5 flex justify-center">
              <SubscribeForm />
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────── Save the date ─────────────────────── */}
      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-28">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.1fr] lg:items-center">
          <div>
            <p className="font-display text-sm font-bold uppercase tracking-[0.18em] text-fern-deep">
              Save the date
            </p>
            <h2 className="mt-3 text-4xl font-extrabold sm:text-5xl">
              Two evenings of holiday cheer.
            </h2>
            <p className="mt-5 max-w-md text-lg text-ink-soft">
              Bring your gift-giving shopping list and meet your friends for some holiday cheer. Have
              a nice dinner, then sip something warm from {site.host.name} while you wander through
              all the handmade wonders. Find the perfect something special, made by hand and made
              with heart.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3">
              <ButtonLink href={mapsHref()} variant="ink" size="lg">
                Get directions
              </ButtonLink>
              <Link href="/contact" className="link font-display text-lg font-semibold">
                Questions? Contact us
              </Link>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {site.event.days.map((day, i) => {
              const d = new Date(day.date + "T00:00");
              // AA-safe accents: white text on the month band + the big number
              // on white both need sufficient contrast (fern-deep/berry pass).
              const colors = ["var(--color-fern-deep)", "var(--color-berry)"];
              return (
                <div
                  key={day.date}
                  className="overflow-hidden rounded-xl bg-white shadow-[var(--shadow-card)] ring-1 ring-ink/5"
                >
                  {/* Month header — the "page" band, with two binding holes */}
                  <div
                    className="relative flex items-center justify-center py-3"
                    style={{ backgroundColor: colors[i] }}
                  >
                    <span className="absolute left-[30%] top-1.5 h-2.5 w-2.5 rounded-full bg-cream/90 shadow-inner" />
                    <span className="absolute right-[30%] top-1.5 h-2.5 w-2.5 rounded-full bg-cream/90 shadow-inner" />
                    <span className="font-display text-sm font-bold uppercase tracking-[0.2em] text-white">
                      {d.toLocaleDateString("en-US", { month: "long" })} {site.event.year}
                    </span>
                  </div>
                  {/* Page body */}
                  <div className="px-6 pb-6 pt-5 text-center">
                    <div
                      className="font-display text-7xl font-extrabold leading-none"
                      style={{ color: colors[i] }}
                    >
                      {d.getDate()}
                    </div>
                    <div className="mt-2 font-display text-lg font-bold">
                      {d.toLocaleDateString("en-US", { weekday: "long" })}
                    </div>
                    <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-cream px-3 py-1 text-sm font-semibold">
                      <ClockIcon size={15} style={{ color: colors[i] }} aria-hidden />
                      {site.event.timeLabel}
                    </div>
                  </div>
                </div>
              );
            })}
            <div className="rounded-lg bg-white p-6 shadow-[var(--shadow-card)] sm:col-span-2">
              <div className="flex items-start gap-3">
                <MapPinIcon size={26} className="mt-0.5 shrink-0 text-tangerine-deep" aria-hidden />
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
            <div className="overflow-hidden rounded-lg shadow-[var(--shadow-lift)]">
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
            <p className="font-display text-sm font-bold uppercase tracking-[0.18em] text-teal-deep">
              A courtyard full of artists
            </p>
            <h2 className="mt-3 text-4xl font-extrabold sm:text-5xl">
              A little market with a lot of heart.
            </h2>
            <p className="mt-5 text-lg text-ink-soft">
              For over 20 years, the Athens Holiday Market has turned the {site.host.name} courtyard
              into a glowing pop-up of local art — pottery and candles, textiles and prints, jewelry
              and jam, cutting boards and wreaths.
            </p>
            <p className="mt-4 text-lg text-ink-soft">
              It&apos;s the best kind of holiday shopping: no big-box bustle, no shipping delays —
              just quality work made by local folks you know and trust, a warm meal, a glass of
              holiday cheer, live music, and the whole thing lit up for the season.
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
            A carefully curated mix of local artists. Here&apos;s a taste of what fills our little
            market — the full artist lineup will be updated closer to the event.
          </p>
        </div>

        <ul className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {CATEGORIES.map((cat) => (
            <li key={cat.label}>
              <Link
                href="/artists"
                className="group relative flex aspect-4/3 flex-col justify-end overflow-hidden rounded-lg p-4 shadow-[var(--shadow-card)] transition-transform duration-200 hover:-translate-y-1"
              >
                <Image
                  src={cat.img}
                  alt={`${cat.label} — handmade at the Athens Holiday Market`}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  style={cat.pos ? { objectPosition: cat.pos } : undefined}
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
                <div className="relative flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-sm"
                    style={{ backgroundColor: cat.color }}
                  />
                  <span className="font-display text-lg font-bold leading-tight text-white drop-shadow">
                    {cat.label}
                  </span>
                </div>
              </Link>
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
              Dates, our artists, and market news — straight to your inbox. Artists can opt in to
              hear when applications open.
            </p>
          </div>
          <div className="lg:justify-self-end">
            <SubscribeForm tone="dark" />
          </div>
        </div>
      </section>

      {/* ─────────────────────── Apply CTA ─────────────────────── */}
      <section className="bg-fern-deep">
        <div className="mx-auto flex max-w-7xl flex-col items-start gap-6 px-5 py-16 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
              Do you make something wonderful? Come sell it with us.
            </h2>
            <p className="mt-2 text-lg text-white/95">
              Applications for {site.event.year} open on Labor Day. Applicants are curated by a
              5-person jury.
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
