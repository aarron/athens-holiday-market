/**
 * Canonical medium categories for the Athens Holiday Market.
 * Used to normalize free-text application mediums so judges can see the
 * blend of work, and as the category picker on the application form.
 */
export const MEDIUM_CATEGORIES = [
  "Ceramics & Pottery",
  "Jewelry",
  "Textiles & Fiber",
  "Leather",
  "Painting & Drawing",
  "Printmaking & Paper",
  "Woodwork",
  "Glass",
  "Metalwork",
  "Candles & Apothecary",
  "Bath & Body",
  "Food & Drink",
  "Mixed Media & Sculpture",
  "Other",
] as const;

export type MediumCategory = (typeof MEDIUM_CATEGORIES)[number];

// Keyword → category, checked in order (most specific first).
const RULES: [RegExp, MediumCategory][] = [
  [/ceramic|pottery|clay|stoneware|porcelain|mosaic|cone \d/i, "Ceramics & Pottery"],
  [/jewel|earring|necklace|bracelet|ring\b|gold.?filled|brass jewelry/i, "Jewelry"],
  [/stained glass|blown glass|glass\b/i, "Glass"],
  [/leather/i, "Leather"],
  [/candle|diffuser|apothecary|salt soak|essential oil|incense|elixir? spray/i, "Candles & Apothecary"],
  [/soap|shea butter|sea moss|cbd|balm|lotion|bath|body care|shampoo/i, "Bath & Body"],
  [/tea|treat|jam|honey|baked|food|chocolate|elixir|spice|herb|drink|dog treat/i, "Food & Drink"],
  [/print|block.?print|screen.?print|risograph|paper|puzzle|card|zine/i, "Printmaking & Paper"],
  [/wood|woodcarv|woodwork|carv/i, "Woodwork"],
  [/metal|tin|steel|iron|weld/i, "Metalwork"],
  [/textile|fiber|fibre|weav|woven|knit|crochet|embroider|felt|fabric|quilt|handbag|bag\b|sew/i, "Textiles & Fiber"],
  [/paint|acrylic|oil\b|watercolor|watercolour|ink\b|gouache|drawing|illustrat|silk paint/i, "Painting & Drawing"],
  [/mixed media|sculpt|3d|folk ?art|assemblage|resin|collage/i, "Mixed Media & Sculpture"],
];

/** Map a free-text medium to a canonical category. */
export function categorizeMedium(text: string | null | undefined): MediumCategory {
  const t = (text ?? "").toLowerCase();
  for (const [re, cat] of RULES) if (re.test(t)) return cat;
  return "Other";
}
