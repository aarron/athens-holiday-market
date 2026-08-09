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
  "Photography",
  "Printmaking & Paper",
  "Woodwork",
  "Glass",
  "Metalwork",
  "Candles & Apothecary",
  "Bath & Body",
  "Food & Drink",
  "Home & Decor",
  "Upcycled",
  "Mixed Media & Sculpture",
  "Other",
] as const;

export type MediumCategory = (typeof MEDIUM_CATEGORIES)[number];

// Keyword → category, checked in order (first match wins), so the primary craft
// goes ahead of secondary materials. Word boundaries (\b) matter: an un-anchored
// "tin" matches "pain*tin*g", which used to mis-file painters as Metalwork.
const RULES: [RegExp, MediumCategory][] = [
  [/ceramic|pottery|\bclay\b|stoneware|porcelain|mosaic|\bcone \d/i, "Ceramics & Pottery"],
  [/jewel|earring|necklace|bracelet|\bring(s|z)?\b|pendant|\bbead|pearl|\bsilver\b|gold.?fill|\benamel/i, "Jewelry"],
  [/stained glass|blown glass|fused glass|\bglass\b/i, "Glass"],
  [/leather/i, "Leather"],
  [/candle|diffuser|apothecar|salt soak|essential oil|incense|\belixir/i, "Candles & Apothecary"],
  [/\bsoap\b|shea butter|sea moss|\bcbd\b|\bbalm\b|lotion|\bbath\b|body care|skin ?care|shampoo|lip ?balm/i, "Bath & Body"],
  [/\bteas?\b|\btreat|\bjam\b|jelly|honey|beekeep|baked|\bfood\b|chocolate|\bspice|\bherb|\bdrink|preserve|pickle|granola|sauce|\bcandy\b|confection|\bbaker|cookie|\bcake|macaron|\bcider\b|vinegar|\bpie(s)?\b/i, "Food & Drink"],
  [/photograph|\bphoto\b/i, "Photography"],
  [/paint|acrylic|\boil\b|watercolo|\bink\b|gouache|drawing|\bdraw\b|illustrat|\bart print|fine art|\bpastel/i, "Painting & Drawing"],
  [/print|block.?print|screen.?print|risograph|\bpaper\b|puzzle|\bcard\b|\bzine\b|stationer|sticker|\bbooks?\b|cookbook|calendar|notebook/i, "Printmaking & Paper"],
  [/textile|\bfiber\b|\bfibre\b|weav|woven|\bknit|crochet|embroider|\bfelt|macram|\bbatik\b|tie ?dye|fabric|quilt|handbag|\bbag(s)?\b|\bsew|apparel|clothing|\bcotton\b|\byarn\b|tapestry|scarf|scarves|\bhat(s)?\b/i, "Textiles & Fiber"],
  // Upcycled / reclaimed work — checked before the material rules so
  // "upcycled metal & wood" files here rather than as Metalwork/Woodwork.
  [/upcycl|repurpos|reclaim|salvage|refurbish|restored|restoration|found (object|material)/i, "Upcycled"],
  [/\bwood|woodcarv|woodwork|\bcarv|whittl|\blathe\b|turned wood/i, "Woodwork"],
  [/\bmetal|\btin\b|\bsteel\b|\biron\b|\bweld|\bcopper\b|pewter|\bwire\b|blacksmith|forge/i, "Metalwork"],
  [/wreath|\bfloral\b|greenery|grapevine|\bornament|home ?d[eé]cor|\bdecor\b|centerpiece|dried flower|\bplant(s)?\b|terrarium/i, "Home & Decor"],
  [/mixed media|\bmixed\b|sculpt|\bresin\b|collage|assemblage|\b3d\b|folk ?art|decoupage/i, "Mixed Media & Sculpture"],
];

/** Map a free-text medium to a canonical category. */
export function categorizeMedium(text: string | null | undefined): MediumCategory {
  const t = (text ?? "").toLowerCase();
  if (!t.trim() || t.includes("not recorded")) return "Other";
  for (const [re, cat] of RULES) if (re.test(t)) return cat;
  return "Other";
}
