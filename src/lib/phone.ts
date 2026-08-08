/**
 * Normalize a loose US phone string to E.164 (+1XXXXXXXXXX), or null if it
 * can't be used. Handles "706-555-0100", "(706) 555 0100", "17065550100", etc.
 *
 * Pure and client-safe (no server-only deps) so the admin Text UI can preview
 * how many "Other" numbers are valid before sending.
 */
export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (trimmed.startsWith("+") && digits.length >= 11 && digits.length <= 15) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}
