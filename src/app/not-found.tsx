import type { Metadata } from "next";
import { Flower } from "@/components/brand";
import { ButtonLink } from "@/components/ui/button";
import { NotFoundLogger } from "@/components/not-found-logger";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Page not found", robots: { index: false } };

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-paper px-5 text-center">
      <NotFoundLogger />
      <Flower size={72} color="var(--color-fuchsia)" spin />
      <p className="mt-8 font-display text-sm font-bold uppercase tracking-[0.18em] text-fuchsia">
        Page not found
      </p>
      <h1 className="mt-3 text-4xl font-extrabold sm:text-5xl">This one wandered off</h1>
      <p className="mx-auto mt-4 max-w-md text-lg text-ink-soft">
        We couldn&apos;t find that page. It may have moved, or the link might be out of date. Let&apos;s
        get you back to the {site.name}.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <ButtonLink href="/" variant="ink" size="lg">
          Back home
        </ButtonLink>
        <ButtonLink href="/artists" variant="ghost" size="lg">
          Meet the artists
        </ButtonLink>
      </div>
    </div>
  );
}
