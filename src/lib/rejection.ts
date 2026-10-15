/**
 * Rejection emails. Unlike acceptances and the waitlist, a rejection should
 * tell the artist *why*, so each email is the shared template with a reason
 * paragraph slotted in at {{reason}} — and any single email can be edited by
 * hand before sending. Pure module: used by the client editor and the server.
 *
 * NOTE: the default copy below is a starting draft for the organizers to
 * edit and approve on the send page; nothing is sent without that review.
 */
import { site } from "@/lib/site";

export type RejectionReason = "competes" | "nonprofit" | "other";

export const REJECTION_REASONS: { id: RejectionReason; label: string; text: string }[] = [
  {
    id: "competes",
    label: "Competes with the bakery",
    text: `The market is hosted by ${site.host.name}, and as their guests we don't include vendors who sell food or baked goods that compete with the bakery's own business. That's the only reason we couldn't offer you a space — it isn't a reflection on your work.`,
  },
  {
    id: "nonprofit",
    label: "Non-profit booth (limited space)",
    text: `Each year we're able to host just two non-profits, at no charge, and this year's two spaces are already filled. We'd be glad to hear from you again next year.`,
  },
  {
    id: "other",
    label: "Other (write your own)",
    text: `[Explain the reason here before sending.]`,
  },
];

export const REJECTION_TEMPLATE = {
  subject: `Your ${site.name} ${site.event.year} application`,
  body: `Hi {{first_name}},

Thank you for applying to the ${site.event.year} ${site.name}. We're not able to offer you a space this year, and we wanted you to know why.

{{reason}}

We really appreciate you taking the time to apply, and we hope to see you at the market as a shopper in December.

— Ansley, Brent, Jamie, Jim, Ryan and (in our hearts) Kenneth`,
};

/** Best guess at the reason from what they applied with; the admin confirms it. */
export function guessRejectionReason(medium: string | null, category: string | null): RejectionReason {
  const t = `${medium ?? ""} ${category ?? ""}`.toLowerCase();
  if (/non-?profit|on-profit|501\s?\(?c|charit|organi[sz]ation|beautification|foundation|volunteer|developmental disabilit/.test(t))
    return "nonprofit";
  if (category === "Food & Drink" || /bak(e|er|ery|ing)|cookie|bread|pastr|cake|cupcake|edible|sweets|candy|confection|granola|\bfood\b/.test(t))
    return "competes";
  return "other";
}

/** The template with one reason paragraph slotted in (names are filled at send time). */
export function composeRejection(templateBody: string, reasonText: string): string {
  return templateBody.replace(/\{\{\s*reason\s*\}\}/gi, reasonText.trim());
}

/** True while the "other" placeholder (or any [bracketed] note) is still in the text. */
export function hasUnfilledPlaceholder(body: string): boolean {
  return /\[[^\]]*(explain|reason|todo)[^\]]*\]/i.test(body);
}
