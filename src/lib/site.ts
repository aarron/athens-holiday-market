/**
 * Central site configuration. Event details are placeholders drawn from the
 * 2023/2024 print piece (two December evenings, 5–9pm, Big City Bread Courtyard)
 * — confirm the 2026 dates before launch.
 */
export const site = {
  name: "Athens Holiday Market",
  shortName: "AHM",
  tagline: "A handmade holiday, in the heart of Athens.",
  description:
    "The Athens Holiday Market returns to the Big City Bread courtyard — two festive evenings of handmade gifts from local artists. Shop locally for the holidays.",
  url: "https://athensholidaymarket.com",
  contactEmail: "hello@athensholidaymarket.com",
  host: {
    name: "Big City Bread Cafe",
    url: "https://www.bigcitybreadcafe.com/",
  },
  location: {
    name: "Big City Bread Courtyard",
    street: "Corner of Meigs & Finley Streets",
    city: "Athens",
    state: "GA",
    mapsQuery: "Big City Bread Cafe, Meigs St & Finley St, Athens, GA 30601",
  },
  // Confirmed 2026 dates: Thursday & Friday, December 10–11, evening market.
  event: {
    days: [
      { date: "2026-12-10", label: "Thursday, December 10" },
      { date: "2026-12-11", label: "Friday, December 11" },
    ],
    timeLabel: "5–9pm",
    year: 2026,
  },
  // Artist application window. Opens the day after Labor Day; closes late October.
  applications: {
    opensAt: "2026-09-07T00:00:00-04:00",
    opensLabel: "Monday, September 7, 2026",
    closesAt: "2026-10-26T23:59:59-04:00",
    closesLabel: "October 26, 2026",
    decisionLabel: "a date to be announced",
    maxPhotos: 3,
    maxPhotoMb: 10,
  },
  nav: [
    { href: "/", label: "Home" },
    { href: "/artists", label: "Artists" },
    { href: "/apply", label: "Apply" },
    { href: "/contact", label: "Contact" },
  ],
} as const;

export function mapsHref() {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    site.location.mapsQuery,
  )}`;
}
