// Migrate published artist photos still hosted on Google Drive (which blocks
// browser hotlinking) to Vercel Blob. Run: npm run tsx scripts/migrate-artist-photos.ts
import { eq, like } from "drizzle-orm";
import { put } from "@vercel/blob";
import { db } from "../src/db";
import { artistPhotos } from "../src/db/schema";

async function main() {
  const rows = await db
    .select({ id: artistPhotos.id, url: artistPhotos.url })
    .from(artistPhotos)
    .where(like(artistPhotos.url, "%drive.google%"));

  console.log(`Migrating ${rows.length} Drive-hosted artist photos → Blob…`);
  let ok = 0;
  let fail = 0;
  for (const r of rows) {
    const gid = r.url.match(/[?&]id=([^&]+)/)?.[1] ?? r.url.match(/\/d\/([^/]+)/)?.[1];
    if (!gid) {
      console.log(`  ✗ #${r.id}: could not parse Drive id`);
      fail++;
      continue;
    }
    try {
      const res = await fetch(`https://drive.google.com/thumbnail?id=${gid}&sz=w1600`);
      const ct = res.headers.get("content-type") ?? "";
      if (!res.ok || !ct.startsWith("image/")) throw new Error(`${res.status} ${ct}`);
      const buf = Buffer.from(await res.arrayBuffer());
      const blob = await put(`artists/${gid}.jpg`, buf, {
        access: "public",
        contentType: "image/jpeg",
      });
      await db.update(artistPhotos).set({ url: blob.url }).where(eq(artistPhotos.id, r.id));
      ok++;
      console.log(`  ✓ #${r.id} → ${blob.url}`);
    } catch (e) {
      fail++;
      console.log(`  ✗ #${r.id}: ${e instanceof Error ? e.message : e}`);
    }
  }
  console.log(`Done. ${ok} migrated, ${fail} failed.`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
