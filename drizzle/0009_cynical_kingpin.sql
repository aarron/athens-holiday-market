ALTER TYPE "public"."broadcast_segment" ADD VALUE 'accepted';--> statement-breakpoint
ALTER TYPE "public"."broadcast_segment" ADD VALUE 'waitlisted';--> statement-breakpoint
ALTER TYPE "public"."broadcast_segment" ADD VALUE 'applicants';--> statement-breakpoint
ALTER TYPE "public"."broadcast_status" ADD VALUE 'scheduled' BEFORE 'sending';--> statement-breakpoint
ALTER TABLE "broadcasts" ADD COLUMN "scheduled_for" timestamp with time zone;