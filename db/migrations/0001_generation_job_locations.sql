ALTER TABLE "generation_jobs" ADD COLUMN IF NOT EXISTS "visitor_country" text;
ALTER TABLE "generation_jobs" ADD COLUMN IF NOT EXISTS "visitor_region" text;
ALTER TABLE "generation_jobs" ADD COLUMN IF NOT EXISTS "visitor_city" text;
ALTER TABLE "generation_jobs" ADD COLUMN IF NOT EXISTS "visitor_timezone" text;
