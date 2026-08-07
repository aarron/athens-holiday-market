import type { Metadata } from "next";
import { site } from "@/lib/site";
import { applicationWindow, applicationGuidelines } from "@/lib/applications";
import { ApplicationForm } from "@/components/application-form";
import { SubscribeForm } from "@/components/subscribe-form";
import { Flower } from "@/components/brand";
import { getSessionUser } from "@/lib/admin-auth";

export const metadata: Metadata = {
  title: "Apply to sell",
  description:
    "Artists can apply for a booth at the Athens Holiday Market. Applications open Monday, September 7, 2026.",
};

// Re-evaluate the application window at request time so it opens on schedule.
export const dynamic = "force-dynamic";

const CHECKLIST = [
  "Your name, email, and mobile number",
  "A website or social link (optional)",
  "The medium of your work",
  "A short description of your work",
  `${site.applications.minPhotos}–${site.applications.maxPhotos} photos of your work (under ${site.applications.maxPhotoMb}MB each)`,
  "Whether you'd like to share a booth",
];

export default async function ApplyPage({
  searchParams,
}: {
  searchParams: Promise<{ preview?: string }>;
}) {
  const { preview } = await searchParams;
  // Staff can preview the live form before it opens with ?preview=1.
  const user = preview ? await getSessionUser() : null;
  const staffPreview = !!preview && (user?.role === "admin" || user?.role === "judge");
  const window = staffPreview ? "open" : applicationWindow();

  return (
    <div className="mx-auto max-w-3xl px-5 pb-16 pt-24 sm:px-8 sm:pb-24 sm:pt-28">
      {staffPreview && (
        <div className="mb-6 rounded-lg border-2 border-dashed border-tangerine/60 bg-tangerine/10 px-4 py-2.5 text-center text-sm font-semibold text-tangerine-deep">
          Staff preview — the public sees the “opens {site.applications.opensLabel}” screen until then.
        </div>
      )}

      {/* Header */}
      <div className="text-center">
        <Flower size={52} color="var(--color-fuchsia)" spin className="mx-auto" />
        <p className="mt-6 font-display text-sm font-bold uppercase tracking-[0.18em] text-fern-deep">
          Vendor applications
        </p>
        <h1 className="mt-3 text-balance text-4xl font-extrabold sm:text-5xl">
          Apply to participate in the {site.name}
        </h1>
      </div>

      {window === "before" && (
        <div className="mt-8">
          <div className="rounded-xl bg-fern-deep px-6 py-7 text-center text-white shadow-[var(--shadow-card)]">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-white/70">
              Applications open
            </p>
            <p className="mt-1 font-display text-2xl font-extrabold sm:text-3xl">
              {site.applications.opensLabel}
            </p>
          </div>

          <p className="mt-8 text-lg text-ink-soft">
            The {site.event.year} {site.name} is curated by a 5-person jury. Applications open on{" "}
            <strong className="text-ink">{site.applications.opensLabel}</strong> and close{" "}
            {site.applications.closesLabel}. Get everything ready now so you can apply the moment it
            opens.
          </p>

          {/* Notify CTA — placed high so folks don't scroll past it */}
          <div className="mt-8 rounded-xl bg-ink p-7 text-paper">
            <h2 className="text-2xl font-extrabold text-white">Get notified when it opens</h2>
            <p className="mt-2 text-paper/70">
              Subscribe and check the artist box — we&apos;ll email you the moment applications go
              live.
            </p>
            <div className="mt-5">
              <SubscribeForm tone="dark" />
            </div>
          </div>

          {/* Guidelines */}
          <h2 className="mt-12 text-2xl font-extrabold">What we&apos;re looking for</h2>
          <ul className="mt-5 space-y-4">
            {applicationGuidelines.map((g) => (
              <li key={g.title} className="flex gap-3">
                <Flower size={22} color="var(--color-fern-deep)" className="mt-0.5 shrink-0" />
                <span>
                  <span className="font-display font-bold">{g.title}. </span>
                  <span className="text-ink-soft">{g.body}</span>
                </span>
              </li>
            ))}
          </ul>

          {/* Checklist */}
          <h2 className="mt-12 text-2xl font-extrabold">What you&apos;ll need</h2>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            {CHECKLIST.map((item) => (
              <li key={item} className="flex items-start gap-2.5 rounded-lg bg-cream-soft px-4 py-3">
                <span className="mt-2 h-2 w-2 shrink-0 rounded-sm bg-fern-deep" />
                <span className="text-ink-soft">{item}</span>
              </li>
            ))}
          </ul>

        </div>
      )}

      {window === "open" && (
        <div className="mt-10">
          <p className="mb-8 text-center text-lg text-ink-soft">
            The deadline to apply is {site.applications.closesLabel}. We can&apos;t wait to see what
            you&apos;ve been making.
          </p>
          <ApplicationForm />
        </div>
      )}

      {window === "closed" && (
        <div className="mt-8 rounded-xl bg-cream-soft p-8 text-center">
          <p className="text-lg text-ink-soft">
            Applications for the {site.event.year} market are now closed. Thank you to everyone who
            applied! Subscribe on the{" "}
            <a href="/" className="font-semibold text-fern-deep underline underline-offset-4">
              home page
            </a>{" "}
            to hear about next year.
          </p>
        </div>
      )}
    </div>
  );
}
