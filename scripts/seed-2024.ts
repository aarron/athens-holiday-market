import { readFileSync } from "fs";
import { eq } from "drizzle-orm";
import { db } from "../src/db";
import { cycles, users, applications, applicationPhotos, votes } from "../src/db/schema";

type Row = {
  name: string;
  email: string;
  phone: string;
  website: string;
  medium: string;
  description: string;
  photoIds: string[];
  shareBooth: boolean;
  shareBoothWith: string;
  votes: Record<string, "yes" | "maybe" | "no">;
  accepted: boolean;
  submittedAt: string;
};

const rows: Row[] = JSON.parse(readFileSync("scripts/data/apps2024.json", "utf8"));

// Historical judges from the 2024 sheet. Placeholder emails until the real
// judges are added to the allowlist; their historical votes attach here.
const JUDGES = [
  { name: "Jamie", email: "jamie@judge.athensholidaymarket.com" },
  { name: "Ryan", email: "ryan@judge.athensholidaymarket.com" },
  { name: "Brent", email: "brent@judge.athensholidaymarket.com" },
  { name: "Ansley", email: "ansley@judge.athensholidaymarket.com" },
  { name: "Jim", email: "jim@judge.athensholidaymarket.com" },
];

async function main() {
  let cycle = await db.query.cycles.findFirst({ where: eq(cycles.year, 2024) });
  if (!cycle) {
    [cycle] = await db
      .insert(cycles)
      .values({
        year: 2024,
        name: "Athens Holiday Market 2024",
        isActive: false,
        locationName: "Big City Bread Courtyard",
      })
      .returning();
  }

  const judgeIds: Record<string, number> = {};
  for (const j of JUDGES) {
    let u = await db.query.users.findFirst({ where: eq(users.email, j.email) });
    if (!u) [u] = await db.insert(users).values({ email: j.email, name: j.name, role: "judge" }).returning();
    judgeIds[j.name] = u.id;
  }

  // Idempotent: clear this cycle's applications (cascades to photos + votes).
  await db.delete(applications).where(eq(applications.cycleId, cycle.id));

  let count = 0;
  for (const r of rows) {
    const [app] = await db
      .insert(applications)
      .values({
        cycleId: cycle.id,
        status: r.accepted ? "accepted" : "rejected",
        name: r.name,
        email: r.email,
        phone: r.phone || null,
        website: r.website || null,
        medium: r.medium,
        description: r.description,
        shareBooth: r.shareBooth,
        shareBoothWith: r.shareBoothWith || null,
        // demo variety: ~60% of accepted artists have paid their booth fee
        boothFeePaid: r.accepted && Math.random() > 0.4,
        createdAt: new Date(r.submittedAt),
      })
      .returning({ id: applications.id });

    if (r.photoIds.length) {
      await db.insert(applicationPhotos).values(
        r.photoIds.map((id, i) => ({
          applicationId: app.id,
          url: `https://drive.google.com/thumbnail?id=${id}&sz=w1200`,
          position: i,
        })),
      );
    }

    const voteRows = Object.entries(r.votes).map(([judge, value]) => ({
      applicationId: app.id,
      userId: judgeIds[judge],
      value,
    }));
    if (voteRows.length) await db.insert(votes).values(voteRows);
    count++;
  }

  console.log(`Seeded ${count} applications into the 2024 cycle (id=${cycle.id}).`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
