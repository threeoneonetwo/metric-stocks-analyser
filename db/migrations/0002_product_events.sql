CREATE TABLE IF NOT EXISTS "product_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "event_name" text NOT NULL,
  "ticker" text,
  "ip_hash" text,
  "visitor_country" text,
  "visitor_region" text,
  "visitor_city" text,
  "visitor_timezone" text,
  "metadata" jsonb,
  "occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "product_events_occurred_at_idx" ON "product_events" ("occurred_at");
CREATE INDEX IF NOT EXISTS "product_events_event_name_idx" ON "product_events" ("event_name");
CREATE INDEX IF NOT EXISTS "product_events_ip_hash_idx" ON "product_events" ("ip_hash");
