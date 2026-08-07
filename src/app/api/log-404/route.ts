import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Records a not-found hit so broken links/paths can be found and fixed.
 * Logged to the server (visible in Vercel logs) — grep for "[404]".
 */
export async function POST(req: Request) {
  let body: { path?: string; referrer?: string } = {};
  try {
    body = await req.json();
  } catch {
    /* ignore malformed body */
  }
  const path = (body.path ?? "").slice(0, 400);
  const referrer = (body.referrer ?? "").slice(0, 400);
  console.error(`[404] path=${JSON.stringify(path)} referrer=${JSON.stringify(referrer || "(none)")}`);
  return NextResponse.json({ ok: true });
}
