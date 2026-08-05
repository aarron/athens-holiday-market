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
    "The Athens Holiday Market returns to the Big City Bread courtyard — two festive evenings of handmade gifts from local artists and makers. Shop locally for the holidays.",
  url: "https://athensholidaymarket.com",
  contactEmail: "bcbartcollective@soupstudios.com",
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
  // 2026 placeholders — CONFIRM. Second Thu/Fri of December, evening market.
  event: {
    days: [
      { date: "2026-12-10", label: "Thursday, December 10" },
      { date: "2026-12-11", label: "Friday, December 11" },
    ],
    timeLabel: "5–9pm",
    year: 2026,
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
