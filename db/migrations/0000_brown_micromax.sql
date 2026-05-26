CREATE TABLE "config" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "generation_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticker" text NOT NULL,
	"ip_hash" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"duration_ms" integer,
	"cache_hit" boolean DEFAULT false NOT NULL,
	"outcome" text NOT NULL,
	"error_message" text
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"ticker" text PRIMARY KEY NOT NULL,
	"payload" jsonb NOT NULL,
	"source_data" jsonb NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"status" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL
);
