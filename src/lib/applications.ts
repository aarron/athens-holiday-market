import { site } from "@/lib/site";

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
    title: "Juried for quality",
    body: "A panel reviews every application. We curate for craftsmanship, originality, and a good mix across mediums.",
  },
  {
    title: "Bring your best",
    body: "Photos should represent the actual work you'll sell at the market. (Full guidelines coming soon.)",
  },
];
