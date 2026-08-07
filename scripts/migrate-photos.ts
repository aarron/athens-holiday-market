import { eq, like } from "drizzle-orm";
import { put } from "@vercel/blob";
import { db } from "../src/db";
import { applicationPhotos } from "../src/db/schema";

function fileId(url: string): string | null {
  const m = url.match(/[?&]id=([A-Za-z0-9_-]{20,})/) || url.match(/\/d\/([A-Za-z0-9_-]{20,})/);
  return m ? m[1] : null;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Fetch a Drive thumbnail with retry — Drive throttles bulk requests, so a
 *  non-image response is usually transient rate-limiting, not a dead file. */
async function fetchImage(id: string): Promise<Buffer | null> {
  const backoff = [0, 1500, 4000, 9000];
  for (const wait of backoff) {
    if (wait) await sleep(wait);
    try {
      const res = await fetch(`https://drive.google.com/thumbnail?id=${id}&sz=w1200`);
      const ct = res.headers.get("content-type") || "";
      if (res.ok && ct.startsWith("image/")) {
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.length >= 3000) return buf;
      }
    } catch {
      /* retry */
    }
  }
  return null;
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
    const buf = await fetchImage(id);
    if (!buf) {
      skip++;
      continue;
    }
    try {
      const blob = await put(`archive/${id}.jpg`, buf, {
        access: "public",
        contentType: "image/jpeg",
        addRandomSuffix: false,
        allowOverwrite: true,
      });
      await db.update(applicationPhotos).set({ url: blob.url }).where(eq(applicationPhotos.id, r.id));
      ok++;
      if (ok % 50 === 0) console.log(`  migrated ${ok} (skipped ${skip})…`);
    } catch {
      skip++;
    }
    await sleep(150); // gentle pacing to stay under Drive's rate limit
  }
  console.log(`Done: migrated ${ok}, skipped ${skip}.`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
