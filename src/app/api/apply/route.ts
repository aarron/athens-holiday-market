import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { applications, applicationPhotos, cycles } from "@/db/schema";
import { applicationWindow } from "@/lib/applications";
import { categorizeMedium } from "@/lib/mediums";
import { site } from "@/lib/site";
import { sendApplicationReceived } from "@/lib/emails";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  name: z.string().trim().min(1).max(200),
  businessName: z.string().trim().max(200).optional().default(""),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().min(3).max(40),
  website: z.string().trim().max(300).optional().default(""),
  socials: z.record(z.string(), z.string().max(300)).optional().default({}),
  medium: z.string().trim().min(1).max(300),
  mediumCategory: z.string().trim().max(120).optional().default(""),
  description: z.string().trim().min(1).max(5000),
  bio: z.string().trim().max(5000).optional().default(""),
  shareBooth: z.boolean(),
  shareBoothWith: z.string().trim().max(200).optional().default(""),
  smsConsent: z.boolean().optional().default(false),
  photoUrls: z.array(z.string().url()).min(site.applications.minPhotos).max(site.applications.maxPhotos),
});

export async function POST(req: Request) {
  if (applicationWindow() !== "open") {
    return NextResponse.json(
      { error: "Applications are not open right now." },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please check the form and try again.", issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }
  const d = parsed.data;

  const cycle = await db.query.cycles.findFirst({ where: eq(cycles.isActive, true) });
  if (!cycle) {
    return NextResponse.json({ error: "No active market cycle." }, { status: 500 });
  }

  const [app] = await db
    .insert(applications)
    .values({
      cycleId: cycle.id,
      name: d.name,
      businessName: d.businessName || null,
      email: d.email.toLowerCase(),
      phone: d.phone,
      smsConsent: d.smsConsent,
      website: d.website || null,
      socials: Object.fromEntries(Object.entries(d.socials).filter(([, v]) => v && v.trim())),
      medium: d.medium,
      mediumCategory: d.mediumCategory || categorizeMedium(`${d.mediumCategory} ${d.medium}`),
      description: d.description,
      bio: d.bio || null,
      shareBooth: d.shareBooth,
      shareBoothWith: d.shareBooth ? d.shareBoothWith || null : null,
    })
    .returning({ id: applications.id });

  // Photos need the app id, so they can't batch with the insert above. If they
  // fail, roll back the application so we never leave a photoless orphan.
  try {
    await db.insert(applicationPhotos).values(
      d.photoUrls.map((url, i) => ({ applicationId: app.id, url, position: i })),
    );
  } catch (e) {
    await db.delete(applications).where(eq(applications.id, app.id));
    console.error("[apply] photo insert failed, rolled back application:", e);
    return NextResponse.json({ error: "Something went wrong saving your photos. Please try again." }, { status: 500 });
  }

  // Best-effort confirmation email — never block submission on it.
  await sendApplicationReceived(d.email, d.name);

  return NextResponse.json({ ok: true, id: app.id });
}
