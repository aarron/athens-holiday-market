ALTER TABLE "applications" ADD COLUMN "decision_group" text;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "decision_resend_id" text;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "decision_email_status" text;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "decision_sent_at" timestamp with time zone;