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
  repoUrl: "https://github.com/aarron/athens-holiday-market",
  contactEmail: "hello@athensholidaymarket.com",
  social: {
    instagram: "@athensholidaymarket",
    instagramUrl: "https://www.instagram.com/athensholidaymarket",
    facebookUrl: "https://www.facebook.com/athensholidaymarket",
    hashtag: "#AthensHolidayMarket",
  },
  // Event-day essentials shown in the artist hub. Fill in the asset URLs
  // (booth map image, Big City Bread event menu) when they're ready.
  artistInfo: {
    setup: [
      "Load-in is the afternoon of Thursday, December 10, before doors at 5pm — exact window to be confirmed.",
      "Bring your own table, tent weights, and lighting — it's an evening market, so plan to light your booth.",
      "Pack extension cords and gaffer tape; power is limited, so battery/LED lighting is safest.",
      "Break down after 9pm each night and leave your space clean.",
    ],
    boothMapUrl: null as string | null, // e.g. "/artist-info/booth-map.png"
    menuUrl: null as string | null, // Big City Bread event-menu link or PDF
    menuNote:
      "During the market you can order food and drinks from Big City Bread straight to your booth.",
  },
  host: {
    name: "Big City Bread Cafe",
    url: "https://www.bigcitybreadcafe.com/",
    orderUrl: "https://www.toasttab.com/bigcitybreadcafe",
    menuUrl: "https://www.bigcitybreadcafe.com/menus",
    phone: "(706) 353-0029",
    phoneHref: "tel:+17063530029",
    address: "393 North Finley Street, Athens, GA 30601",
    since: 1998,
    hours: [
      { days: "Monday–Friday", time: "8am–8pm" },
      { days: "Saturday–Sunday", time: "8am–2pm (brunch)" },
    ],
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
    minPhotos: 3,
    maxPhotos: 6,
    maxPhotoMb: 10,
    // Booth fee billed to accepted artists via PayPal invoice ($ total, both nights).
    boothFee: 75,
  },
  nav: [
    { href: "/", label: "Home" },
    { href: "/artists", label: "Artists" },
    { href: "/venue", label: "Venue" },
    { href: "/contact", label: "Contact" },
    { href: "/artist", label: "Artist Login" },
  ],
} as const;

export function mapsHref() {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    site.location.mapsQuery,
  )}`;
}
