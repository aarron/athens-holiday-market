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
    const host = u.hostname;
    if (!host.includes(".")) return null;
    // Reject IP-like hosts (a bare number like "83" parses to 0.0.0.83) and any
    // host without a real alphabetic TLD — these come from stray spreadsheet
    // values (follower counts, etc.), not real sites.
    if (/^[\d.]+$/.test(host)) return null;
    const tld = host.split(".").pop() ?? "";
    if (!/^[a-z]{2,}$/i.test(tld)) return null;
    return u.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

/**
 * A live screenshot of a prospect's website via WordPress mShots (free, no key).
 * Used as a visual fallback when we can't extract real photos from a site, so a
 * reviewer still sees *something* and can click through. Returns null if the
 * website isn't usable.
 */
export function siteScreenshotUrl(website: string | null | undefined, w = 1200): string | null {
  const url = cleanWebsite(website);
  if (!url) return null;
  return `https://s.wordpress.com/mshots/v1/${encodeURIComponent(url)}?w=${w}`;
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

/**
 * Rough driving proximity to Athens, GA — the market is two evenings, so "could
 * they realistically make it?" is a core triage question. Best-effort from
 * region/city/state; labels are approximate on purpose.
 */
export function athensProximity(opts: {
  city?: string | null;
  state?: string | null;
  region?: string | null;
}): { label: string; tone: "local" | "near" | "far" } {
  const r = (opts.region ?? "").toLowerCase();
  const c = (opts.city ?? "").toLowerCase();
  const s = (opts.state ?? "").toUpperCase();
  const has = (...t: string[]) => t.some((x) => r.includes(x) || c.includes(x));

  if (has("athens", "watkinsville", "bogart", "bishop", "winterville")) return { label: "Athens area", tone: "local" };
  if (has("atlanta", "decatur", "marietta", "roswell", "alpharetta", "smyrna")) return { label: "~1½ hr (Atlanta)", tone: "near" };
  if (has("augusta", "aiken", "evans", "martinez")) return { label: "~1½ hr (Augusta)", tone: "near" };
  if (r.includes("north g") || r.includes("ne ga") || has("gainesville", "dahlonega", "commerce", "clarkesville", "ellijay", "jefferson", "braselton", "cornelia")) return { label: "~1½–2 hr (North GA)", tone: "near" };
  if (r.includes("upstate") || has("greenville", "spartanburg", "clemson", "anderson", "greer")) return { label: "~2 hr (Upstate SC)", tone: "near" };
  if (s === "GA") return { label: "Georgia · ~2 hr", tone: "near" };
  if (s === "SC") return { label: "South Carolina · ~2–3 hr", tone: "far" };
  if (s === "NC") return { label: "North Carolina · ~3+ hr", tone: "far" };
  if (s) return { label: `${s} · far`, tone: "far" };
  return { label: "Location unknown", tone: "far" };
}

/** A Google search URL to find an artist's work when we have no site on file. */
export function webSearchUrl(name: string, extra?: string | null): string {
  const q = [name, extra].filter(Boolean).join(" ");
  return `https://www.google.com/search?q=${encodeURIComponent(q)}`;
}

/** Normalize an email to lowercase, or null if it isn't a plausible address. */
export function cleanEmail(raw: string | null | undefined): string | null {
  const s = (raw ?? "").trim().toLowerCase();
  if (!s || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s)) return null;
  return s;
}

// Generic business words that don't distinguish one maker from another.
const NAME_STOPWORDS = new Set([
  "studio", "studios", "the", "and", "co", "company", "llc", "inc", "shop", "shoppe",
  "gallery", "handmade", "made", "works", "workshop", "ceramics", "pottery", "clay",
  "art", "arts", "artist", "designs", "design", "jewelry", "glass", "candle", "candles",
  "soap", "goods", "paper", "press", "prints", "print", "fine", "creations", "shoppe",
]);

/**
 * A loose identity key for near-duplicate detection: lowercased, punctuation and
 * generic business words stripped, remaining tokens sorted. "R. Wood Studio" and
 * "R. Wood Studio Ceramics Studio & Shoppe" both collapse to "r wood". Returns ""
 * if nothing distinctive remains.
 */
export function looseNameKey(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((w) => w && !NAME_STOPWORDS.has(w))
    .sort()
    .join(" ");
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
