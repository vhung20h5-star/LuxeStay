-- Phase 5C (M18): Additive gallery captions & OTA "Know Before You Go" detail columns on travel_activities
ALTER TABLE "travel_activities" ADD COLUMN IF NOT EXISTS "image_captions" jsonb;
--> statement-breakpoint
ALTER TABLE "travel_activities" ADD COLUMN IF NOT EXISTS "excluded" jsonb DEFAULT '[]'::jsonb NOT NULL;
--> statement-breakpoint
ALTER TABLE "travel_activities" ADD COLUMN IF NOT EXISTS "itinerary" jsonb DEFAULT '[]'::jsonb NOT NULL;
--> statement-breakpoint
ALTER TABLE "travel_activities" ADD COLUMN IF NOT EXISTS "know_before_you_go" jsonb DEFAULT '[]'::jsonb NOT NULL;
--> statement-breakpoint
ALTER TABLE "travel_activities" ADD COLUMN IF NOT EXISTS "how_to_use" jsonb;
--> statement-breakpoint
ALTER TABLE "travel_activities" ADD COLUMN IF NOT EXISTS "cancellation_policy" jsonb;
--> statement-breakpoint
ALTER TABLE "travel_activities" ADD COLUMN IF NOT EXISTS "suitable_for" jsonb DEFAULT '[]'::jsonb NOT NULL;
--> statement-breakpoint
ALTER TABLE "travel_activities" ADD COLUMN IF NOT EXISTS "languages" jsonb DEFAULT '["Tiếng Việt","Tiếng Anh"]'::jsonb NOT NULL;
