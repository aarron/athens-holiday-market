ALTER TABLE "applications" ADD COLUMN "medium_category" text;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "socials" jsonb DEFAULT '{}'::jsonb;