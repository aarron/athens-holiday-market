import type { Metadata } from "next";
import Image from "next/image";
import { site } from "@/lib/site";
import { ButtonLink } from "@/components/ui/button";
import { Flower } from "@/components/brand";
import { FaqAccordion, type FaqItem } from "@/components/faq-accordion";

export const metadata: Metadata = {
  title: "About",
  description:
    "For more than 25 years, the Athens Holiday Market has brought together local artists and the people who love their work — two festive evenings in the courtyard at Big City Bread Cafe. Made by artists, for artists.",
  alternates: { canonical: "/about" },
};

// Reusable external link in the market's link treatment.
function Ext({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="link">
      {children}
    </a>
  );
}

const BCB = "https://www.bigcitybreadcafe.com/";

const faqs: FaqItem[] = [
  {
    q: "When and where is the market?",
    a: (
      <p>
        Two evenings under the courtyard lights at <Ext href={BCB}>Big City Bread Cafe</Ext> —{" "}
        {site.event.days[0].label} and {site.event.days[1].label}, {site.event.year}, from{" "}
        {site.event.timeLabel} both nights. The courtyard is at the corner of Meigs &amp; Finley
        Streets in Athens, GA.
      </p>
    ),
  },
  {
    q: "How do I apply, and when do applications open?",
    a: (
      <p>
        Applications open on Labor Day each year — Monday, September 7 for 2026 — and close in late
        October. Space is limited, so we encourage you to apply early. You can{" "}
        <a href="/apply" className="link">
          apply right here on the site
        </a>
        .
      </p>
    ),
  },
  {
    q: "What do I need to apply?",
    a: (
      <>
        <p>Have these ready before you start:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Your name, email, and mobile number</li>
          <li>A website or social link (optional)</li>
          <li>The medium of your work</li>
          <li>A short description of your work</li>
          <li>3–6 photos of your work (under 10MB each)</li>
          <li>Whether you&rsquo;d like to share a booth</li>
        </ul>
      </>
    ),
  },
  {
    q: "How are artists selected?",
    a: (
      <>
        <p>
          Every application is reviewed by our jury. We curate for craftsmanship, originality, and a
          good mix of mediums across the market, so shoppers find something wonderful at every booth.
          A few things we look for:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong className="font-semibold text-ink">Handmade and original.</strong> Work must be
            designed and made by you — no mass-produced, imported, or resale items.
          </li>
          <li>
            <strong className="font-semibold text-ink">Here in person, start to finish.</strong> You
            sell your own work at your booth and stay for the full market, both evenings.
          </li>
          <li>
            <strong className="font-semibold text-ink">Your real work.</strong> Photos should
            represent the actual work you&rsquo;ll bring to sell.
          </li>
        </ul>
      </>
    ),
  },
  {
    q: "How much is a booth?",
    a: (
      <p>
        The booth fee is $75, which covers both nights. Accepted artists are billed by PayPal
        invoice, and your space is held once the fee is paid.
      </p>
    ),
  },
  {
    q: "Can I share a booth?",
    a: (
      <p>
        Yes. Just let us know on your application that you&rsquo;d like to share, and we&rsquo;ll take
        it from there.
      </p>
    ),
  },
  {
    q: "What's provided, and what should I bring?",
    a: (
      <p>
        This is an outdoor evening market, so plan to set up and light your own booth. Bring your own
        table and lighting. Power is limited, so battery or LED lighting is safest — pack extension
        cords and gaffer tape if you plan to plug in. Tents are not permitted.
      </p>
    ),
  },
  {
    q: "When is setup and load-in?",
    a: (
      <p>
        Load-in is the afternoon of {site.event.days[0].label}, before doors open at 5pm; we&rsquo;ll
        confirm your exact window closer to the market. Plan to break down after 9pm each night and
        leave your space clean.
      </p>
    ),
  },
  {
    q: "Is there food and drink?",
    a: (
      <p>
        Yes — during the market you can order food and drinks from Big City Bread straight to your
        booth, so you&rsquo;re well fed through the evening.
      </p>
    ),
  },
  {
    q: "What if I'm not accepted this year?",
    a: (
      <p>
        We hear from more wonderful artists than we have room for, so a booth isn&rsquo;t always
        possible. If your work impressed the jury, we may place you on our waitlist and reach out if a
        space opens. Either way, we&rsquo;d love for you to apply again next year.
      </p>
    ),
  },
];

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h2 className="font-display text-2xl font-extrabold sm:text-3xl">{children}</h2>;
}

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-7xl px-5 pb-20 pt-24 sm:px-8 sm:pt-28">
      {/* Intro */}
      <section className="grid items-center gap-10 lg:grid-cols-[1.15fr_1fr] lg:gap-16">
        <div>
          <div className="flex items-center gap-2">
            <Flower size={22} color="var(--color-fuchsia)" />
            <p className="font-display text-sm font-bold uppercase tracking-[0.18em] text-fuchsia-deep">
              About the market
            </p>
          </div>
          <h1 className="mt-3 text-4xl font-extrabold leading-[1.05] sm:text-6xl">
            A handmade holiday, more than 25 years in the making.
          </h1>
          <p className="mt-5 text-lg text-ink-soft">
            For over 25 years, the Athens Holiday Market has been a fixture of the season — bringing
            together a rich community of artists and the people who love their work, all in the
            courtyard of one of the city&rsquo;s most beloved culinary spots,{" "}
            <Ext href={BCB}>Big City Bread Cafe</Ext>.
          </p>
          <div className="mt-7">
            <ButtonLink href="/apply" variant="primary" size="lg">
              Apply to sell
            </ButtonLink>
          </div>
        </div>

        <div className="relative">
          <div className="overflow-hidden rounded-xl shadow-[var(--shadow-lift)]">
            <Image
              src="/about/market-lights.jpg"
              alt="Shoppers browsing artist booths strung with lights in the Big City Bread courtyard at dusk"
              width={1200}
              height={1600}
              priority
              className="h-full w-full object-cover"
              sizes="(max-width: 1024px) 100vw, 45vw"
            />
          </div>
          <Flower
            size={64}
            color="var(--color-fuchsia)"
            className="absolute -left-4 -top-4 hidden drop-shadow-lg sm:block"
          />
        </div>
      </section>

      {/* Origin story */}
      <div className="mx-auto mt-16 max-w-3xl sm:mt-20">
        <div className="space-y-4 text-lg text-ink-soft">
          <p>
            <Ext href="https://caroljohn.art/">Carol John</Ext> founded the market in 2002 with a
            simple idea: give local artists a warm, well-run place to sell their work during the
            holidays. In 2006, Carol passed the baton to Jamie Voivedich, an artist who had shown at
            the market since the very beginning. The market has grown ever since, but the heart of it
            hasn&rsquo;t changed.
          </p>
        </div>
      </div>

      {/* Two evenings + photo */}
      <section className="mt-16 grid items-center gap-10 sm:mt-20 lg:grid-cols-[1fr_1.15fr] lg:gap-16">
        <div className="relative order-last lg:order-first">
          <div className="overflow-hidden rounded-xl shadow-[var(--shadow-lift)]">
            <Image
              src="/about/market-sunset.jpg"
              alt="The market courtyard glowing at sunset, shoppers gathered around artist tables and a fire"
              width={1200}
              height={1600}
              className="h-full w-full object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          </div>
        </div>
        <div>
          <SectionHeading>Two evenings, one very full courtyard.</SectionHeading>
          <p className="mt-4 text-lg text-ink-soft">
            If you&rsquo;ve been, you know: the courtyard fills up fast and stays busy from the moment
            the lights come on until the last shopper heads home. Neighbors run into neighbors, gifts
            get found, and the same faces come back year after year — many of them have made the
            market part of their holidays for a decade or more. For our artists, that means a
            courtyard full of shoppers who came to buy handmade and to support the people who make it.
          </p>
        </div>
      </section>

      {/* Mission blocks */}
      <div className="mx-auto mt-16 max-w-3xl space-y-12 sm:mt-20">
        <div>
          <SectionHeading>Made by artists, for artists.</SectionHeading>
          <p className="mt-4 text-lg text-ink-soft">
            The market is organized and run by working artists — people who have set up at shows for
            years and know exactly what makes a day behind the booth go well. We&rsquo;ve been in your
            shoes, so we do everything we can to make the market comfortable, easy, and worth your
            time.
          </p>
        </div>

        <div>
          <SectionHeading>Why we do it.</SectionHeading>
          <p className="mt-4 text-lg text-ink-soft">
            Our mission is to give local artists real economic opportunity and a genuine sense of
            community, and to support arts and education across the Southeast. Booth fees don&rsquo;t
            just keep the lights on — they give back. Over the years, proceeds have supported{" "}
            <Ext href="https://www.nuci.org/">Nuçi&rsquo;s Space</Ext>,{" "}
            <Ext href="https://greenriverpreserve.org/">Green River Preserve</Ext>, the Kenneth Kase
            jewelry and metalwork award, <Ext href="https://sweetolivefarm.org/">Sweet Olive Farm</Ext>
            , and the{" "}
            <Ext href="https://www.lordandstephens.com/obituaries/brian-dixon">
              Brian Dixon Memorial Fund
            </Ext>
            .
          </p>
        </div>
      </div>

      {/* Apply CTA band */}
      <section className="mt-16 overflow-hidden rounded-2xl bg-cream-soft px-6 py-12 text-center shadow-[var(--shadow-card)] sm:mt-20 sm:px-12 sm:py-16">
        <Flower size={40} color="var(--color-fuchsia)" className="mx-auto" />
        <h2 className="mt-4 font-display text-3xl font-extrabold sm:text-4xl">
          We&rsquo;d love to see your work.
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-ink-soft">
          Applications open every year on Labor Day, and space is limited. We&rsquo;re lucky to hear
          from exceptional artists across the region, and each year a small jury curates the lineup.
          If you make something wonderful, we hope you&rsquo;ll apply.
        </p>
        <div className="mt-7">
          <ButtonLink href="/apply" variant="primary" size="lg">
            Apply to sell
          </ButtonLink>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto mt-20 max-w-3xl sm:mt-24">
        <div className="flex items-center gap-2">
          <Flower size={20} color="var(--color-fuchsia)" />
          <p className="font-display text-sm font-bold uppercase tracking-[0.18em] text-fuchsia-deep">
            Artist FAQ
          </p>
        </div>
        <h2 className="mt-3 text-3xl font-extrabold sm:text-4xl">Before you apply</h2>
        <p className="mt-3 text-lg text-ink-soft">
          Everything you need to know before you apply. Still have a question?{" "}
          <a href="/contact" className="link">
            Get in touch
          </a>{" "}
          — we&rsquo;re happy to help.
        </p>
        <div className="mt-8">
          <FaqAccordion items={faqs} />
        </div>
      </section>
    </div>
  );
}
