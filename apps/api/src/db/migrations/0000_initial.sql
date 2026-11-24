CREATE TABLE IF NOT EXISTS "categories" (
	"id" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"icon_name" text NOT NULL,
	"description" text,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "destinations" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"province" text NOT NULL,
	"image" text NOT NULL,
	"properties_count" integer DEFAULT 0 NOT NULL,
	"tag" text NOT NULL,
	"popular_for" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "promotions" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"description" text NOT NULL,
	"tone" text NOT NULL,
	"expiry_label" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "promotions_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "testimonials" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"role" text NOT NULL,
	"avatar" text NOT NULL,
	"rating" real NOT NULL,
	"stay_name" text NOT NULL,
	"content" text NOT NULL,
	"trip_type" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "amenity_categories" (
	"id" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"short_label" text NOT NULL,
	"icon_name" text NOT NULL,
	"description" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "amenity_filter_options" (
	"key" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"icon_name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "amenity_catalog" (
	"id" text PRIMARY KEY NOT NULL,
	"category" text NOT NULL REFERENCES "amenity_categories"("id"),
	"name" text NOT NULL,
	"short_label" text NOT NULL,
	"icon_name" text NOT NULL,
	"description" text NOT NULL,
	"image" text NOT NULL,
	"hours" text NOT NULL,
	"location" text NOT NULL,
	"pricing_type" text NOT NULL,
	"price" integer,
	"price_unit" text,
	"notes" text,
	"filter_keys" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "properties" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"subtitle" text NOT NULL,
	"property_type" text NOT NULL,
	"category" text NOT NULL,
	"city" text NOT NULL,
	"province" text NOT NULL,
	"address" text NOT NULL,
	"distance_to_center" text NOT NULL,
	"images" jsonb NOT NULL,
	"price_per_night" integer NOT NULL,
	"original_price" integer,
	"rating" real NOT NULL,
	"review_count" integer DEFAULT 0 NOT NULL,
	"max_guests" integer NOT NULL,
	"bedrooms" integer NOT NULL,
	"beds" integer NOT NULL,
	"bathrooms" integer NOT NULL,
	"is_superhost" boolean DEFAULT false NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"is_flash_deal" boolean DEFAULT false NOT NULL,
	"free_cancellation" boolean DEFAULT false NOT NULL,
	"breakfast_included" boolean DEFAULT false NOT NULL,
	"description" text NOT NULL,
	"host_name" text NOT NULL,
	"host_avatar" text NOT NULL,
	"host_joined_date" text NOT NULL,
	"host_response_rate" text NOT NULL,
	"host_is_superhost" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "property_amenities" (
	"property_id" text NOT NULL REFERENCES "properties"("id") ON DELETE cascade,
	"amenity_id" text NOT NULL REFERENCES "amenity_catalog"("id") ON DELETE cascade,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"featured" boolean,
	"name" text,
	"short_label" text,
	"description" text,
	"image" text,
	"hours" text,
	"location" text,
	"pricing_type" text,
	"price" integer,
	"price_unit" text,
	"notes" text,
	CONSTRAINT "property_amenities_property_id_amenity_id_pk" PRIMARY KEY("property_id","amenity_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "reviews" (
	"id" text PRIMARY KEY NOT NULL,
	"property_id" text NOT NULL REFERENCES "properties"("id") ON DELETE cascade,
	"author_name" text NOT NULL,
	"author_avatar" text NOT NULL,
	"rating" real NOT NULL,
	"date" text NOT NULL,
	"comment" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "reservations" (
	"booking_id" text PRIMARY KEY NOT NULL,
	"property_id" text NOT NULL REFERENCES "properties"("id"),
	"status" text DEFAULT 'confirmed' NOT NULL,
	"check_in" text NOT NULL,
	"check_out" text NOT NULL,
	"nights" integer NOT NULL,
	"adults" integer NOT NULL,
	"children" integer DEFAULT 0 NOT NULL,
	"rooms" integer DEFAULT 1 NOT NULL,
	"base_price" integer NOT NULL,
	"nights_total" integer NOT NULL,
	"cleaning_fee" integer NOT NULL,
	"service_fee" integer DEFAULT 0 NOT NULL,
	"amenities_fee" integer DEFAULT 0 NOT NULL,
	"discount" integer DEFAULT 0 NOT NULL,
	"total" integer NOT NULL,
	"guest_full_name" text NOT NULL,
	"guest_email" text NOT NULL,
	"guest_phone" text NOT NULL,
	"guest_note" text,
	"payment_method" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"cancelled_at" timestamp with time zone,
	"cancellation_reason" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "reservation_amenities" (
	"booking_id" text NOT NULL REFERENCES "reservations"("booking_id") ON DELETE cascade,
	"amenity_id" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"pricing_type" text NOT NULL,
	"price" integer DEFAULT 0 NOT NULL,
	"price_unit" text,
	CONSTRAINT "reservation_amenities_booking_id_amenity_id_pk" PRIMARY KEY("booking_id","amenity_id")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reservations_property_id_idx" ON "reservations" USING btree ("property_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reservations_guest_email_idx" ON "reservations" USING btree ("guest_email");
