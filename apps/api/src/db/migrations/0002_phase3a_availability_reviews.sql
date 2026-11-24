ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "inventory_count" integer DEFAULT 1 NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "property_availability" (
	"property_id" text NOT NULL REFERENCES "properties"("id") ON DELETE cascade,
	"date" text NOT NULL,
	"is_blocked" boolean DEFAULT false NOT NULL,
	"override_price" integer,
	"inventory_override" integer,
	"note" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "property_availability_property_id_date_pk" PRIMARY KEY("property_id","date")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "property_availability_date_idx" ON "property_availability" ("property_id", "date");
--> statement-breakpoint
ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "seasonal_surcharge" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "nightly_breakdown" jsonb;
--> statement-breakpoint
ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "completed_at" timestamp with time zone;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reservations_property_status_idx" ON "reservations" ("property_id", "status");
--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "booking_id" text;
--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "user_id" text;
--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "is_verified" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "reviews_booking_id_unique" ON "reviews" ("booking_id") WHERE "booking_id" IS NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reviews_property_id_idx" ON "reviews" ("property_id");
