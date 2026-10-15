import { site } from "@/lib/site";
import { formatUsd } from "@/lib/money";

/**
 * Fill the booth-fee placeholders in decision-email copy for one recipient.
 * {{booth_fee}} → "$75", or "$37.50" for an artist sharing a booth.
 * {{shared_booth_note}} → a line naming their booth partner (empty otherwise).
 * Pure, so the admin preview and the real send fill it the same way.
 */
export function fillBoothFee(
  body: string,
  share: { amount: number; partnerName: string | null } | undefined,
): string {
  const full = site.applications.boothFee;
  const amount = share?.amount ?? full;
  const note = share?.partnerName
    ? `You're sharing a booth with **${share.partnerName}**, so you'll each pay half of the ${formatUsd(full)} booth fee. If your booth partner drops out, please contact Jamie Voivedich at jamie@soupstudios.com.`
    : "";
  return body
    .replace(/\{\{\s*booth_fee\s*\}\}/gi, formatUsd(amount))
    .replace(/\{\{\s*shared_booth_note\s*\}\}\n*/gi, note ? `${note}\n\n` : "");
}
