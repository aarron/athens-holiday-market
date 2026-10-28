import "server-only";
import { like } from "drizzle-orm";
import { db } from "@/db";
import { settings } from "@/db/schema";
import type { ShareCardKind } from "@/lib/share-card";

/**
 * Share-image downloads from the artist portal, one settings row per artist
 * (`social_kit_downloads:<artistId>`). The images are drawn in the artist's
 * browser, so the portal reports each download here; nothing before Oct 28,
 * 2026 was recorded.
 */
export type KitDownloads = {
  counts: Partial<Record<ShareCardKind, number>>;
  first: string;
  last: string;
};

const PREFIX = "social_kit_downloads:";

export async function readKitDownloads(): Promise<Map<number, KitDownloads>> {
  const rows = await db.select().from(settings).where(like(settings.key, `${PREFIX}%`));
  const out = new Map<number, KitDownloads>();
  for (const r of rows) {
    const id = Number(r.key.slice(PREFIX.length));
    if (Number.isInteger(id) && r.value && typeof r.value === "object") out.set(id, r.value as KitDownloads);
  }
  return out;
}

export async function addKitDownload(artistId: number, kind: ShareCardKind) {
  const key = `${PREFIX}${artistId}`;
  const existing = await db.query.settings.findFirst({ where: (s, { eq }) => eq(s.key, key) });
  const prev = (existing?.value as KitDownloads | null) ?? null;
  const now = new Date().toISOString();
  const value: KitDownloads = {
    counts: { ...prev?.counts, [kind]: (prev?.counts[kind] ?? 0) + 1 },
    first: prev?.first ?? now,
    last: now,
  };
  await db
    .insert(settings)
    .values({ key, value })
    .onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: new Date() } });
}

export function kitDownloadTotal(d: KitDownloads | undefined): number {
  return d ? Object.values(d.counts).reduce((n, c) => n + (c ?? 0), 0) : 0;
}
