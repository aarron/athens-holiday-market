/**
 * Non-profit booths. The market hosts two non-profits each year at no charge.
 * A non-profit is an accepted application whose category is "Non-profit" —
 * the category is the single marker, so there's no separate flag to keep in
 * sync. Non-profits are never invoiced or reminded about a booth fee, get
 * their own acceptance email, and still count as a booth.
 */
export const NONPROFIT_CATEGORY = "Non-profit";
export const NONPROFIT_SPOTS_PER_YEAR = 2;

export const isNonprofitCategory = (category: string | null | undefined) => category === NONPROFIT_CATEGORY;

/**
 * On artist pages the marker is the medium: a non-profit's page is created
 * with medium "Non-profit" (see ensureArtistForApplication), which public
 * pages already file under the Non-profit category.
 */
export const isNonprofitMedium = (medium: string | null | undefined) =>
  (medium ?? "").trim().toLowerCase() === NONPROFIT_CATEGORY.toLowerCase();
