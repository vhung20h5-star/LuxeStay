ALTER TABLE "promotions" ADD COLUMN IF NOT EXISTS "title" text;
--> statement-breakpoint
ALTER TABLE "promotions" ADD COLUMN IF NOT EXISTS "subtitle" text;
--> statement-breakpoint
ALTER TABLE "promotions" ADD COLUMN IF NOT EXISTS "badge" text;
--> statement-breakpoint
ALTER TABLE "promotions" ADD COLUMN IF NOT EXISTS "icon_name" text;
--> statement-breakpoint
ALTER TABLE "promotions" ADD COLUMN IF NOT EXISTS "audience" text DEFAULT 'all' NOT NULL;
--> statement-breakpoint
ALTER TABLE "promotions" ADD COLUMN IF NOT EXISTS "new_user_only" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "promotions" ADD COLUMN IF NOT EXISTS "applicable_property_types" jsonb;
--> statement-breakpoint
ALTER TABLE "promotions" ADD COLUMN IF NOT EXISTS "applicable_categories" jsonb;
--> statement-breakpoint
ALTER TABLE "promotions" ADD COLUMN IF NOT EXISTS "terms" jsonb;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "promotion_campaigns" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"placement" text NOT NULL,
	"badge" text NOT NULL,
	"title" text NOT NULL,
	"subtitle" text NOT NULL,
	"highlight_text" text NOT NULL,
	"period_label" text NOT NULL,
	"image" text NOT NULL,
	"theme" text NOT NULL,
	"cta_label" text NOT NULL,
	"terms" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"voucher_codes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"target_filter" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"starts_at" text NOT NULL,
	"ends_at" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "promotion_campaigns_slug_unique" UNIQUE("slug")
);
