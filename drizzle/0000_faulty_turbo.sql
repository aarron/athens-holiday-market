CREATE TYPE "public"."application_status" AS ENUM('submitted', 'under_review', 'accepted', 'waitlisted', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('admin', 'judge');--> statement-breakpoint
CREATE TYPE "public"."subscriber_status" AS ENUM('pending', 'subscribed', 'unsubscribed');--> statement-breakpoint
CREATE TYPE "public"."vote_value" AS ENUM('yes', 'maybe', 'no');--> statement-breakpoint
CREATE TABLE "application_photos" (
	"id" serial PRIMARY KEY NOT NULL,
	"application_id" integer NOT NULL,
	"url" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "applications" (
	"id" serial PRIMARY KEY NOT NULL,
	"cycle_id" integer NOT NULL,
	"status" "application_status" DEFAULT 'submitted' NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"website" text,
	"medium" text NOT NULL,
	"description" text NOT NULL,
	"share_booth" boolean DEFAULT false NOT NULL,
	"share_booth_with" text,
	"booth_fee_paid" boolean DEFAULT false NOT NULL,
	"booth_fee_paid_at" timestamp with time zone,
	"paypal_invoice_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "artist_photos" (
	"id" serial PRIMARY KEY NOT NULL,
	"artist_id" integer NOT NULL,
	"url" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "artists" (
	"id" serial PRIMARY KEY NOT NULL,
	"application_id" integer,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"bio" text,
	"medium" text,
	"website" text,
	"socials" jsonb DEFAULT '{}'::jsonb,
	"published" boolean DEFAULT false NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "artists_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"application_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cycles" (
	"id" serial PRIMARY KEY NOT NULL,
	"year" integer NOT NULL,
	"name" text NOT NULL,
	"applications_open_at" timestamp with time zone,
	"applications_close_at" timestamp with time zone,
	"event_starts_at" timestamp with time zone,
	"event_ends_at" timestamp with time zone,
	"location_name" text DEFAULT 'Big City Bread Cafe',
	"location_address" text DEFAULT '393 N Finley St, Athens, GA 30601',
	"decision_notify_on" text,
	"is_active" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cycles_year_unique" UNIQUE("year")
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscribers" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"is_artist" boolean DEFAULT false NOT NULL,
	"status" "subscriber_status" DEFAULT 'pending' NOT NULL,
	"unsubscribe_token" text NOT NULL,
	"source" text DEFAULT 'website',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"confirmed_at" timestamp with time zone,
	CONSTRAINT "subscribers_email_unique" UNIQUE("email"),
	CONSTRAINT "subscribers_unsubscribe_token_unique" UNIQUE("unsubscribe_token")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"image" text,
	"role" "role" DEFAULT 'judge' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "votes" (
	"id" serial PRIMARY KEY NOT NULL,
	"application_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"value" "vote_value" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "application_photos" ADD CONSTRAINT "application_photos_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_cycle_id_cycles_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."cycles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artist_photos" ADD CONSTRAINT "artist_photos_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artists" ADD CONSTRAINT "artists_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "votes" ADD CONSTRAINT "votes_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "votes" ADD CONSTRAINT "votes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "applications_cycle_email_idx" ON "applications" USING btree ("cycle_id","email");--> statement-breakpoint
CREATE UNIQUE INDEX "votes_application_user_idx" ON "votes" USING btree ("application_id","user_id");