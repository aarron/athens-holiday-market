/**
 * Best-effort image extraction from an artist's website. Used to enrich
 * auto-scouted prospects with real photos WITHOUT trusting an LLM to produce
 * image URLs (which it will hallucinate). We fetch the page and pull the
 * og:image plus a few in-page images, then hand them to the Blob cache.
 */

const FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
  Accept: "text/html,application/xhtml+xml",
};

// Skip obvious non-artwork assets.
const JUNK = /(logo|icon|sprite|favicon|avatar|badge|payment|placeholder|spacer|1x1|pixel)/i;

function absolutize(src: string, base: string): string | null {
  try {
    const u = new URL(src, base);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.toString();
  } catch {
    return null;
  }
}

/** Return up to `max` candidate image URLs from a site's home page. */
export async function extractSiteImages(pageUrl: string, max = 4): Promise<string[]> {
  let html: string;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 9000);
    const res = await fetch(pageUrl, { headers: FETCH_HEADERS, redirect: "follow", signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) return [];
    if (!(res.headers.get("content-type") ?? "").includes("text/html")) return [];
    html = (await res.text()).slice(0, 600_000);
  } catch {
    return [];
  }

  const base = pageUrl;
  const found: string[] = [];
  const seen = new Set<string>();
  // Known image CDNs / query hints where the URL often has no file extension.
  const IMG_HINT =
    /(squarespace-cdn|shopify|\/cdn\/|etsystatic|wixstatic|cloudfront|imgix|format=|\/image|w=\d)/i;
  const add = (raw: string | null | undefined, trusted = false) => {
    if (!raw) return;
    const abs = absolutize(raw.trim(), base);
    if (!abs || JUNK.test(abs)) return;
    // Trusted sources (og:image/twitter:image) are hero images — accept even
    // without a file extension. In-page <img> needs a real extension or a
    // recognizable image-CDN URL, so we don't pick up tracking pixels/SVGs.
    const looksImage = /\.(jpe?g|png|webp|avif)(\?|$)/i.test(abs) || IMG_HINT.test(abs);
    if (!trusted && !looksImage) return;
    if (trusted && /\.svg(\?|$)/i.test(abs)) return;
    const key = abs.split("?")[0];
    if (seen.has(key)) return;
    seen.add(key);
    found.push(abs);
  };

  // Prefer social-share images first — usually the best hero shot.
  for (const m of html.matchAll(/<meta[^>]+(?:property|name)=["'](?:og:image|twitter:image)(?::src)?["'][^>]*>/gi)) {
    const c = m[0].match(/content=["']([^"']+)["']/i);
    if (c) add(c[1], true);
  }
  // Then in-page images (src and the largest srcset entry).
  for (const m of html.matchAll(/<img\b[^>]*>/gi)) {
    if (found.length >= max * 3) break;
    const tag = m[0];
    const src = tag.match(/\bsrc=["']([^"']+)["']/i)?.[1] ?? tag.match(/\bdata-src=["']([^"']+)["']/i)?.[1];
    add(src);
    const srcset = (tag.match(/\bsrcset=["']([^"']+)["']/i) ?? tag.match(/\bdata-srcset=["']([^"']+)["']/i))?.[1];
    if (srcset) {
      const last = srcset.split(",").pop()?.trim().split(/\s+/)[0];
      add(last);
    }
  }

  return found.slice(0, max);
}
