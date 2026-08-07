import { readFileSync } from "fs";
import { eq } from "drizzle-orm";
import { db } from "../src/db";
import { cycles, applications } from "../src/db/schema";
import { categorizeMedium } from "../src/lib/mediums";

/**
 * 2023 as an accepted + waitlisted roster (name/email only). We never received
 * the full 2023 application sheet — the file labeled "2023" was a duplicate of
 * 2022 — so this comes from the MailChimp Accepted/Waitlisted member exports.
 * Idempotent: clears + reinserts only the 2023 cycle.
 */
type RosterRow = { email: string; name: string; status: "accepted" | "waitlisted" };

async function main() {
  const roster = JSON.parse(readFileSync("scripts/data/apps-2023-roster.json", "utf8")) as RosterRow[];
  let c = await db.query.cycles.findFirst({ where: eq(cycles.year, 2023) });
  if (!c) {
    [c] = await db
      .insert(cycles)
      .values({ year: 2023, name: "Athens Holiday Market 2023", isActive: false, locationName: "Big City Bread Courtyard" })
      .returning();
  }
  await db.delete(applications).where(eq(applications.cycleId, c.id));
  let n = 0;
  for (const [idx, r] of roster.entries()) {
    await db.insert(applications).values({
      cycleId: c.id,
      status: r.status,
      name: r.name || "(no name)",
      email: (r.email || `archive-2023-${idx}@no-email.invalid`).toLowerCase(),
      medium: "Not recorded",
      mediumCategory: categorizeMedium(""),
      description: "",
      createdAt: new Date("2023-11-01T12:00:00Z"),
    });
    n++;
  }
  console.log(`2023: imported ${n} roster applications (accepted + waitlisted; no full apps/photos).`);
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
