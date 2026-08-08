"use server";

import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { applications, applicationPhotos, artists, cycles, users } from "@/db/schema";
import { requireAdmin, requireStaff, getSessionUser } from "@/lib/admin-auth";
import { acceptedApplicationIdForEmail, createMagicToken, ensureArtistForApplication } from "@/lib/magic";
import { sendArtistInvite, sendArtistReviewAlert } from "@/lib/emails";
import { publicEnv } from "@/lib/env";
import { categorizeMedium } from "@/lib/mediums";
import { site } from "@/lib/site";

async function activeCycle() {
  return db.query.cycles.findFirst({ where: eq(cycles.isActive, true) });
}

/**
 * Find (this cycle) or create a direct-add accepted application for an email.
 * `medium`/`description` are required columns, so the stub seeds them empty —
 * the invitee fills them in via the completion form.
 */
async function ensureDirectApplication(cycleId: number, name: string, emailLower: string) {
  const existing = await db.query.applications.findFirst({
    where: and(eq(applications.cycleId, cycleId), eq(sql`lower(${applications.email})`, emailLower)),
  });
  if (existing) return { app: existing, created: false as const };
  const [app] = await db
    .insert(applications)
    .values({
      cycleId,
      name,
      email: emailLower,
      status: "accepted",
      directAdd: true,
      medium: "",
      description: "",
    })
    .returning();
  return { app, created: true as const };
}

const addSchema = z.object({
  name: z.string().trim().min(1, "Add a name.").max(200),
  email: z.string().trim().toLowerCase().email("Enter a valid email."),
});

/**
 * Admin: add an artist who never applied (e.g. a last-minute dropout
 * replacement) and email them a magic link to complete their profile.
 */
export async function addDirectArtist(input: z.input<typeof addSchema>) {
  await requireAdmin();
  const parsed = addSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form." };

  const cycle = await activeCycle();
  if (!cycle) return { error: "No active market cycle." };

  const { name, email } = parsed.data;
  const { app, created } = await ensureDirectApplication(cycle.id, name, email);
  // Don't hijack a real juried applicant's row.
  if (!created && !app.directAdd) {
    return { error: "That email already has an application this year — open it from the list instead." };
  }

  const raw = await createMagicToken(email);
  await sendArtistInvite(email, name, `${publicEnv.siteUrl}/auth/verify?token=${raw}&next=/artist/finish`);
  revalidatePath("/admin/artists");
  return { ok: true, applicationId: app.id, resent: !created };
}

/**
 * Staff self-serve: "I'm exhibiting this year." Creates the current judge/admin
 * a direct-add application (no email needed — they're already signed in) and
 * the caller redirects them to the completion form.
 */
export async function startExhibiting() {
  const user = await requireStaff();
  const cycle = await activeCycle();
  if (!cycle) return { error: "No active market cycle." };
  const name = user.name || user.email.split("@")[0];
  await ensureDirectApplication(cycle.id, name, user.email.toLowerCase());
  revalidatePath("/artist/finish");
  return { ok: true };
}

const min = site.applications.minPhotos;
const max = site.applications.maxPhotos;

const completeSchema = z.object({
  name: z.string().trim().min(1).max(200),
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
  photoUrls: z.array(z.string().url()).min(min).max(max),
});

/**
 * Completion submit for an invited/exhibiting artist. Auth is by email (any
 * role), so a judge who exhibits can use it too. Updates their application in
 * place (no public-window gate) and alerts admins to review + publish.
 */
export async function completeArtistProfile(input: z.input<typeof completeSchema>) {
  const user = await getSessionUser();
  if (!user) return { error: "Please sign in again." };
  const applicationId = await acceptedApplicationIdForEmail(user.email);
  if (!applicationId) return { error: "We couldn't find your invitation. Ask an organizer to re-send it." };

  const parsed = completeSchema.safeParse(input);
  if (!parsed.success) return { error: "Please check the form and try again." };
  const d = parsed.data;

  await db
    .update(applications)
    .set({
      name: d.name,
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
      updatedAt: new Date(),
    })
    .where(eq(applications.id, applicationId));

  // Replace any prior photos with this submission's set.
  await db.delete(applicationPhotos).where(eq(applicationPhotos.applicationId, applicationId));
  await db
    .insert(applicationPhotos)
    .values(d.photoUrls.map((url, i) => ({ applicationId, url, position: i })));

  // Seed the artist draft from the application and mark it submitted, so it
  // lands in the same "Needs review" queue as a normal artist submission — the
  // admin approves it there to go live (review-first).
  const artist = await ensureArtistForApplication(applicationId);
  if (artist) {
    await db
      .update(artists)
      .set({
        pendingContent: {
          statement: d.description,
          bio: d.bio || "",
          website: d.website || "",
          socials: Object.fromEntries(Object.entries(d.socials).filter(([, v]) => v && v.trim())),
          logoUrl: null,
          photoUrls: d.photoUrls,
        },
        submittedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(artists.id, artist.id));
  }

  // Nudge admins to review + publish (mirrors the artist-portal review alert).
  const admins = await db.select({ email: users.email }).from(users).where(eq(users.role, "admin"));
  await sendArtistReviewAlert(admins.map((a) => a.email), d.name);

  revalidatePath("/admin/artists");
  revalidatePath(`/admin/applications/${applicationId}`);
  return { ok: true };
}
