ALTER TABLE "applications" ADD COLUMN "paypal_invoice_url" text;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "booth_fee_invoiced_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "booth_fee_reminder_count" integer DEFAULT 0 NOT NULL;