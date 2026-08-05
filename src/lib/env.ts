import { z } from "zod";

/**
 * Centralized, lenient environment access.
 * Empty strings are treated as "unset" so partially-configured environments
 * (e.g. before Neon is provisioned) never hard-fail the build.
 */
const optionalStr = z.preprocess((v) => (v === "" ? undefined : v), z.string().optional());

const serverSchema = z.object({
  DATABASE_URL: optionalStr,
  AUTH_SECRET: optionalStr,
  GOOGLE_CLIENT_ID: optionalStr,
  GOOGLE_CLIENT_SECRET: optionalStr,
  RESEND_API_KEY: optionalStr,
  BLOB_READ_WRITE_TOKEN: optionalStr,
  ADMIN_EMAILS: optionalStr,
  JUDGE_EMAILS: optionalStr,
  EMAIL_FROM: optionalStr,
});

const parsed = serverSchema.safeParse(process.env);
export const env = parsed.success
  ? parsed.data
  : (process.env as unknown as z.infer<typeof serverSchema>);

export const publicEnv = {
  siteUrl:
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000"),
};

function splitList(value?: string): string[] {
  return (value ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

/** Bootstrap allowlists, merged with DB-managed users at runtime. */
export const bootstrapAdmins = splitList(env.ADMIN_EMAILS);
export const bootstrapJudges = splitList(env.JUDGE_EMAILS);
