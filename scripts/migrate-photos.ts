import { eq, like } from "drizzle-orm";
import { put } from "@vercel/blob";
import { db } from "../src/db";
import { applicationPhotos } from "../src/db/schema";

function fileId(url: string): string | null {
  const m = url.match(/[?&]id=([A-Za-z0-9_-]{20,})/) || url.match(/\/d\/([A-Za-z0-9_-]{20,})/);
  return m ? m[1] : null;
}

async function main() {
  const rows = await db
    .select({ id: applicationPhotos.id, url: applicationPhotos.url })
    .from(applicationPhotos)
    .where(like(applicationPhotos.url, "%drive.google%"));
  console.log(`${rows.length} Drive photos to migrate…`);

  let ok = 0;
  let skip = 0;
  for (const r of rows) {
    const id = fileId(r.url);
    if (!id) {
      skip++;
      continue;
    }
    try {
      const res = await fetch(`https://drive.google.com/thumbnail?id=${id}&sz=w1200`);
      const ct = res.headers.get("content-type") || "";
      if (!res.ok || !ct.startsWith("image/")) {
        skip++;
        continue;
      }
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 3000) {
        skip++;
        continue;
      }
      const blob = await put(`archive/${id}.jpg`, buf, {
        access: "public",
        contentType: "image/jpeg",
        addRandomSuffix: false,
        allowOverwrite: true,
      });
      await db.update(applicationPhotos).set({ url: blob.url }).where(eq(applicationPhotos.id, r.id));
      ok++;
      if (ok % 50 === 0) console.log(`  migrated ${ok}…`);
    } catch {
      skip++;
    }
  }
  console.log(`Done: migrated ${ok}, skipped ${skip}.`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
