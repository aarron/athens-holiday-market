import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { requireArtistAccess } from "@/lib/admin-auth";
import { isStaff } from "@/lib/roles";
import { completeArtistProfile } from "@/lib/exhibit-actions";
import { db } from "@/db";
import { applications } from "@/db/schema";
import { site } from "@/lib/site";
import { ApplicationForm } from "@/components/application-form";

export const metadata: Metadata = { title: "Complete your profile", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function ArtistFinishPage() {
  const { user, applicationId } = await requireArtistAccess();
  const app = await db.query.applications.findFirst({ where: eq(applications.id, applicationId) });
  const socials = (app?.socials as Record<string, string> | null) ?? {};

  const initialValues = {
    name: app?.name ?? user.name ?? "",
    email: app?.email ?? user.email,
    phone: app?.phone ?? "",
    website: app?.website ?? "",
    instagram: socials.instagram ?? "",
    facebook: socials.facebook ?? "",
    tiktok: socials.tiktok ?? "",
    medium: app?.medium ?? "",
    mediumCategory: app?.mediumCategory ?? "",
    description: app?.description ?? "",
    bio: app?.bio ?? "",
    shareBooth: (app?.shareBooth ? "yes" : "no") as "yes" | "no",
    shareBoothWith: app?.shareBoothWith ?? "",
    smsConsent: app?.smsConsent ?? false,
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold">Complete your artist profile</h1>
        <p className="mt-2 text-ink-soft">
          You&apos;ve been added to the {site.event.year} {site.name}. Tell us about your work and
          add photos — this becomes your public artist page
          {isStaff(user.role) ? ", published as soon as you submit." : " once an organizer reviews it."}
        </p>
      </div>
      <ApplicationForm mode="finish" initialValues={initialValues} onSubmit={completeArtistProfile} />
    </div>
  );
}
