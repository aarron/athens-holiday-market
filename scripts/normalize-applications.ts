/**
 * Backfill: normalize contact details + links on existing applications using
 * the same rules the form now enforces (src/lib/validate.ts).
 *
 *   npm run db:normalize-apps            # DRY RUN (default): prints the diff, writes nothing
 *   npm run db:normalize-apps -- --apply # applies, one qualified UPDATE per changed row
 *   npm run db:normalize-apps -- --apply --limit=5
 *
 * Judging-safe by design: a field is rewritten ONLY when the normalizer yields
 * a clean canonical value. Anything it rejects (an email typed as a website,
 * "under construction", a Facebook page name) is LEFT UNTOUCHED so judges keep
 * the information. Every change is recorded in admin_events (before -> after)
 * with actor "system:normalize", so originals are recoverable. Idempotent.
 */
import { eq } from "drizzle-orm";
import { db } from "../src/db";
import { applications, cycles, adminEvents } from "../src/db/schema";
import { normalizePhone, validateWebsite, validateSocial, normalizeEmail } from "../src/lib/validate";
import { cleanName } from "../src/lib/clean";

const APPLY = process.argv.includes("--apply");
const limitArg = process.argv.find((a) => a.startsWith("--limit="));
const LIMIT = limitArg ? Number(limitArg.split("=")[1]) : Infinity;

type Change = { field: string; before: unknown; after: unknown };

async function main() {
  const cycle = await db.query.cycles.findFirst({ where: eq(cycles.isActive, true) });
  if (!cycle) throw new Error("No active cycle");
  const rows = await db.query.applications.findMany({ where: eq(applications.cycleId, cycle.id) });
  console.log(`${APPLY ? "APPLY" : "DRY RUN"} — cycle ${cycle.id}, ${rows.length} applications\n`);

  let changedRows = 0, skippedFields: string[] = [];
  for (const r of rows) {
    const set: Record<string, unknown> = {};
    const changes: Change[] = [];

    // name: only fix shouting/whispering; leave mixed-case names alone.
    if (r.name && (r.name === r.name.toUpperCase() || r.name === r.name.toLowerCase()) && /[a-z]/i.test(r.name)) {
      const n = cleanName(r.name);
      if (n !== r.name) { set.name = n; changes.push({ field: "name", before: r.name, after: n }); }
    }
    // email: lowercase (already is, but idempotent + harmless)
    if (r.email) { const e = normalizeEmail(r.email); if (e !== r.email) { set.email = e; changes.push({ field: "email", before: r.email, after: e }); } }
    // phone: -> E.164; leave if not a US number
    if (r.phone) {
      const p = normalizePhone(r.phone);
      if (p && p !== r.phone) { set.phone = p; changes.push({ field: "phone", before: r.phone, after: p }); }
      else if (!p) skippedFields.push(`#${r.id} phone kept (not a US number): ${JSON.stringify(r.phone)}`);
    }
    // website: canonical https, or null for info-free junk ("N/a"); keep rejected values
    if (r.website !== null && r.website !== undefined && r.website !== "") {
      const w = validateWebsite(r.website);
      if (w.ok) { if (w.value !== r.website) { set.website = w.value; changes.push({ field: "website", before: r.website, after: w.value }); } }
      else skippedFields.push(`#${r.id} website kept (judges may need it): ${JSON.stringify(r.website)} — ${w.error}`);
    }
    // socials: canonical profile URLs; keep rejected values (page names) verbatim
    const soc = { ...((r.socials as Record<string, string> | null) ?? {}) };
    let socChanged = false;
    for (const k of ["instagram", "facebook", "tiktok"] as const) {
      const v = soc[k]; if (!v) continue;
      const s = validateSocial(k, v);
      if (s.ok && s.value && s.value !== v) { changes.push({ field: k, before: v, after: s.value }); soc[k] = s.value; socChanged = true; }
      else if (!s.ok) skippedFields.push(`#${r.id} ${k} kept (judges may need it): ${JSON.stringify(v)}`);
    }
    if (socChanged) set.socials = soc;

    if (!changes.length) continue;
    changedRows++;
    console.log(`#${r.id} ${r.name}`);
    for (const c of changes) console.log(`   ${c.field.padEnd(9)} ${JSON.stringify(c.before)}  ->  ${JSON.stringify(c.after)}`);

    if (APPLY && changedRows <= LIMIT) {
      await db.update(applications).set({ ...set, updatedAt: new Date() }).where(eq(applications.id, r.id));
      // Audit row written directly (src/lib/audit.ts is server-only; not loadable from tsx).
      await db.insert(adminEvents).values({
        actorEmail: "system:normalize", action: "application.normalize", targetType: "application", targetId: r.id,
        summary: `Normalized contact/links: ${changes.map((c) => `${c.field}: ${JSON.stringify(c.before)} -> ${JSON.stringify(c.after)}`).join("; ")}`,
      });
    }
  }
  console.log(`\n${changedRows} row(s) ${APPLY ? "updated" : "would change"} (limit ${LIMIT === Infinity ? "none" : LIMIT}); ${rows.length - changedRows} untouched.`);
  if (skippedFields.length) { console.log(`\nKept as-is (rejected by normalizer, preserved for judges):`); skippedFields.forEach((s) => console.log("   " + s)); }
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
