/** Shared, pure helpers for batched email/SMS sends (no server-only deps). */

/** Split an array into fixed-size chunks (e.g. Resend's 100-per-batch limit). */
export function chunk<T>(arr: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

/** Fill `{{first_name}}` / `{{name}}` placeholders in a message body. */
export function personalize(body: string, name: string | null): string {
  const first = (name || "").trim().split(/\s+/)[0] || "there";
  return body
    .replace(/\{\{\s*first_name\s*\}\}/gi, first)
    .replace(/\{\{\s*name\s*\}\}/gi, name || "there");
}
