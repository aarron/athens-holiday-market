import { NextRequest, NextResponse } from "next/server";
import { consumeMagicToken, resolveIdentity, ensureArtistForApplication } from "@/lib/magic";
import { createSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  const fail = (reason: string) =>
    NextResponse.redirect(new URL(`/admin/login?error=${reason}`, req.url));

  if (!token) return fail("invalid");

  const email = await consumeMagicToken(token);
  if (!email) return fail("expired");

  const identity = await resolveIdentity(email);
  if (!identity) return fail("noaccess");

  let artistId: number | undefined;
  if (identity.role === "artist" && identity.applicationId) {
    const artist = await ensureArtistForApplication(identity.applicationId);
    artistId = artist?.id;
  }

  await createSession({ email, role: identity.role, artistId });

  // Honor a safe internal `next` (e.g. invited artists → /artist/finish).
  // Only same-origin absolute paths are allowed, never external URLs.
  const next = req.nextUrl.searchParams.get("next");
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : null;
  const dest = safeNext ?? (identity.role === "artist" ? "/artist" : "/admin");
  return NextResponse.redirect(new URL(dest, req.url));
}
