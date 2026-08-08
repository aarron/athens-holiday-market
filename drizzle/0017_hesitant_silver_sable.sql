CREATE TYPE "public"."prospect_email_status" AS ENUM('sent', 'delivered', 'opened', 'clicked', 'bounced', 'complained', 'failed');--> statement-breakpoint
CREATE TYPE "public"."prospect_source" AS ENUM('import', 'auto_scout', 'manual');--> statement-breakpoint
CREATE TYPE "public"."prospect_status" AS ENUM('new', 'shortlisted', 'maybe', 'passed');--> statement-breakpoint
CREATE TABLE "prospect_batches" (
	"id" serial PRIMARY KEY NOT NULL,
	"cycle_id" integer NOT NULL,
	"source" "prospect_source" NOT NULL,
	"label" text NOT NULL,
	"status" text DEFAULT 'complete' NOT NULL,
	"params" jsonb,
	"stats" jsonb,
	"note" text,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "prospect_images" (
	"id" serial PRIMARY KEY NOT NULL,
	"prospect_id" integer NOT NULL,
	"source_url" text NOT NULL,
	"blob_url" text,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prospect_opt_outs" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prospects" (
	"id" serial PRIMARY KEY NOT NULL,
	"cycle_id" integer NOT NULL,
	"batch_id" integer,
	"source" "prospect_source" DEFAULT 'import' NOT NULL,
	"name" text NOT NULL,
	"medium" text,
	"category" text,
	"city" text,
	"state" text,
	"region" text,
	"website" text,
	"instagram" text,
	"email" text,
	"contact" text,
	"description" text,
	"notes" text,
	"found_via" text,
	"status" "prospect_status" DEFAULT 'new' NOT NULL,
	"triaged_at" timestamp with time zone,
	"triaged_by" text,
	"dedupe_key" text NOT NULL,
	"invited_at" timestamp with time zone,
	"invited_resend_id" text,
	"invite_email_status" "prospect_email_status",
	"invite_token" text,
	"applied_application_id" integer,
	"raw" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "prospects_invite_token_unique" UNIQUE("invite_token")
);
--> statement-breakpoint
ALTER TABLE "prospect_batches" ADD CONSTRAINT "prospect_batches_cycle_id_cycles_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."cycles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospect_images" ADD CONSTRAINT "prospect_images_prospect_id_prospects_id_fk" FOREIGN KEY ("prospect_id") REFERENCES "public"."prospects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospects" ADD CONSTRAINT "prospects_cycle_id_cycles_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."cycles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospects" ADD CONSTRAINT "prospects_batch_id_prospect_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."prospect_batches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospects" ADD CONSTRAINT "prospects_applied_application_id_applications_id_fk" FOREIGN KEY ("applied_application_id") REFERENCES "public"."applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "prospect_images_prospect_idx" ON "prospect_images" USING btree ("prospect_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "prospect_opt_outs_email_idx" ON "prospect_opt_outs" USING btree (lower("email"));--> statement-breakpoint
CREATE UNIQUE INDEX "prospects_cycle_dedupe_idx" ON "prospects" USING btree ("cycle_id","dedupe_key");--> statement-breakpoint
CREATE INDEX "prospects_cycle_status_idx" ON "prospects" USING btree ("cycle_id","status");--> statement-breakpoint
CREATE INDEX "prospects_lower_email_idx" ON "prospects" USING btree (lower("email"));