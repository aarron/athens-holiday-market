import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { applications, applicationPhotos, cycles } from "@/db/schema";
import { applicationWindow } from "@/lib/applications";
import { site } from "@/lib/site";
import { sendApplicationReceived } from "@/lib/emails";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().min(3).max(40),
  website: z.string().trim().max(300).optional().default(""),
  medium: z.string().trim().min(1).max(300),
  description: z.string().trim().min(1).max(5000),
  shareBooth: z.boolean(),
  shareBoothWith: z.string().trim().max(200).optional().default(""),
  photoUrls: z.array(z.string().url()).min(1).max(site.applications.maxPhotos),
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
      email: d.email.toLowerCase(),
      phone: d.phone,
      website: d.website || null,
      medium: d.medium,
      description: d.description,
      shareBooth: d.shareBooth,
      shareBoothWith: d.shareBooth ? d.shareBoothWith || null : null,
    })
    .returning({ id: applications.id });

  await db.insert(applicationPhotos).values(
    d.photoUrls.map((url, i) => ({ applicationId: app.id, url, position: i })),
  );

  // Best-effort confirmation email — never block submission on it.
  await sendApplicationReceived(d.email, d.name);

  return NextResponse.json({ ok: true, id: app.id });
}
