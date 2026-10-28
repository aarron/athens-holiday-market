import { site } from "@/lib/site";
import { ClockIcon, MapPinIcon, ExternalIcon, GiftIcon } from "@/components/icons";

/**
 * The artist hub's event-day section: when and where, booth map, setup and
 * food ordering. Shared by the hub and the admin preview, so what
 * staff review is exactly what artists see. Setup lines live in
 * site.artistInfo and also go out in the setup-details emails.
 */
export function EventDayEssentials() {
  const info = site.artistInfo;
  const sectionTitle = "flex items-center gap-1.5 font-display text-sm font-bold uppercase tracking-[0.14em] text-teal-deep";
  return (
    <div className="rounded-xl bg-white p-5 shadow-[var(--shadow-card)] sm:p-6">
      <h2 className="font-display text-lg font-extrabold">Event-day essentials</h2>

      <div className="mt-4 grid gap-6 sm:grid-cols-2">
        <div>
          <h3 className={sectionTitle}>
            <ClockIcon size={16} aria-hidden /> When &amp; where
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            {site.event.days[0].label} &amp; {site.event.days[1].label}, {site.event.timeLabel}
            <br />
            {site.location.name}
            <br />
            {site.location.street}, {site.location.city}, {site.location.state}
          </p>
        </div>

        <div>
          <h3 className={sectionTitle}>
            <MapPinIcon size={16} aria-hidden /> Your booth
          </h3>
          {info.boothMapUrl ? (
            <a href={info.boothMapUrl} target="_blank" rel="noreferrer" className="mt-2 block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={info.boothMapUrl}
                alt="Booth layout map"
                className="w-full rounded-lg border border-ink/10"
              />
            </a>
          ) : (
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">
              We&apos;ll post the booth layout here as the market gets closer, along with your
              assigned space.
            </p>
          )}
        </div>
      </div>

      <div className="mt-6">
        <h3 className={sectionTitle}>
          <ClockIcon size={16} aria-hidden /> Setup
        </h3>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-ink-soft">
          {info.setup.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </div>

      <div className="mt-6">
        <h3 className={sectionTitle}>
          <GiftIcon size={16} aria-hidden /> Order from Big City Bread
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">{info.menuNote}</p>
        {info.menuUrl ? (
          <a
            href={info.menuUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center gap-1.5 font-semibold link"
          >
            View the event menu
            <ExternalIcon size={14} aria-hidden />
          </a>
        ) : (
          <p className="mt-1 text-sm text-ink-soft/70">Event menu link coming soon.</p>
        )}
      </div>
    </div>
  );
}
