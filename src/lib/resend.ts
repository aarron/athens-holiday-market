import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;

/** Shared Resend client. Null when unconfigured so callers can no-op in dev. */
export const resend = apiKey ? new Resend(apiKey) : null;

export const EMAIL_FROM =
  process.env.EMAIL_FROM ?? "Athens Holiday Market <hello@athensholidaymarket.com>";
