import { db } from "./index";
import { cycles } from "./schema";
import { site } from "../lib/site";
import { eq } from "drizzle-orm";

/** Idempotently ensure the active market cycle exists. Run: npm run db:seed */
async function main() {
  const year = site.event.year;
  const values = {
    year,
    name: `${site.name} ${year}`,
    applicationsOpenAt: new Date(site.applications.opensAt),
    applicationsCloseAt: new Date(site.applications.closesAt),
    eventStartsAt: new Date(`${site.event.days[0].date}T17:00:00-05:00`),
    eventEndsAt: new Date(`${site.event.days[1].date}T21:00:00-05:00`),
    locationName: site.location.name,
    locationAddress: `${site.location.street}, ${site.location.city}, ${site.location.state}`,
    decisionNotifyOn: site.applications.decisionLabel,
    isActive: true,
  };

  const existing = await db.query.cycles.findFirst({ where: eq(cycles.year, year) });
  if (existing) {
    await db.update(cycles).set(values).where(eq(cycles.year, year));
    console.log(`Updated cycle ${year} (id=${existing.id}).`);
  } else {
    const [row] = await db.insert(cycles).values(values).returning();
    console.log(`Created cycle ${year} (id=${row.id}).`);
  }
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
