CREATE TABLE "login_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "login_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
ALTER TABLE "artists" ADD COLUMN "logo_url" text;--> statement-breakpoint
ALTER TABLE "artists" ADD COLUMN "pending_content" jsonb;--> statement-breakpoint
ALTER TABLE "artists" ADD COLUMN "submitted_at" timestamp with time zone;