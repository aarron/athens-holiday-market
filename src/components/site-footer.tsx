import Link from "next/link";
import { site, mapsHref } from "@/lib/site";
import { Flower } from "@/components/brand";
import { MotionToggle } from "@/components/motion-toggle";
import { MapPinIcon, MailIcon, ArrowRightIcon, BugFaceIcon, InstagramIcon, FacebookIcon } from "@/components/icons";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t-2 border-ink/10 bg-ink text-paper">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 sm:px-8 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-3">
            <Flower size={36} color="var(--color-fuchsia)" />
            <span className="font-display text-xl font-extrabold tracking-tight">
              Athens Holiday Market
            </span>
          </div>
          <p className="mt-4 max-w-sm text-paper/70">{site.tagline}</p>
          <p className="mt-4 text-sm text-paper/50">
            Hosted at{" "}
            <a href={site.host.url} className="link-invert">
              {site.host.name}
            </a>
            , Athens, Georgia.
          </p>
          <div className="mt-5 flex items-center gap-3">
            <a
              href={site.social.instagramUrl}
              target="_blank"
              rel="noreferrer"
              aria-label="Athens Holiday Market on Instagram"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-paper/20 text-paper/80 transition-colors hover:border-fern hover:text-fern"
            >
              <InstagramIcon size={20} aria-hidden />
            </a>
            <a
              href={site.social.facebookUrl}
              target="_blank"
              rel="noreferrer"
              aria-label="Athens Holiday Market on Facebook"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-paper/20 text-paper/80 transition-colors hover:border-fern hover:text-fern"
            >
              <FacebookIcon size={20} aria-hidden />
            </a>
          </div>
        </div>

        <div>
          <h3 className="font-display text-sm font-bold uppercase tracking-[0.16em] text-paper/50">
            Explore
          </h3>
          <ul className="mt-4 space-y-2.5">
            {site.nav.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="text-paper/80 hover:text-fern">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="font-display text-sm font-bold uppercase tracking-[0.16em] text-paper/50">
            Visit
          </h3>
          <address className="mt-4 flex gap-2.5 not-italic text-paper/80">
            <MapPinIcon size={20} className="mt-0.5 shrink-0 text-fern" aria-hidden />
            <div className="space-y-1">
              <div>{site.location.name}</div>
              <div>{site.location.street}</div>
              <div>
                {site.location.city}, {site.location.state}
              </div>
              <a
                href={mapsHref()}
                className="mt-2 inline-flex items-center gap-1 link-invert"
              >
                Get directions
                <ArrowRightIcon size={15} aria-hidden />
              </a>
            </div>
          </address>
        </div>
      </div>

      <div className="border-t border-paper/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-6 text-sm text-paper/50 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p>
            © {site.event.year} {site.name}. Shop locally for the holidays.
          </p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <a href={`mailto:${site.contactEmail}`} className="link-invert inline-flex items-center gap-1.5">
              <MailIcon size={16} aria-hidden />
              {site.contactEmail}
            </a>
            <Link href="/privacy" className="link-invert">
              Privacy Policy
            </Link>
            <Link href="/sms-opt-in" className="link-invert">
              SMS Terms
            </Link>
            <a
              href={`${site.repoUrl}/issues/new`}
              target="_blank"
              rel="noreferrer"
              className="link-invert inline-flex items-center gap-1.5"
            >
              <BugFaceIcon size={16} aria-hidden />
              Report a bug
            </a>
            <span>
              Built by{" "}
              <a href="http://aarronwalter.com" target="_blank" rel="noreferrer" className="link-invert">
                Aarron Walter
              </a>
            </span>
            <MotionToggle />
          </div>
        </div>
      </div>
    </footer>
  );
}
