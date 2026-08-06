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
import { relations } from "drizzle-orm";

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
    name: text("name").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),
    website: text("website"),
    medium: text("medium").notNull(),
    description: text("description").notNull(),
    shareBooth: boolean("share_booth").notNull().default(false),
    shareBoothWith: text("share_booth_with"),
    boothFeePaid: boolean("booth_fee_paid").notNull().default(false),
    boothFeePaidAt: timestamp("booth_fee_paid_at", { withTimezone: true }),
    // PayPal linkage (Phase 3)
    paypalInvoiceId: text("paypal_invoice_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("applications_cycle_email_idx").on(t.cycleId, t.email)],
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
});

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

/* --------------------------------------------------------------- settings */
export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/* -------------------------------------------------------------- relations */
export const cyclesRelations = relations(cycles, ({ many }) => ({
  applications: many(applications),
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
