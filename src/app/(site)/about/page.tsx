import type { Metadata } from "next";
import Image from "next/image";
import { site } from "@/lib/site";
import { ButtonLink } from "@/components/ui/button";
import { Flower } from "@/components/brand";
import { FaqAccordion, type FaqItem } from "@/components/faq-accordion";
import { AboutVideo } from "@/components/about-video";

export const metadata: Metadata = {
  title: "About",
  description:
    "For more than 20 years, the Athens Holiday Market has brought together local artists and the people who love their work — two festive evenings in the courtyard at Big City Bread Cafe. Made by artists, for artists.",
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

const KICKER = "font-display text-sm font-bold uppercase tracking-[0.18em] text-fuchsia-deep";

/**
 * The page's one grid unit: a fixed label rail on the left and a flexible
 * content column on the right. Every section uses it, so headings, prose, and
 * the FAQ all share the same two-column structure and left edge. Stacks on
 * small screens.
 */
function Row({ kicker, children }: { kicker: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="grid gap-x-10 gap-y-3 md:grid-cols-[11rem_minmax(0,1fr)]">
      <div className="pt-1.5">{kicker}</div>
      <div>{children}</div>
    </section>
  );
}

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="font-display text-2xl font-extrabold sm:text-3xl">{children}</h2>;
}

/**
 * A full-width photo band. Spans the whole container (breaking out of the label
 * rail) so images punctuate the story at different points down the page rather
 * than sitting together in one block.
 */
function FeaturePhoto({
  src,
  alt,
  priority = false,
}: {
  src: string;
  alt: string;
  priority?: boolean;
}) {
  return (
    <figure className="relative aspect-[16/10] overflow-hidden rounded-2xl shadow-[var(--shadow-lift)] sm:aspect-[2/1]">
      <Image
        src={src}
        alt={alt}
        fill
        priority={priority}
        sizes="(max-width: 896px) 100vw, 896px"
        className="object-cover"
      />
    </figure>
  );
}

const faqs: FaqItem[] = [
  {
    q: "When and where is the market?",
    a: (
      <p>
        Two evenings under the courtyard lights at <Ext href={BCB}>Big City Bread Cafe</Ext> —{" "}
        {site.event.days[0].label} and {site.event.days[1].label}, {site.event.year}, from{" "}
        {site.event.timeLabel} both nights. The cafe is at the corner of Meigs &amp; Finley Streets in
        Athens, GA.
      </p>
    ),
  },
  {
    q: "How do I apply, and when do applications open?",
    a: (
      <p>
        Applications open on Labor Day each year — Monday, September 7 for 2026 — and close on October
        1. It&rsquo;s the same every year, so no one misses it. Space is limited, so we encourage you
        to apply early. You can{" "}
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
            designed and made by you — no mass-produced, imported, or resale items. Some upcycled
            items are welcome.
          </li>
          <li>
            <strong className="font-semibold text-ink">Here in person, start to finish.</strong> You
            sell your own work at your booth and stay for the full market, both evenings. A helper is
            always welcome.
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
        The booth fee is $75, which covers both nights. Once you&rsquo;re accepted, you&rsquo;ll be
        billed by PayPal invoice, and your space is held once the fee is paid.
      </p>
    ),
  },
  {
    q: "Can I share a booth?",
    a: (
      <p>
        Yes. Just let us know on your application that you&rsquo;d like to share. Both artists must
        apply and be accepted to share a booth.
      </p>
    ),
  },
  {
    q: "What's provided, and what should I bring?",
    a: (
      <p>
        This is an outdoor evening market, so plan to set up and light your own booth. Bring your own
        table and lighting. Our trusty electrician and juror Ryan will get power to your booth via
        extension cords, and battery or LED lighting is welcome too. Tents are not permitted.
      </p>
    ),
  },
  {
    q: "When is setup and load-in?",
    a: (
      <p>
        Load-in is the afternoon of {site.event.days[0].label}, and again on {site.event.days[1].label}
        , at 3:00pm. Check in with Jamie to get your parking pass and booth number. Plan to break down
        after 9pm each night and leave your space clean.
      </p>
    ),
  },
  {
    q: "Is there food and drink?",
    a: (
      <p>
        Yes — during the market you can pre-order food and drinks from Big City Bread without standing
        in the long lines. It&rsquo;s delivered straight to your booth, so you&rsquo;re well fed
        through the evening and never miss a sale.
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

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 pb-24 pt-24 sm:px-8 sm:pt-28">
      {/* Hero — the courtyard at its fullest, right up top. */}
      <figure className="relative mb-12 aspect-[4/3] overflow-hidden rounded-2xl shadow-[var(--shadow-lift)] sm:mb-14 sm:aspect-[16/9] lg:aspect-[21/9]">
        <Image
          src="/about/music-1.jpg"
          alt="An overhead view of the tree-lit courtyard packed with shoppers browsing artist booths at dusk"
          fill
          priority
          sizes="(max-width: 896px) 100vw, 896px"
          className="object-cover"
        />
      </figure>

      {/* How it began */}
      <Row
        kicker={
          <div className="flex items-center gap-2">
            <Flower size={20} color="var(--color-fuchsia)" />
            <span className={KICKER}>About</span>
          </div>
        }
      >
        <h1 className="text-4xl font-extrabold leading-[1.05] sm:text-5xl">
          A handmade holiday, more than 20 years in the making.
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-ink-soft">
          For over 20 years, the Athens Holiday Market has been a fixture of the season — bringing
          together a rich community of artists who love their work, all in the courtyard of one of
          the city&rsquo;s most beloved culinary spots, <Ext href={BCB}>Big City Bread Cafe</Ext>.
        </p>
        <p className="mt-4 max-w-2xl text-lg text-ink-soft">
          <Ext href="https://caroljohn.art/">Carol John</Ext> founded the market in 2002 with a
          simple idea: give local artists a warm, well-run place to sell their work during the
          holidays. Carol passed the baton to a small group of artists who had shown at the market
          since the very beginning. The market has grown ever since, but the heart of it
          hasn&rsquo;t changed.
        </p>
        <div className="mt-7">
          <ButtonLink href="/apply" variant="primary" size="lg">
            Apply to sell
          </ButtonLink>
        </div>
      </Row>

      {/* A busy market */}
      <div className="mt-16 sm:mt-20">
        <Row kicker={<span className={KICKER}>A busy market</span>}>
          <H2>Two evenings, one very full courtyard.</H2>
          <p className="mt-4 max-w-2xl text-lg text-ink-soft">
            If you&rsquo;ve been, you know: the courtyard fills up fast and stays busy from the moment
            the lights come on until the last shopper heads home. Neighbors see neighbors, the perfect
            gifts are found, connections are made, and the same faces come back year after year — many
            of them have made the market part of their holidays for a decade or more. For our artists,
            that means a courtyard full of shoppers who came to buy handmade and to support the people
            who make it.
          </p>
        </Row>
      </div>

      {/* Shoppers among the string-lit booths at dusk. */}
      <div className="mt-14 sm:mt-16">
        <FeaturePhoto
          src="/about/market-lights.jpg"
          alt="Shoppers browsing artist booths strung with lights in the Big City Bread courtyard at dusk"
        />
      </div>

      {/* Live music */}
      <div className="mt-16 sm:mt-20">
        <Row kicker={<span className={KICKER}>Live music</span>}>
          <H2>A little music by the fire.</H2>
          <p className="mt-4 max-w-2xl text-lg text-ink-soft">
            Local musicians play around the fire both evenings — guitars, upright bass, a few voices —
            a warm, acoustic soundtrack that turns a shopping trip into a night out. Tap the clip for
            sound.
          </p>
        </Row>
      </div>

      {/* Live-music video — the centerpiece. */}
      <div className="mt-8 sm:mt-10">
        <AboutVideo
          src="/about/live-music.mp4"
          poster="/about/live-music-poster.jpg"
          label="Musicians playing acoustic music around a fire pit at the Athens Holiday Market"
        />
      </div>

      {/* The organizers */}
      <div className="mt-16 sm:mt-20">
        <Row kicker={<span className={KICKER}>The organizers</span>}>
          <H2>Made by artists, for artists.</H2>
          <p className="mt-4 max-w-2xl text-lg text-ink-soft">
            The market is organized and run by working artists — people who have set up at shows for
            years and know exactly what makes a day behind the booth go well. We&rsquo;ve been in your
            shoes, so we do everything we can to make the market comfortable, easy, and worth your
            time. That includes working with the bakery to have your meal pre-ordered and delivered
            right to your booth, so you never miss a sale.
          </p>
        </Row>
      </div>

      {/* Booths glowing at blue hour. */}
      <div className="mt-14 sm:mt-16">
        <FeaturePhoto
          src="/about/music-2.jpg"
          alt="Shoppers browsing glowing artist booths among string-lit trees in the courtyard at blue hour"
        />
      </div>

      {/* Mission */}
      <div className="mt-16 sm:mt-20">
        <Row kicker={<span className={KICKER}>Our mission</span>}>
          <H2>Why we do it.</H2>
          <p className="mt-4 max-w-2xl text-lg text-ink-soft">
            Our mission is to give new and established artists real economic opportunity and a genuine
            sense of community. We keep our booth fees low and don&rsquo;t charge an application fee,
            so new artists can try a show without a big cost up front. We don&rsquo;t make a profit —
            we donate the booth fees to support the arts and art education across the Southeast. Over
            the years, proceeds have supported <Ext href="https://www.nuci.org/">Nuçi&rsquo;s Space</Ext>,{" "}
            <Ext href="https://greenriverpreserve.org/">Green River Preserve</Ext>, the Kenneth Kase
            jewelry and metalwork award, <Ext href="https://sweetolivefarm.org/">Sweet Olive Farm</Ext>
            , and the{" "}
            <Ext href="https://www.lordandstephens.com/obituaries/brian-dixon">
              Brian Dixon Memorial Fund
            </Ext>{" "}
            — more than $50,000 in all.
          </p>
        </Row>
      </div>

      {/* Sunset closer over the courtyard, before the apply CTA. */}
      <div className="mt-14 sm:mt-16">
        <FeaturePhoto
          src="/about/market-sunset.jpg"
          alt="The market courtyard glowing at sunset, shoppers gathered around artist tables and a fire"
        />
      </div>

      {/* Apply CTA band */}
      <section className="mt-16 overflow-hidden rounded-2xl bg-cream-soft px-6 py-14 text-center shadow-[var(--shadow-card)] sm:mt-20 sm:px-12 sm:py-16">
        <Flower size={40} color="var(--color-fuchsia)" className="mx-auto" />
        <h2 className="mt-4 font-display text-3xl font-extrabold sm:text-4xl">
          We&rsquo;d love to see your work.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-lg text-ink-soft">
          Applications open every year on Labor Day, and space is limited. We&rsquo;re lucky to hear
          from exceptional artists across the region, and each year our jury curates the lineup. If
          you make something wonderful, we hope you&rsquo;ll apply.
        </p>
        <div className="mt-7">
          <ButtonLink href="/apply" variant="primary" size="lg">
            Apply to sell
          </ButtonLink>
        </div>
      </section>

      {/* FAQ */}
      <div className="mt-20 sm:mt-24">
        <Row
          kicker={
            <div className="flex items-center gap-2">
              <Flower size={18} color="var(--color-fuchsia)" />
              <span className={KICKER}>Artist FAQ</span>
            </div>
          }
        >
          <H2>Before you apply</H2>
          <p className="mt-3 max-w-2xl text-lg text-ink-soft">
            Everything you need to know before you apply. Still have a question?{" "}
            <a href="/contact" className="link">
              Get in touch
            </a>{" "}
            — we&rsquo;re happy to help.
          </p>
          <div className="mt-8">
            <FaqAccordion items={faqs} />
          </div>
        </Row>
      </div>
    </div>
  );
}
