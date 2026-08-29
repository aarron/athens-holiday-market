/**
 * Canonical SMS consent language, shared by the public opt-in form (what the
 * subscriber sees and checks) and the API that records the opt-in (what we log
 * they agreed to), so the two can never drift. Also the exact wording cited in
 * our Twilio A2P campaign message flow.
 */
export const SMS_CONSENT_TEXT =
  "Text me event-day updates about the Athens Holiday Market — load-in times, schedule, and weather. Msg & data rates may apply; reply STOP to opt out.";
