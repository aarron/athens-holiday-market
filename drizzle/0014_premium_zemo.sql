CREATE TABLE "text_sends" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_token" text NOT NULL,
	"actor_email" text NOT NULL,
	"message" text NOT NULL,
	"recipient_count" integer DEFAULT 0 NOT NULL,
	"sent_count" integer DEFAULT 0 NOT NULL,
	"failed_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "text_sends_client_token_unique" UNIQUE("client_token")
);
