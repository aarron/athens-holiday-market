/**
 * Merge duplicate applications (same person applied twice).
 *
 *   npm run db:merge-apps -- --pair=KEEP:DROP [--pair=...]            # DRY RUN (default)
 *   npm run db:merge-apps -- --pair=KEEP:DROP [--pair=...] --apply
 *
 * KEEP is the application that survives (normally the newer submission — the
 * artist's latest words). Nothing is lost:
 *  - blank fields on KEEP are filled from DROP (website, phone, bio, socials…)
 *  - photos DROP has that KEEP doesn't (by original filename) move to KEEP
 *  - comments move to KEEP
 *  - votes: a judge who only voted on DROP has the vote moved; if they voted
 *    on both, their vote on KEEP stands (a judge's vote is never rewritten) and
 *    a differing vote on DROP is reported so they can revisit it
 *  - a full JSON snapshot of DROP (row, votes, comments, photos) is written to
 *    admin_events before DROP is deleted, so it can be reconstructed
 * Each pair runs as one atomic batch.
 */
import { eq, inArray } from "drizzle-orm";
import { db } from "../src/db";
import { applications, applicationPhotos, votes, comments, artists, prospects, adminEvents } from "../src/db/schema";

const APPLY = process.argv.includes("--apply");
const pairs = process.argv.filter((a) => a.startsWith("--pair=")).map((a) => a.slice(7).split(":").map(Number) as [number, number]);

/** "krak01-3dSymo90mVtEJ5g4LTPr9bWFYBQWrU.jpg" -> "krak01.jpg" (Blob adds a random suffix). */
const photoKey = (url: string) => (url.split("/").pop() ?? url).replace(/-[A-Za-z0-9]{16,}(\.\w+)$/, "$1").toLowerCase();
const blank = (v: unknown) => v === null || v === undefined || v === "";

async function mergePair(keepId: number, dropId: number) {
  const [keep, drop] = await Promise.all([
    db.query.applications.findFirst({ where: eq(applications.id, keepId) }),
    db.query.applications.findFirst({ where: eq(applications.id, dropId) }),
  ]);
  if (!keep || !drop) throw new Error(`pair ${keepId}:${dropId} — application not found`);
  if (keep.cycleId !== drop.cycleId) throw new Error(`pair ${keepId}:${dropId} — different cycles`);
  const linked = await db.select({ id: artists.id }).from(artists).where(eq(artists.applicationId, dropId));
  const prospectLinks = await db.select({ id: prospects.id }).from(prospects).where(eq(prospects.appliedApplicationId, dropId));

  const [kPhotos, dPhotos, kVotes, dVotes, dComments] = await Promise.all([
    db.select().from(applicationPhotos).where(eq(applicationPhotos.applicationId, keepId)),
    db.select().from(applicationPhotos).where(eq(applicationPhotos.applicationId, dropId)),
    db.select().from(votes).where(eq(votes.applicationId, keepId)),
    db.select().from(votes).where(eq(votes.applicationId, dropId)),
    db.select().from(comments).where(eq(comments.applicationId, dropId)),
  ]);

  console.log(`\n════ keep #${keepId} (${keep.name}, ${keep.email}) ← merge #${dropId} (${drop.email})`);
  const log: string[] = [];

  // 1) fill blanks on KEEP from DROP
  const set: Record<string, unknown> = {};
  for (const f of ["businessName", "phone", "website", "bio", "mediumCategory", "shareBoothWith"] as const) {
    if (blank(keep[f]) && !blank(drop[f])) { set[f] = drop[f]; log.push(`fill ${f} = ${JSON.stringify(drop[f])}`); }
  }
  const ks = (keep.socials ?? {}) as Record<string, string>, ds = (drop.socials ?? {}) as Record<string, string>;
  const socials = { ...ks };
  for (const [k, v] of Object.entries(ds)) if (v && !socials[k]) { socials[k] = v; log.push(`fill socials.${k} = ${v}`); }
  if (Object.keys(socials).length !== Object.keys(ks).length) set.socials = socials;

  // differences that are NOT merged (KEEP's value stands; DROP's is preserved in the snapshot)
  for (const f of ["email", "medium", "smsConsent", "description", "bio", "shareBooth"] as const) {
    if (!blank(drop[f]) && !blank(keep[f]) && drop[f] !== keep[f]) {
      const short = (v: unknown) => (typeof v === "string" && v.length > 60 ? v.slice(0, 60) + "…" : JSON.stringify(v));
      log.push(`differs ${f}: keeping ${short(keep[f])} · archived ${short(drop[f])}`);
    }
  }

  // 2) photos unique to DROP move to KEEP
  const have = new Set(kPhotos.map((p) => photoKey(p.url)));
  const movePhotos = dPhotos.filter((p) => !have.has(photoKey(p.url)));
  let pos = Math.max(-1, ...kPhotos.map((p) => p.position));
  const photoMoves = movePhotos.map((p) => ({ id: p.id, position: ++pos }));
  movePhotos.forEach((p) => log.push(`move photo ${p.url.split("/").pop()}`));
  log.push(`${dPhotos.length - movePhotos.length} photo(s) on #${dropId} are re-uploads already on #${keepId}`);

  // 3) votes
  const voteMoves: number[] = [];
  for (const dv of dVotes) {
    const kv = kVotes.find((v) => v.userId === dv.userId);
    if (!kv) { voteMoves.push(dv.id); log.push(`move vote (judge ${dv.userId}: ${dv.value})`); }
    else if (kv.value === dv.value) log.push(`vote judge ${dv.userId}: same on both (${kv.value})`);
    else log.push(`VOTE CONFLICT judge ${dv.userId}: keeping "${kv.value}" (cast ${kv.updatedAt.toISOString()} on #${keepId}); archived "${dv.value}" (cast ${dv.updatedAt.toISOString()} on #${dropId})`);
  }

  // 4) comments
  dComments.forEach((c) => log.push(`move comment ${JSON.stringify(c.body)}`));
  if (linked.length) log.push(`re-point ${linked.length} artist page(s)`);
  if (prospectLinks.length) log.push(`re-point ${prospectLinks.length} prospect link(s)`);

  log.forEach((l) => console.log("   " + l));
  console.log(`   then DELETE applications WHERE id = ${dropId} (1 row; cascades its remaining ${dVotes.length - voteMoves.length} vote(s), ${dPhotos.length - movePhotos.length} photo row(s))`);
  if (!APPLY) return;

  const snapshot = JSON.stringify({ application: drop, votes: dVotes, comments: dComments, photos: dPhotos });
  await db.batch([
    db.insert(adminEvents).values({
      actorEmail: "system:merge-duplicates", action: "application.merge", targetType: "application", targetId: keepId,
      summary: `Merged duplicate application #${dropId} into #${keepId} (${keep.name}). ${log.join("; ")}. SNAPSHOT of #${dropId}: ${snapshot}`,
    }),
    db.update(applications).set({ ...set, updatedAt: new Date() }).where(eq(applications.id, keepId)),
    ...photoMoves.map((m) => db.update(applicationPhotos).set({ applicationId: keepId, position: m.position }).where(eq(applicationPhotos.id, m.id))),
    ...(voteMoves.length ? [db.update(votes).set({ applicationId: keepId }).where(inArray(votes.id, voteMoves))] : []),
    db.update(comments).set({ applicationId: keepId }).where(eq(comments.applicationId, dropId)),
    db.update(artists).set({ applicationId: keepId }).where(eq(artists.applicationId, dropId)),
    db.update(prospects).set({ appliedApplicationId: keepId }).where(eq(prospects.appliedApplicationId, dropId)),
    db.delete(applications).where(eq(applications.id, dropId)),
  ]);
  console.log(`   ✔ applied`);
}

async function main() {
  if (!pairs.length || pairs.some((p) => p.length !== 2 || p.some((n) => !Number.isInteger(n)))) throw new Error("usage: --pair=KEEP:DROP");
  console.log(APPLY ? "APPLY" : "DRY RUN (no writes)");
  for (const [k, d] of pairs) await mergePair(k, d);
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
