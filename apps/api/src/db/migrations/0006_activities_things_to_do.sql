ALTER TABLE "travel_activities" ADD COLUMN IF NOT EXISTS "hub_section" text DEFAULT 'tours' NOT NULL;
--> statement-breakpoint
ALTER TABLE "travel_activities" ADD COLUMN IF NOT EXISTS "subcategory" text DEFAULT 'local-workshop' NOT NULL;
--> statement-breakpoint
ALTER TABLE "travel_activities" ADD COLUMN IF NOT EXISTS "attraction_details" jsonb;
--> statement-breakpoint
ALTER TABLE "travel_activities" ADD COLUMN IF NOT EXISTS "essential_details" jsonb;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "travel_activities_hub_section_idx" ON "travel_activities" USING btree ("hub_section");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "travel_activities_subcategory_idx" ON "travel_activities" USING btree ("subcategory");
--> statement-breakpoint
UPDATE "travel_activities" SET "hub_section" = 'essentials', "subcategory" = 'airport-transfer' WHERE "id" IN ('act-01', 'act-02', 'act-03', 'act-04') AND "category" = 'transfer';
--> statement-breakpoint
UPDATE "travel_activities" SET "hub_section" = 'tours', "subcategory" = 'mountain-nature' WHERE "id" IN ('act-05', 'act-07');
--> statement-breakpoint
UPDATE "travel_activities" SET "hub_section" = 'tours', "subcategory" = 'island-sea' WHERE "id" IN ('act-06', 'act-08', 'act-12');
--> statement-breakpoint
UPDATE "travel_activities" SET "hub_section" = 'tours', "subcategory" = 'local-workshop' WHERE "id" = 'act-09';
--> statement-breakpoint
UPDATE "travel_activities" SET "hub_section" = 'entertainment', "subcategory" = 'spa-wellness' WHERE "id" = 'act-10';
--> statement-breakpoint
UPDATE "travel_activities" SET "hub_section" = 'entertainment', "subcategory" = 'dining-cruise' WHERE "id" = 'act-11';
