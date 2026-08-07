import { readFileSync } from "fs";
import { eq, inArray } from "drizzle-orm";
import { db } from "../src/db";
import { cycles, applications, applicationPhotos } from "../src/db/schema";
import { categorizeMedium } from "../src/lib/mediums";

/**
 * Second archive import: 2021, 2022, 2025 (from the fall-2025 spreadsheet batch).
 * 2015 / 2019 / 2024 in that batch were already imported; the "2023" sheet was a
 * byte-identical duplicate of 2022, so it's excluded. Idempotent — only ever
 * touches the three cycles below. Photos land as Drive URLs; run
 * `scripts/migrate-photos.ts` afterward to move them to Blob.
 */
type Status = "accepted" | "rejected" | "submitted";
type Rec = {
  year: number;
  name: string;
  email: string | null;
  phone: string | null;
  website: string | null;
  medium: string | null;
  description: string | null;
  status: Status;
  shareBooth: boolean;
  shareBoothWith: string | null;
  photos: string[];
};

const recs: Rec[] = JSON.parse(readFileSync("scripts/data/apps-2021-2022-2025.json", "utf8"));
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

  // Idempotent: clear only these archive cycles (cascades to their photos).
  await db.delete(applications).where(inArray(applications.cycleId, Object.values(cycleByYear)));

  let n = 0;
  let photoRows = 0;
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
        shareBooth: !!r.shareBooth,
        shareBoothWith: r.shareBoothWith || null,
        createdAt: new Date(`${r.year}-11-01T12:00:00Z`),
      })
      .returning({ id: applications.id });

    if (r.photos?.length) {
      const rows = r.photos.slice(0, 6).map((url, i) => ({ applicationId: app.id, url, position: i }));
      await db.insert(applicationPhotos).values(rows);
      photoRows += rows.length;
    }
    n++;
  }

  console.log(`Imported ${n} applications and ${photoRows} photo rows across ${years.join(", ")}.`);
  console.log("Next: run scripts/migrate-photos.ts to move Drive photos to Blob.");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
