import { NextResponse } from "next/server";
import { optOutByInviteToken } from "@/lib/prospect-optout";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** One-click List-Unsubscribe (RFC 8058): POST suppresses immediately. */
export async function POST(req: Request) {
  const token = new URL(req.url).searchParams.get("token") ?? "";
  await optOutByInviteToken(token);
  return NextResponse.json({ ok: true });
}

/** A GET (someone clicking the header link) just lands on the confirm page —
 *  never mutates, so link prefetchers can't opt people out. */
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token") ?? "";
  return NextResponse.redirect(
    new URL(`/invite-optout?token=${encodeURIComponent(token)}`, req.url),
  );
}
