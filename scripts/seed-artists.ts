import { readFileSync } from "fs";
import { eq } from "drizzle-orm";
import { db } from "../src/db";
import { artists, artistPhotos } from "../src/db/schema";

type Row = { name: string; medium: string; bio: string; website: string; image: string };
const rows: Row[] = JSON.parse(readFileSync("scripts/data/showcase-artists.json", "utf8"));

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function main() {
  let n = 0;
  for (const [i, r] of rows.entries()) {
    const slug = slugify(r.name);
    const existing = await db.query.artists.findFirst({ where: eq(artists.slug, slug) });
    let artistId: number;
    const values = {
      slug,
      name: r.name,
      medium: r.medium,
      bio: r.bio,
      website: r.website || null,
      published: true,
      featured: true,
      sortOrder: i,
    };
    if (existing) {
      await db.update(artists).set(values).where(eq(artists.id, existing.id));
      artistId = existing.id;
      await db.delete(artistPhotos).where(eq(artistPhotos.artistId, artistId));
    } else {
      const [a] = await db.insert(artists).values(values).returning({ id: artists.id });
      artistId = a.id;
    }
    await db.insert(artistPhotos).values({ artistId, url: r.image, position: 0 });
    n++;
  }
  console.log(`Seeded ${n} showcase artists.`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
