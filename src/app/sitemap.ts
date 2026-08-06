import type { MetadataRoute } from "next";
import { site } from "@/lib/site";
import { allPublishedSlugs } from "@/lib/artists-data";

// Re-generate hourly so newly published artist pages appear without a deploy.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = site.url.replace(/\/$/, "");

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/artists`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/apply`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/contact`, changeFrequency: "yearly", priority: 0.5 },
  ];

  let artistRoutes: MetadataRoute.Sitemap = [];
  try {
    const slugs = await allPublishedSlugs();
    artistRoutes = slugs.map((slug) => ({
      url: `${base}/artists/${slug}`,
      changeFrequency: "monthly",
      priority: 0.6,
    }));
  } catch {
    // If the DB is unreachable at request time, still serve the static routes
    // rather than 500 the sitemap.
  }

  return [...staticRoutes, ...artistRoutes];
}
