import { cachePendingProspectImages } from "../src/lib/prospect-images";

/**
 * Download every uncached prospect reference image into Vercel Blob.
 * Idempotent: only touches rows whose blobUrl is still null.
 *
 *   npx dotenv -e .env.local -- tsx scripts/cache-prospect-images.ts
 */
async function main() {
  console.log("Caching prospect images to Blob…");
  const r = await cachePendingProspectImages();
  console.log(`Done: ${r.cached} cached, ${r.failed} failed/skipped, of ${r.total} pending.`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
