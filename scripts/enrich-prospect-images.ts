import { enrichProspectImagesFromSites, cachePendingProspectImages } from "../src/lib/prospect-images";

/**
 * Backfill reference photos for prospects that have a website but no images yet,
 * by extracting them from each artist's own site (no web-search quota needed),
 * then cache everything to Vercel Blob. Idempotent.
 *
 *   npx dotenv -e .env.local -- tsx scripts/enrich-prospect-images.ts
 */
async function main() {
  console.log("Extracting images from prospect websites…");
  const e = await enrichProspectImagesFromSites();
  console.log(
    `Enriched: ${e.withImages}/${e.processed} sites yielded photos (${e.imagesAdded} images added).`,
  );
  console.log("Caching to Blob…");
  const c = await cachePendingProspectImages();
  console.log(`Cached: ${c.cached}/${c.total} (${c.failed} failed/skipped).`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
