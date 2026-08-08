/**
 * Pure helpers for the artist-scouting prospect pool. No server-only imports —
 * shared by the import script, the auto-scout agent, and admin actions.
 */

/** Normalize a raw website string to a canonical https URL, or null. */
export function cleanWebsite(raw: string | null | undefined): string | null {
  const s = (raw ?? "").trim();
  if (!s || s.toLowerCase() === "n/a" || s.toLowerCase() === "via website") return null;
  const withProto = /^https?:\/\//i.test(s) ? s : `https://${s}`;
  try {
    const u = new URL(withProto);
    if (!u.hostname.includes(".")) return null;
    return u.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

/** Bare hostname (no www.) for dedup/display, or null. */
export function websiteHost(raw: string | null | undefined): string | null {
  const url = cleanWebsite(raw);
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Normalize an Instagram value to a bare handle (no @), or null. The research
 * data is messy: "IG @foo", "@foo", "instagram.com/foo", stray numbers, blanks.
 */
export function cleanInstagram(raw: string | null | undefined): string | null {
  let s = (raw ?? "").trim();
  if (!s) return null;
  s = s.replace(/^ig[:\s]+/i, "").trim();
  const urlMatch = s.match(/instagram\.com\/([A-Za-z0-9._]+)/i);
  if (urlMatch) s = urlMatch[1];
  s = s.replace(/^@/, "").trim();
  // A real handle is 1–30 chars of letters/digits/._ and not purely numeric
  // (a bare number is almost always a stray follower count, not a handle).
  if (!/^[A-Za-z0-9._]{1,30}$/.test(s)) return null;
  if (/^\d+$/.test(s)) return null;
  return s.toLowerCase();
}

/** Full Instagram profile URL from any raw value, or null. */
export function instagramUrl(raw: string | null | undefined): string | null {
  const handle = cleanInstagram(raw);
  return handle ? `https://instagram.com/${handle}` : null;
}

/**
 * Split a research name into a business headline + maker subtitle. Most rows are
 * "Business Name (Maker Name)"; showing the maker as a subtitle reads cleaner on
 * a card than one long string, and keeps the person's name rather than burying
 * it. Names without a trailing parenthetical return maker: null.
 */
export function splitProspectName(name: string): { business: string; maker: string | null } {
  const m = name.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  if (m && m[1].trim()) return { business: m[1].trim(), maker: m[2].trim() };
  return { business: name.trim(), maker: null };
}

/** Normalize an email to lowercase, or null if it isn't a plausible address. */
export function cleanEmail(raw: string | null | undefined): string | null {
  const s = (raw ?? "").trim().toLowerCase();
  if (!s || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s)) return null;
  return s;
}

/**
 * Stable dedupe key for a prospect within a cycle. Prefer the website host
 * (most reliable identity), falling back to a normalized name. Re-imports and
 * auto-scout runs collapse onto the same key instead of creating twins.
 */
export function prospectDedupeKey(name: string, website?: string | null): string {
  const host = websiteHost(website);
  if (host) return `site:${host}`;
  const n = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  return `name:${n}`;
}
