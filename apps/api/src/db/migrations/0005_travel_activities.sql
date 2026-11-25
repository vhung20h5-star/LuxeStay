ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "activities_fee" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "travel_activities" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"subtitle" text NOT NULL,
	"category" text NOT NULL,
	"destination_city" text NOT NULL,
	"province" text NOT NULL,
	"meeting_point" text NOT NULL,
	"duration_label" text NOT NULL,
	"price_per_unit" integer NOT NULL,
	"unit_label" text NOT NULL,
	"original_price" integer,
	"rating" real DEFAULT 5 NOT NULL,
	"review_count" integer DEFAULT 0 NOT NULL,
	"images" jsonb NOT NULL,
	"highlights" jsonb NOT NULL,
	"included" jsonb NOT NULL,
	"free_cancellation" boolean DEFAULT true NOT NULL,
	"instant_confirmation" boolean DEFAULT true NOT NULL,
	"slots" jsonb NOT NULL,
	"transfer_details" jsonb,
	"is_featured" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "travel_activities_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "travel_activities_city_idx" ON "travel_activities" USING btree ("destination_city");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "travel_activities_category_idx" ON "travel_activities" USING btree ("category");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "activity_bookings" (
	"booking_id" text PRIMARY KEY NOT NULL,
	"activity_id" text NOT NULL REFERENCES "travel_activities"("id"),
	"user_id" text REFERENCES "users"("id") ON DELETE SET NULL,
	"linked_reservation_id" text,
	"activity_slug" text NOT NULL,
	"activity_title" text NOT NULL,
	"activity_category" text NOT NULL,
	"activity_image" text NOT NULL,
	"destination_city" text NOT NULL,
	"slot_id" text NOT NULL,
	"slot_label" text NOT NULL,
	"date_iso" text NOT NULL,
	"quantity" integer NOT NULL,
	"unit_label" text NOT NULL,
	"unit_price" integer NOT NULL,
	"subtotal" integer NOT NULL,
	"discount" integer DEFAULT 0 NOT NULL,
	"applied_promo_code" text,
	"total" integer NOT NULL,
	"guest_full_name" text NOT NULL,
	"guest_email" text NOT NULL,
	"guest_phone" text NOT NULL,
	"guest_note" text,
	"payment_method" text NOT NULL,
	"free_cancellation" boolean DEFAULT true NOT NULL,
	"status" text DEFAULT 'confirmed' NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"cancelled_at" timestamp with time zone,
	"cancellation_reason" text
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "activity_bookings_slot_idx" ON "activity_bookings" USING btree ("activity_id","slot_id","date_iso","status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "activity_bookings_user_id_idx" ON "activity_bookings" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "activity_bookings_guest_email_idx" ON "activity_bookings" USING btree ("guest_email");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "reservation_activities" (
	"id" text PRIMARY KEY NOT NULL,
	"booking_id" text NOT NULL REFERENCES "reservations"("booking_id") ON DELETE CASCADE,
	"activity_id" text NOT NULL REFERENCES "travel_activities"("id"),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"activity_slug" text NOT NULL,
	"activity_title" text NOT NULL,
	"activity_category" text NOT NULL,
	"slot_id" text NOT NULL,
	"slot_label" text NOT NULL,
	"date_iso" text NOT NULL,
	"quantity" integer NOT NULL,
	"unit_label" text NOT NULL,
	"unit_price" integer NOT NULL,
	"total_price" integer NOT NULL,
	"status" text DEFAULT 'confirmed' NOT NULL,
	"cancelled_at" timestamp with time zone,
	"cancellation_reason" text
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reservation_activities_booking_id_idx" ON "reservation_activities" USING btree ("booking_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reservation_activities_slot_idx" ON "reservation_activities" USING btree ("activity_id","slot_id","date_iso","status");
