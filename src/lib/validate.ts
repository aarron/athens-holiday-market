/**
 * Shared validation + normalization for artist-submitted contact details and
 * links. Used by BOTH the application form (client, for friendly inline
 * errors) and the API/server actions (to store clean, canonical values), so
 * the rules can't drift. Built from what real submissions looked like:
 * bare domains, emails typed into the website field, "N/a", Instagram handles
 * instead of URLs, Facebook page *names*, and phones in five formats.
 */

export type Norm<T> = { ok: true; value: T } | { ok: false; error: string };

/* ------------------------------------------------------------------ phone */

/** US mobile → E.164 (+1XXXXXXXXXX). Accepts 10 digits, or 11 with a leading 1,
 *  in any punctuation. Null when it can't be a US number. */
export function normalizePhone(raw: string | null | undefined): string | null {
  const digits = (raw ?? "").replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}

export function validatePhone(raw: string): Norm<string> {
  const v = normalizePhone(raw);
  return v ? { ok: true, value: v } : { ok: false, error: "Enter a 10-digit US mobile number, like (706) 555-0142." };
}

/** Pretty print an E.164 US number for display: +17065550142 → (706) 555-0142. */
export function formatPhone(e164: string | null | undefined): string {
  const d = (e164 ?? "").replace(/\D/g, "");
  const n = d.length === 11 && d.startsWith("1") ? d.slice(1) : d;
  return n.length === 10 ? `(${n.slice(0, 3)}) ${n.slice(3, 6)}-${n.slice(6)}` : (e164 ?? "");
}

/* ---------------------------------------------------------------- website */

const NOT_A_URL = /^(n\/?a|none|no|null|-|tbd|coming soon|under construction)\b/i;

/**
 * Website → canonical https URL, or null when the field is effectively empty
 * ("N/a", "none", "coming soon"). Returns an error for things that are clearly
 * not a website: an email address, text with spaces, or no domain (.tld).
 */
export function validateWebsite(raw: string | null | undefined): Norm<string | null> {
  let s = (raw ?? "").trim();
  if (!s || NOT_A_URL.test(s)) return { ok: true, value: null };
  if (s.includes("@")) return { ok: false, error: "That looks like an email address — enter your website, or leave this blank." };
  if (/\s/.test(s)) return { ok: false, error: "A web address can't contain spaces — check for typos, or leave this blank." };
  if (!/^https?:\/\//i.test(s)) s = "https://" + s.replace(/^\/+/, "");
  try {
    const u = new URL(s);
    const host = u.hostname.toLowerCase();
    if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(host) || !/\.[a-z]{2,}$/.test(host)) {
      return { ok: false, error: "Enter a full web address like yourshop.com or etsy.com/shop/you, or leave this blank." };
    }
    u.hostname = host;
    return { ok: true, value: u.toString().replace(/\/$/, "") };
  } catch {
    return { ok: false, error: "Enter a full web address like yourshop.com, or leave this blank." };
  }
}

/* ---------------------------------------------------------------- socials */

export type SocialPlatform = "instagram" | "facebook" | "tiktok";

const SOCIAL: Record<SocialPlatform, { hosts: RegExp; handle: RegExp; base: string; hint: string }> = {
  instagram: {
    hosts: /(^|\.)instagram\.com$/i,
    handle: /^[A-Za-z0-9._]{1,30}$/,
    base: "https://instagram.com/",
    hint: "Enter your Instagram handle (like @yourshop) or profile link.",
  },
  tiktok: {
    hosts: /(^|\.)tiktok\.com$/i,
    handle: /^[A-Za-z0-9._]{1,24}$/,
    base: "https://tiktok.com/@",
    hint: "Enter your TikTok handle (like @yourshop) or profile link.",
  },
  facebook: {
    hosts: /(^|\.)(facebook|fb)\.com$/i,
    handle: /^[A-Za-z0-9.]{5,50}$/,
    base: "https://facebook.com/",
    // Page NAMES ("Althea Gallery & Garden") can't be turned into a link.
    hint: "Paste your Facebook page link (facebook.com/yourpage) — a page name alone can't be linked.",
  },
};

/**
 * Social → canonical profile URL, or null when empty. Accepts either a handle
 * ("@shop", "shop") or a URL on the platform's own domain; rejects free text
 * (page names, other sites) with a platform-specific hint.
 */
export function validateSocial(platform: SocialPlatform, raw: string | null | undefined): Norm<string | null> {
  const cfg = SOCIAL[platform];
  const s = (raw ?? "").trim();
  if (!s || NOT_A_URL.test(s)) return { ok: true, value: null };

  // URL form (with or without scheme) — must be on the platform's domain.
  const looksUrl = /^https?:\/\//i.test(s) || /^(www\.)?[a-z0-9-]+\.[a-z]{2,}\//i.test(s) || /\.(com|net|org)\b/i.test(s);
  if (looksUrl) {
    try {
      const u = new URL(/^https?:\/\//i.test(s) ? s : "https://" + s);
      if (!cfg.hosts.test(u.hostname)) return { ok: false, error: cfg.hint };
      u.hostname = u.hostname.toLowerCase().replace(/^www\./, "");
      u.search = ""; u.hash = "";
      return { ok: true, value: u.toString().replace(/\/$/, "") };
    } catch {
      return { ok: false, error: cfg.hint };
    }
  }

  // Handle form.
  const handle = s.replace(/^@/, "");
  if (cfg.handle.test(handle)) return { ok: true, value: cfg.base + handle };
  return { ok: false, error: cfg.hint };
}

/* ------------------------------------------------------------------ email */

export function normalizeEmail(raw: string | null | undefined): string {
  return (raw ?? "").trim().toLowerCase();
}

/* ------------------------------------------------------- email typos */

// Misspellings of the big mail providers. These domains don't host real
// mailboxes, so mail to them bounces: in 2026, "gmial.com" and a ".con"
// address both bounced the application confirmation.
const DOMAIN_TYPOS: Record<string, string> = {
  "gmial.com": "gmail.com", "gmal.com": "gmail.com", "gmai.com": "gmail.com", "gamil.com": "gmail.com",
  "gnail.com": "gmail.com", "gmaill.com": "gmail.com", "gmali.com": "gmail.com", "gmil.com": "gmail.com",
  "gmail.co": "gmail.com", "gmail.cm": "gmail.com", "gmailcom": "gmail.com",
  "yaho.com": "yahoo.com", "yahooo.com": "yahoo.com", "yhoo.com": "yahoo.com", "yaoo.com": "yahoo.com", "yahoo.cm": "yahoo.com",
  "hotmial.com": "hotmail.com", "hotmal.com": "hotmail.com", "hotmai.com": "hotmail.com", "hotmil.com": "hotmail.com", "htomail.com": "hotmail.com",
  "outlok.com": "outlook.com", "outllok.com": "outlook.com", "otlook.com": "outlook.com",
  "iclod.com": "icloud.com", "icoud.com": "icloud.com", "icluod.com": "icloud.com", "iclould.com": "icloud.com",
  "bellsouth.ent": "bellsouth.net", "comcast.ent": "comcast.net",
};

// Endings that aren't real top-level domains but are one keystroke from one.
const TLD_TYPOS: Record<string, string> = {
  con: "com", cmo: "com", ocm: "com", comm: "com", vom: "com", xom: "com", cpm: "com", cim: "com",
  ent: "net", nte: "net", ogr: "org", orgg: "org",
};

/**
 * If an email address looks like a typo of a common one, return the likely
 * intended address ("gakrakow@gmial.com" -> "gakrakow@gmail.com"), else null.
 * Only flags domains that can't be real, so a correct address never trips it.
 */
export function emailTypoSuggestion(raw: string | null | undefined): string | null {
  const email = (raw ?? "").trim().toLowerCase();
  const at = email.lastIndexOf("@");
  if (at < 1) return null;
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  if (DOMAIN_TYPOS[domain]) return `${local}@${DOMAIN_TYPOS[domain]}`;
  const dot = domain.lastIndexOf(".");
  if (dot < 1) return null;
  const tld = domain.slice(dot + 1);
  if (TLD_TYPOS[tld]) {
    const fixed = `${domain.slice(0, dot)}.${TLD_TYPOS[tld]}`;
    return `${local}@${DOMAIN_TYPOS[fixed] ?? fixed}`;
  }
  return null;
}
