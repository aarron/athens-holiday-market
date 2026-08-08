import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { AppRole } from "@/lib/roles";

const COOKIE = "ahm_session";

/**
 * Signing key for session JWTs. Fails closed: in production a missing
 * `AUTH_SECRET` throws rather than silently falling back to a public literal
 * (this repo is public — a forgeable secret would let anyone mint an admin
 * session). A dev-only fallback keeps local work frictionless.
 */
let cachedSecret: Uint8Array | null = null;
function secretKey(): Uint8Array {
  if (cachedSecret) return cachedSecret;
  const raw = process.env.AUTH_SECRET;
  if (!raw) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("AUTH_SECRET is not set — refusing to sign or verify sessions in production.");
    }
    return (cachedSecret = new TextEncoder().encode("dev-insecure-secret-change-me-please"));
  }
  return (cachedSecret = new TextEncoder().encode(raw));
}

export type SessionPayload = {
  email: string;
  role: AppRole;
  name?: string;
  artistId?: number;
};

// Short-lived: authority is re-resolved from source each request (see
// getSessionUser), so the cookie only needs to carry identity briefly.
const MAX_AGE_DAYS = 7;

export async function createSession(payload: SessionPayload) {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_DAYS}d`)
    .sign(secretKey());

  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_DAYS * 86400,
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function destroySession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}
