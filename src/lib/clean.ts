/**
 * Light, non-destructive normalizers for artist-submitted copy — used at
 * display time so messy submissions (all-caps names, bare domains, stray
 * whitespace) read cleanly without mutating what the artist typed.
 */

/** Title-case a name: "may meier" → "May Meier", "MEIER" → "Meier", while
 *  preserving deliberate internal caps ("McCallister", "DeShawn", "JLo"). */
export function cleanName(raw: string | null | undefined): string {
  const s = (raw ?? "").trim().replace(/\s+/g, " ");
  if (!s) return "";
  return s
    .split(" ")
    .map((word) =>
      word
        .split("-")
        .map((part) => {
          if (!part) return part;
          const hasInternalCap = /[A-Z]/.test(part.slice(1));
          const isAllOneCase = part === part.toLowerCase() || part === part.toUpperCase();
          // Keep genuine internal caps (McDonald); title-case everything else.
          if (hasInternalCap && !isAllOneCase) return part;
          return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
        })
        .join("-"),
    )
    .join(" ");
}

/** Normalize a website URL: add https:// if missing, drop trailing slash,
 *  return null if it clearly isn't a URL. */
export function cleanUrl(raw: string | null | undefined): string | null {
  let s = (raw ?? "").trim();
  if (!s) return null;
  if (!/^https?:\/\//i.test(s)) s = "https://" + s.replace(/^\/+/, "");
  try {
    const u = new URL(s);
    if (!u.hostname.includes(".")) return null;
    return u.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

/** A trimmed, lowercased email, or null if it doesn't look like one. */
export function cleanEmail(raw: string | null | undefined): string | null {
  const s = (raw ?? "").trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) ? s : null;
}

/** Host without protocol/www, for displaying a link compactly. */
export function displayUrl(raw: string | null | undefined): string {
  const u = cleanUrl(raw);
  if (!u) return "";
  return u.replace(/^https?:\/\//, "").replace(/^www\./, "");
}

/** Social platforms we render. Anything else is dropped (no arbitrary keys
 *  becoming public labels). `twitter` is normalized to the `x` display. */
export const KNOWN_SOCIAL_KEYS = ["instagram", "facebook", "tiktok", "youtube", "x", "twitter", "etsy"] as const;

/**
 * Keep only known social platforms whose value is a sanitizable URL. Applied on
 * write (artist edits, publish) and again on render, so a `javascript:`/`data:`/
 * garbage value or an unknown platform key can never reach a public page.
 */
export function sanitizeSocials(
  socials: Record<string, string> | null | undefined,
): Record<string, string> {
  const known = new Set<string>(KNOWN_SOCIAL_KEYS);
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(socials ?? {})) {
    const key = k.toLowerCase().trim();
    if (!known.has(key)) continue;
    const url = cleanUrl(v);
    if (url) out[key] = url;
  }
  return out;
}
