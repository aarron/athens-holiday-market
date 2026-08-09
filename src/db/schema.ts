import {
  pgTable,
  pgEnum,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

/* ------------------------------------------------------------------ enums */

export const roleEnum = pgEnum("role", ["admin", "judge"]);

export const applicationStatusEnum = pgEnum("application_status", [
  "submitted",
  "under_review",
  "accepted",
  "waitlisted",
  "rejected",
]);

export const voteValueEnum = pgEnum("vote_value", ["yes", "maybe", "no"]);

export const subscriberStatusEnum = pgEnum("subscriber_status", [
  "pending",
  "subscribed",
  "unsubscribed",
]);

/* Artist scouting — prospects the market may invite to apply. */

/** Triage decision as an admin swipes through the prospect deck. Invite +
 *  funnel state live in separate columns so a shortlisted prospect keeps that
 *  label after being invited. */
export const prospectStatusEnum = pgEnum("prospect_status", [
  "new", // untriaged
  "shortlisted", // yes — worth inviting
  "maybe", // revisit
  "passed", // no
]);

/** How a prospect entered the pool. */
export const prospectSourceEnum = pgEnum("prospect_source", [
  "import", // seeded from the research spreadsheet
  "auto_scout", // found by the research agent
  "manual", // added by hand in the admin
]);

/** Delivery lifecycle of a prospect's invitation email, mirrored from the
 *  Resend webhook — same vocabulary as broadcast recipients. */
export const prospectEmailStatusEnum = pgEnum("prospect_email_status", [
  "sent",
  "delivered",
  "opened",
  "clicked",
  "bounced",
  "complained",
  "failed",
]);

/* ----------------------------------------------------------------- cycles */
/** One market season per year. Drives the apply window and event details. */
export const cycles = pgTable("cycles", {
  id: serial("id").primaryKey(),
  year: integer("year").notNull().unique(),
  name: text("name").notNull(), // e.g. "Big City Bread Holiday Market 2026"
  applicationsOpenAt: timestamp("applications_open_at", { withTimezone: true }),
  applicationsCloseAt: timestamp("applications_close_at", { withTimezone: true }),
  eventStartsAt: timestamp("event_starts_at", { withTimezone: true }),
  eventEndsAt: timestamp("event_ends_at", { withTimezone: true }),
  locationName: text("location_name").default("Big City Bread Cafe"),
  locationAddress: text("location_address").default("393 N Finley St, Athens, GA 30601"),
  decisionNotifyOn: text("decision_notify_on"), // human-facing "we'll notify by" date
  isActive: boolean("is_active").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ----------------------------------------------------------- applications */
export const applications = pgTable(
  "applications",
  {
    id: serial("id").primaryKey(),
    cycleId: integer("cycle_id")
      .notNull()
      .references(() => cycles.id, { onDelete: "cascade" }),
    status: applicationStatusEnum("status").notNull().default("submitted"),
    // Added directly by an admin (dropout replacement) or a judge who also
    // exhibits — i.e. never went through the public jury flow. Kept out of jury
    // stats/vote views, but still a real accepted artist + participation record.
    directAdd: boolean("direct_add").notNull().default(false),
    name: text("name").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),
    // Explicit consent to receive event-day SMS (captured on the application form).
    smsConsent: boolean("sms_consent").notNull().default(false),
    website: text("website"),
    medium: text("medium").notNull(),
    // Normalized canonical category (see lib/mediums.ts) for blend analysis.
    mediumCategory: text("medium_category"),
    description: text("description").notNull(),
    // Artist bio (about the person) — captured up front to seed the artist page.
    bio: text("bio"),
    // { instagram, facebook, tiktok, etsy, ... } — reference for judges.
    socials: jsonb("socials").$type<Record<string, string>>().default({}),
    shareBooth: boolean("share_booth").notNull().default(false),
    shareBoothWith: text("share_booth_with"),
    boothFeePaid: boolean("booth_fee_paid").notNull().default(false),
    boothFeePaidAt: timestamp("booth_fee_paid_at", { withTimezone: true }),
    // Decision-email tracking (batch send + Resend receipts).
    decisionGroup: text("decision_group"), // "accepted" | "waitlist"
    decisionResendId: text("decision_resend_id"),
    decisionEmailStatus: text("decision_email_status"), // sent|delivered|opened|bounced|failed
    decisionSentAt: timestamp("decision_sent_at", { withTimezone: true }),
    // Set when we nudge an accepted artist who hasn't built their page (once).
    pageReminderSentAt: timestamp("page_reminder_sent_at", { withTimezone: true }),
    // Set when we email the artist their ready-to-share social kit (once): fires
    // after they've built/submitted their page, or ~7 days post-decision.
    socialKitEmailSentAt: timestamp("social_kit_email_sent_at", { withTimezone: true }),
    // PayPal booth-fee invoicing.
    paypalInvoiceId: text("paypal_invoice_id"),
    paypalInvoiceUrl: text("paypal_invoice_url"), // payer-facing "view & pay" link
    boothFeeInvoicedAt: timestamp("booth_fee_invoiced_at", { withTimezone: true }),
    boothFeeReminderCount: integer("booth_fee_reminder_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("applications_cycle_email_idx").on(t.cycleId, t.email),
    index("applications_cycle_status_idx").on(t.cycleId, t.status),
    index("applications_decision_resend_idx").on(t.decisionResendId),
    index("applications_paypal_invoice_idx").on(t.paypalInvoiceId),
    index("applications_lower_email_idx").on(sql`lower(${t.email})`),
  ],
);

export const applicationPhotos = pgTable("application_photos", {
  id: serial("id").primaryKey(),
  applicationId: integer("application_id")
    .notNull()
    .references(() => applications.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  position: integer("position").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ------------------------------------------------------- users (allowlist) */
/** App-managed judges/admins. Auth is Google OAuth gated by this allowlist. */
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  image: text("image"),
  role: roleEnum("role").notNull().default("judge"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ------------------------------------------------------------------ votes */
export const votes = pgTable(
  "votes",
  {
    id: serial("id").primaryKey(),
    applicationId: integer("application_id")
      .notNull()
      .references(() => applications.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    value: voteValueEnum("value").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("votes_application_user_idx").on(t.applicationId, t.userId)],
);

/* --------------------------------------------------------------- comments */
export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  applicationId: integer("application_id")
    .notNull()
    .references(() => applications.id, { onDelete: "cascade" }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ------------------------------------------------- artists (public pages) */

/** An artist's self-submitted draft, held for admin review before going live. */
export type PendingArtistContent = {
  statement?: string;
  bio?: string;
  website?: string;
  socials?: Record<string, string>;
  logoUrl?: string | null;
  photoUrls?: string[];
};

export const artists = pgTable("artists", {
  id: serial("id").primaryKey(),
  applicationId: integer("application_id").references(() => applications.id, {
    onDelete: "set null",
  }),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  bio: text("bio"),
  // Artist statement (about the work) — separate from bio (about the person).
  statement: text("statement"),
  medium: text("medium"),
  website: text("website"),
  // { instagram, facebook, tiktok, etsy, ... }
  socials: jsonb("socials").$type<Record<string, string>>().default({}),
  logoUrl: text("logo_url"),
  published: boolean("published").notNull().default(false),
  featured: boolean("featured").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  // Artist's submitted-but-unreviewed edits; null when nothing is pending.
  pendingContent: jsonb("pending_content").$type<PendingArtistContent>(),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("artists_published_idx").on(t.published),
  index("artists_application_idx").on(t.applicationId),
]);

/* ---------------------------------------------------- login tokens (magic) */
export const loginTokens = pgTable("login_tokens", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const artistPhotos = pgTable("artist_photos", {
  id: serial("id").primaryKey(),
  artistId: integer("artist_id")
    .notNull()
    .references(() => artists.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  position: integer("position").notNull().default(0), // 0..5
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ------------------------------------------------------------ subscribers */
export const subscribers = pgTable("subscribers", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  isArtist: boolean("is_artist").notNull().default(false),
  status: subscriberStatusEnum("status").notNull().default("pending"),
  unsubscribeToken: text("unsubscribe_token").notNull().unique(),
  source: text("source").default("website"), // website | mailchimp | admin
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
});

/* -------------------------------------------------------- contact messages */
export const contactMessages = pgTable("contact_messages", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  message: text("message").notNull(),
  ip: text("ip"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ------------------------------------------------------------- broadcasts */
export const broadcastSegmentEnum = pgEnum("broadcast_segment", [
  "all",
  "subscribed",
  "artists",
  "non_artists",
  // Status-based (this year's applications, resolved against the active cycle).
  "accepted",
  "waitlisted",
  "applicants",
]);
export const broadcastStatusEnum = pgEnum("broadcast_status", [
  "draft",
  "scheduled",
  "sending",
  "sent",
]);

export const broadcasts = pgTable("broadcasts", {
  id: serial("id").primaryKey(),
  // Internal label for bookkeeping (e.g. "2026 Acceptance email") — the same
  // emails go out each year, so a name keeps them straight. Falls back to subject.
  name: text("name"),
  subject: text("subject").notNull(),
  body: text("body").notNull(), // admin-authored markdown-ish source
  segment: broadcastSegmentEnum("segment").notNull().default("subscribed"),
  status: broadcastStatusEnum("status").notNull().default("draft"),
  recipientCount: integer("recipient_count").notNull().default(0),
  // Set when the admin schedules instead of sending now; the daily cron sends
  // any scheduled broadcast whose time has passed.
  scheduledFor: timestamp("scheduled_for", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  sentAt: timestamp("sent_at", { withTimezone: true }),
});

export const broadcastRecipients = pgTable(
  "broadcast_recipients",
  {
    id: serial("id").primaryKey(),
    broadcastId: integer("broadcast_id")
      .notNull()
      .references(() => broadcasts.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    resendId: text("resend_id"),
    // sent | delivered | opened | clicked | bounced | complained
    status: text("status").notNull().default("sent"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("broadcast_recipients_resend_idx").on(t.resendId),
    index("broadcast_recipients_lower_email_idx").on(sql`lower(${t.email})`),
  ],
);

export const broadcastsRelations = relations(broadcasts, ({ many }) => ({
  recipients: many(broadcastRecipients),
}));
export const broadcastRecipientsRelations = relations(broadcastRecipients, ({ one }) => ({
  broadcast: one(broadcasts, {
    fields: [broadcastRecipients.broadcastId],
    references: [broadcasts.id],
  }),
}));

/* --------------------------------------------------------------- settings */
export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ------------------------------------------------------------ rate limits */
/** Per-IP (or ip+email) request buckets for throttling unauthenticated
 *  endpoints. Rows older than their window are ignored and periodically pruned. */
export const rateLimits = pgTable(
  "rate_limits",
  {
    id: serial("id").primaryKey(),
    bucket: text("bucket").notNull(), // "proofread" | "apply-upload" | "magic-link"
    key: text("key").notNull(), // ip, or `${ip}|${email}`
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("rate_limits_lookup_idx").on(t.bucket, t.key, t.createdAt)],
);

/* -------------------------------------------------------------- text sends */
/** One row per event-day SMS blast — the persistent record for audit + an
 *  idempotency claim (unique clientToken) so a double-submit can't re-blast. */
export const textSends = pgTable("text_sends", {
  id: serial("id").primaryKey(),
  clientToken: text("client_token").notNull().unique(),
  actorEmail: text("actor_email").notNull(),
  message: text("message").notNull(),
  recipientCount: integer("recipient_count").notNull().default(0),
  sentCount: integer("sent_count").notNull().default(0),
  failedCount: integer("failed_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ----------------------------------------------------------- admin events */
/** Append-only audit log of outward/irreversible admin actions — who did what,
 *  to which target, and when. Never updated or deleted. */
export const adminEvents = pgTable(
  "admin_events",
  {
    id: serial("id").primaryKey(),
    actorEmail: text("actor_email").notNull(),
    action: text("action").notNull(), // e.g. "decision.send", "sms.send", "status.change"
    targetType: text("target_type"), // "application" | "artist" | "broadcast" | "cycle" | …
    targetId: integer("target_id"),
    summary: text("summary").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("admin_events_created_idx").on(t.createdAt)],
);

/* --------------------------------------------------------- prospect batches */
/** One research run or import. Auto-scout jobs are queued here and processed by
 *  the research cron; imports land as a single "complete" batch. */
export const prospectBatches = pgTable("prospect_batches", {
  id: serial("id").primaryKey(),
  cycleId: integer("cycle_id")
    .notNull()
    .references(() => cycles.id),
  source: prospectSourceEnum("source").notNull(),
  label: text("label").notNull(), // e.g. "Spreadsheet import — Aug 2026"
  status: text("status").notNull().default("complete"), // queued | running | complete | failed
  params: jsonb("params"), // research params: { regions, mediums, targetCount, sources }
  stats: jsonb("stats"), // { found, added, skipped }
  note: text("note"),
  createdBy: text("created_by"), // actor email
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

/* --------------------------------------------------------------- prospects */
/** A potential artist to invite. Admin-only — never exposed publicly, since the
 *  research (images, notes, contact) is scraped, not artist-submitted. */
export const prospects = pgTable(
  "prospects",
  {
    id: serial("id").primaryKey(),
    cycleId: integer("cycle_id")
      .notNull()
      .references(() => cycles.id),
    batchId: integer("batch_id").references(() => prospectBatches.id),
    source: prospectSourceEnum("source").notNull().default("import"),
    name: text("name").notNull(),
    medium: text("medium"),
    category: text("category"), // categorizeMedium() bucket
    city: text("city"),
    state: text("state"),
    region: text("region"),
    website: text("website"),
    instagram: text("instagram"),
    email: text("email"),
    contact: text("contact"), // raw contact string from research (may be a form URL, etc.)
    description: text("description"), // short blurb for the deck
    notes: text("notes"), // research notes
    foundVia: text("found_via"), // sourcing hub / how it was found
    status: prospectStatusEnum("status").notNull().default("new"),
    triagedAt: timestamp("triaged_at", { withTimezone: true }),
    triagedBy: text("triaged_by"),
    // Dedupe within a cycle so re-imports and auto-scout don't create twins.
    dedupeKey: text("dedupe_key").notNull(),
    // Invitation tracking.
    invitedAt: timestamp("invited_at", { withTimezone: true }),
    invitedResendId: text("invited_resend_id"),
    inviteEmailStatus: prospectEmailStatusEnum("invite_email_status"),
    inviteToken: text("invite_token").unique(), // opt-out + tracking link
    // Funnel: set when this prospect's email later shows up as an application.
    appliedApplicationId: integer("applied_application_id").references(() => applications.id),
    raw: jsonb("raw"), // original import row / research payload
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("prospects_cycle_dedupe_idx").on(t.cycleId, t.dedupeKey),
    index("prospects_cycle_status_idx").on(t.cycleId, t.status),
    index("prospects_lower_email_idx").on(sql`lower(${t.email})`),
  ],
);

/* ---------------------------------------------------------- prospect images */
/** Reference images for a prospect. `sourceUrl` is the scraped origin; `blobUrl`
 *  is our cached copy (populated by the image-cache pass) so the deck never
 *  stutters on a broken hotlink. */
export const prospectImages = pgTable(
  "prospect_images",
  {
    id: serial("id").primaryKey(),
    prospectId: integer("prospect_id")
      .notNull()
      .references(() => prospects.id, { onDelete: "cascade" }),
    sourceUrl: text("source_url").notNull(),
    blobUrl: text("blob_url"),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("prospect_images_prospect_idx").on(t.prospectId, t.position)],
);

/* ------------------------------------------------------- prospect opt-outs */
/** Suppression list for cold outreach: an email here is never invited again,
 *  independent of the subscriber list. Populated by the invite opt-out link. */
export const prospectOptOuts = pgTable(
  "prospect_opt_outs",
  {
    id: serial("id").primaryKey(),
    email: text("email").notNull(), // stored lowercased
    reason: text("reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("prospect_opt_outs_email_idx").on(sql`lower(${t.email})`)],
);

/* -------------------------------------------------------------- relations */
export const cyclesRelations = relations(cycles, ({ many }) => ({
  applications: many(applications),
}));

export const prospectBatchesRelations = relations(prospectBatches, ({ one, many }) => ({
  cycle: one(cycles, { fields: [prospectBatches.cycleId], references: [cycles.id] }),
  prospects: many(prospects),
}));

export const prospectsRelations = relations(prospects, ({ one, many }) => ({
  cycle: one(cycles, { fields: [prospects.cycleId], references: [cycles.id] }),
  batch: one(prospectBatches, { fields: [prospects.batchId], references: [prospectBatches.id] }),
  images: many(prospectImages),
}));

export const prospectImagesRelations = relations(prospectImages, ({ one }) => ({
  prospect: one(prospects, { fields: [prospectImages.prospectId], references: [prospects.id] }),
}));

export const applicationsRelations = relations(applications, ({ one, many }) => ({
  cycle: one(cycles, { fields: [applications.cycleId], references: [cycles.id] }),
  photos: many(applicationPhotos),
  votes: many(votes),
  comments: many(comments),
}));

export const applicationPhotosRelations = relations(applicationPhotos, ({ one }) => ({
  application: one(applications, {
    fields: [applicationPhotos.applicationId],
    references: [applications.id],
  }),
}));

export const votesRelations = relations(votes, ({ one }) => ({
  application: one(applications, {
    fields: [votes.applicationId],
    references: [applications.id],
  }),
  user: one(users, { fields: [votes.userId], references: [users.id] }),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  application: one(applications, {
    fields: [comments.applicationId],
    references: [applications.id],
  }),
  user: one(users, { fields: [comments.userId], references: [users.id] }),
}));

export const artistsRelations = relations(artists, ({ one, many }) => ({
  application: one(applications, {
    fields: [artists.applicationId],
    references: [applications.id],
  }),
  photos: many(artistPhotos),
}));

export const artistPhotosRelations = relations(artistPhotos, ({ one }) => ({
  artist: one(artists, { fields: [artistPhotos.artistId], references: [artists.id] }),
}));
