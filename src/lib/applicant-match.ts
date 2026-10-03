/**
 * Decide whether a mailing-list subscriber has already applied this cycle.
 *
 * Matching on email alone isn't enough: many artists are on the list under a
 * different address than they applied with (an old address, a business
 * address, or a second sign-up). In 2026 about ten applicants got "apply
 * soon" reminders that way and were understandably confused. So we also match
 * on name — first + last word, which tolerates middle initials ("Andrew E
 * Phillips" vs "Andrew Phillips") and stray punctuation/case.
 *
 * The trade-off is deliberate: a rare false match only means one person
 * misses a reminder, while a miss tells an applicant they haven't applied.
 */

type Person = { email: string; name?: string | null };

function nameKey(name: string | null | undefined): string | null {
  const words = (name ?? "").toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").match(/[a-z]+/g);
  if (!words || words.length < 2) return null; // a single word is too ambiguous to match on
  return `${words[0]} ${words[words.length - 1]}`;
}

export function buildApplicantIndex(applicants: Person[]) {
  const emails = new Set(applicants.map((a) => a.email.trim().toLowerCase()));
  const names = new Set(applicants.map((a) => nameKey(a.name)).filter((k): k is string => !!k));
  return {
    /** How a subscriber matched an applicant, or null if they haven't applied. */
    match(sub: Person): "email" | "name" | null {
      if (emails.has(sub.email.trim().toLowerCase())) return "email";
      const k = nameKey(sub.name);
      return k && names.has(k) ? "name" : null;
    },
  };
}
