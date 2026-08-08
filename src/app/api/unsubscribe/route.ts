import { NextRequest, NextResponse } from "next/server";
import { unsubscribeByToken } from "@/lib/unsubscribe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// One-click unsubscribe (RFC 8058) — mail clients POST here.
export async function POST(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ?? "";
  await unsubscribeByToken(token);
  return NextResponse.json({ ok: true });
}

// Fallback GET must NOT mutate — link prefetchers/scanners would silently
// unsubscribe people. Redirect to the confirm page; the confirm click POSTs.
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ?? "";
  return NextResponse.redirect(new URL(`/unsubscribe?token=${encodeURIComponent(token)}`, req.url));
}
