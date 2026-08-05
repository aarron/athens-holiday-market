import { readFileSync } from "fs";
import { randomUUID } from "crypto";
import { db } from "../src/db";
import { subscribers } from "../src/db/schema";

type Row = { email: string; name: string | null; status: "subscribed" | "unsubscribed"; confirmedAt: string | null };
const rows: Row[] = JSON.parse(readFileSync("scripts/data/mailchimp.json", "utf8"));

function chunk<T>(arr: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

async function main() {
  const values = rows.map((r) => ({
    email: r.email,
    name: r.name,
    isArtist: false,
    status: r.status,
    unsubscribeToken: randomUUID(),
    source: "mailchimp",
    confirmedAt: r.confirmedAt ? new Date(r.confirmedAt.replace(" ", "T") + "Z") : null,
  }));

  let done = 0;
  for (const batch of chunk(values, 100)) {
    await db.insert(subscribers).values(batch).onConflictDoNothing({ target: subscribers.email });
    done += batch.length;
  }
  console.log(`Imported ${done} MailChimp subscribers (existing emails skipped).`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
