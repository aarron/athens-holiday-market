CREATE TABLE "rate_limits" (
	"id" serial PRIMARY KEY NOT NULL,
	"bucket" text NOT NULL,
	"key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "rate_limits_lookup_idx" ON "rate_limits" USING btree ("bucket","key","created_at");