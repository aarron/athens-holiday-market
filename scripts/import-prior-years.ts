import { readFileSync } from "fs";
import { eq, inArray } from "drizzle-orm";
import { db } from "../src/db";
import { cycles, applications, applicationPhotos } from "../src/db/schema";
import { categorizeMedium } from "../src/lib/mediums";

type Rec = {
  year: number;
  name: string;
  email: string | null;
  phone: string | null;
  website: string | null;
  medium: string | null;
  description: string | null;
  status: "accepted" | "rejected" | "submitted";
  photos: string[];
};

const recs: Rec[] = JSON.parse(readFileSync("scripts/data/prior-years.json", "utf8"));
const years = [...new Set(recs.map((r) => r.year))].sort();

async function main() {
  const cycleByYear: Record<number, number> = {};
  for (const yr of years) {
    let c = await db.query.cycles.findFirst({ where: eq(cycles.year, yr) });
    if (!c) {
      [c] = await db
        .insert(cycles)
        .values({
          year: yr,
          name: `Athens Holiday Market ${yr}`,
          isActive: false,
          locationName: "Big City Bread Courtyard",
        })
        .returning();
    }
    cycleByYear[yr] = c.id;
  }

  // Idempotent: clear only these archive cycles (never touches 2024/2026).
  await db.delete(applications).where(inArray(applications.cycleId, Object.values(cycleByYear)));

  let n = 0;
  for (const [idx, r] of recs.entries()) {
    const [app] = await db
      .insert(applications)
      .values({
        cycleId: cycleByYear[r.year],
        status: r.status,
        name: r.name,
        email: (r.email || `archive-${r.year}-${idx}@no-email.invalid`).toLowerCase(),
        phone: r.phone || null,
        website: r.website || null,
        medium: r.medium || "Not recorded",
        mediumCategory: categorizeMedium(r.medium || ""),
        description: r.description || "",
        createdAt: new Date(`${r.year}-01-01T12:00:00Z`),
      })
      .returning({ id: applications.id });

    if (r.photos?.length) {
      await db.insert(applicationPhotos).values(
        r.photos.slice(0, 6).map((url, i) => ({ applicationId: app.id, url, position: i })),
      );
    }
    n++;
  }
  console.log(`Imported ${n} applications across ${years.length} archive cycles (${years.join(", ")}).`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
