import { eq } from "drizzle-orm";
import { db } from "../src/db";
import { applications } from "../src/db/schema";
import { categorizeMedium } from "../src/lib/mediums";

async function main() {
  const apps = await db.query.applications.findMany({
    columns: { id: true, medium: true, mediumCategory: true },
  });
  const counts: Record<string, number> = {};
  for (const a of apps) {
    const cat = categorizeMedium(a.medium);
    counts[cat] = (counts[cat] ?? 0) + 1;
    await db.update(applications).set({ mediumCategory: cat }).where(eq(applications.id, a.id));
  }
  console.log(`Normalized ${apps.length} applications:`);
  for (const [cat, n] of Object.entries(counts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${n.toString().padStart(3)}  ${cat}`);
  }
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
