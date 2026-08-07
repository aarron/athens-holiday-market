import { desc, eq, like } from "drizzle-orm";
import { put } from "@vercel/blob";
import { db } from "../src/db";
import { applicationPhotos } from "../src/db/schema";

function fileId(url: string): string | null {
  const m = url.match(/[?&]id=([A-Za-z0-9_-]{20,})/) || url.match(/\/d\/([A-Za-z0-9_-]{20,})/);
  return m ? m[1] : null;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Optional authenticated fallback: a Google API key with the Drive API enabled.
const DRIVE_API_KEY = process.env.DRIVE_API_KEY || "";

/**
 * Candidate download URLs for a public Drive file, cheapest/highest-throughput
 * first. lh3 is Google's image CDN (built for scale, far more tolerant of bulk
 * than the thumbnail endpoint). The Drive API is tried last, only if a key is set.
 */
function endpoints(id: string): string[] {
  const urls = [
    `https://lh3.googleusercontent.com/d/${id}=w1600`,
    `https://drive.google.com/thumbnail?id=${id}&sz=w1600`,
  ];
  if (DRIVE_API_KEY) {
    urls.push(`https://www.googleapis.com/drive/v3/files/${id}?alt=media&key=${DRIVE_API_KEY}&supportsAllDrives=true`);
  }
  return urls;
}

/** Fetch a Drive image, trying each endpoint with retry/backoff on throttling. */
async function fetchImage(id: string): Promise<{ buf: Buffer; ct: string } | null> {
  for (const url of endpoints(id)) {
    for (const wait of [0, 1500, 5000]) {
      if (wait) await sleep(wait);
      try {
        const res = await fetch(url, { redirect: "follow" });
        const ct = (res.headers.get("content-type") || "").toLowerCase();
        if (res.ok && ct.startsWith("image/")) {
          const buf = Buffer.from(await res.arrayBuffer());
          if (buf.length >= 2000) return { buf, ct };
        }
        // A definitive non-image 200 (HTML page) or 403/404 won't improve on
        // retry — move to the next endpoint. Only 429/5xx are worth retrying.
        if (res.status !== 429 && res.status < 500) break;
      } catch {
        /* network hiccup — retry */
      }
    }
  }
  return null;
}

function extFor(ct: string): string {
  if (ct.includes("png")) return "png";
  if (ct.includes("webp")) return "webp";
  if (ct.includes("gif")) return "gif";
  return "jpg";
}

async function main() {
  const rows = await db
    .select({ id: applicationPhotos.id, url: applicationPhotos.url })
    .from(applicationPhotos)
    .where(like(applicationPhotos.url, "%drive.google%"))
    .orderBy(desc(applicationPhotos.id)); // newest (recently imported, fetchable) first
  console.log(`${rows.length} Drive photos to migrate…${DRIVE_API_KEY ? " (Drive API key present)" : ""}`);

  let ok = 0;
  let skip = 0;
  const fails: string[] = [];
  for (const r of rows) {
    const id = fileId(r.url);
    if (!id) {
      skip++;
      continue;
    }
    const img = await fetchImage(id);
    if (!img) {
      skip++;
      if (fails.length < 15) fails.push(id);
      continue;
    }
    try {
      const blob = await put(`archive/${id}.${extFor(img.ct)}`, img.buf, {
        access: "public",
        contentType: img.ct,
        addRandomSuffix: false,
        allowOverwrite: true,
      });
      await db.update(applicationPhotos).set({ url: blob.url }).where(eq(applicationPhotos.id, r.id));
      ok++;
      if (ok % 50 === 0) console.log(`  migrated ${ok} (skipped ${skip})…`);
    } catch {
      skip++;
    }
    await sleep(90); // gentle pacing
  }
  console.log(`Done: migrated ${ok}, skipped ${skip}.`);
  if (fails.length) console.log(`unresolved ids (sample): ${fails.join(", ")}`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
