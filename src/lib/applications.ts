import { site } from "@/lib/site";

/**
 * Imports of earlier years used "rejected" for anyone not accepted, and back
 * then the market waitlisted rather than rejected. From this year on,
 * "rejected" is a real decision for applicants who don't meet our terms.
 */
export const REJECTIONS_FROM_YEAR = 2026;

/** The status to show for an application, reading legacy "rejected" as waitlisted. */
export function displayStatus(status: string, year: number) {
  return status === "rejected" && year < REJECTIONS_FROM_YEAR ? "waitlisted" : status;
}

export type ApplicationWindow = "before" | "open" | "closed";

/**
 * Where we are relative to the artist-application window.
 * Server-evaluated against the real clock; flips to "open" automatically
 * on the configured opensAt date — no deploy needed.
 */
export function applicationWindow(now: Date = new Date()): ApplicationWindow {
  const opens = new Date(site.applications.opensAt);
  const closes = new Date(site.applications.closesAt);
  if (now < opens) return "before";
  if (now > closes) return "closed";
  return "open";
}

/**
 * Placeholder guidelines — the real accepted-work criteria will be supplied by
 * the organizers. Kept here so the apply page and emails share one source.
 */
export const applicationGuidelines: { title: string; body: string }[] = [
  {
    title: "Handmade & original",
    body: "Work must be designed and made by you. No mass-produced, imported, or resale items.",
  },
  {
    title: "Here in person, start to finish",
    body: "You must be present at your booth to sell your own work, and stay for the full market — no early departures or breaking down early.",
  },
  {
    title: "Juried for quality",
    body: "A panel reviews every application. We curate for craftsmanship, originality, and a good mix across mediums.",
  },
  {
    title: "No food or beverages",
    body: "Our host, Big City Bread Cafe, is a bakery, so we can't accept vendors who would compete with it. That means no food or drink items of any kind — baked goods, candy, tea, coffee, honey, jams, sauces, and the like.",
  },
  {
    title: "Bring your best",
    body: "Photos should represent the actual work you'll sell at the market.",
  },
];
