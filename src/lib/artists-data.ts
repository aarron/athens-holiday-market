import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { artists } from "@/db/schema";

export async function listPublishedArtists() {
  return db.query.artists.findMany({
    where: eq(artists.published, true),
    orderBy: [asc(artists.sortOrder), asc(artists.name)],
    with: { photos: { orderBy: (p, { asc }) => [asc(p.position)], limit: 1 } },
  });
}

export async function getFeaturedArtists(limit = 8) {
  const rows = await db.query.artists.findMany({
    where: and(eq(artists.published, true), eq(artists.featured, true)),
    orderBy: [asc(artists.sortOrder), asc(artists.name)],
    with: { photos: { orderBy: (p, { asc }) => [asc(p.position)], limit: 1 } },
    limit,
  });
  return rows;
}

export async function getArtistBySlug(slug: string) {
  return db.query.artists.findFirst({
    where: eq(artists.slug, slug),
    with: { photos: { orderBy: (p, { asc }) => [asc(p.position)] } },
  });
}

export async function allPublishedSlugs() {
  const rows = await db
    .select({ slug: artists.slug })
    .from(artists)
    .where(eq(artists.published, true));
  return rows.map((r) => r.slug);
}
