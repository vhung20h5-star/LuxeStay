ALTER TABLE "promotions" ADD COLUMN IF NOT EXISTS "discount_type" text DEFAULT 'fixed' NOT NULL;
--> statement-breakpoint
ALTER TABLE "promotions" ADD COLUMN IF NOT EXISTS "discount_value" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "promotions" ADD COLUMN IF NOT EXISTS "min_order_total" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "promotions" ADD COLUMN IF NOT EXISTS "max_discount" integer;
--> statement-breakpoint
ALTER TABLE "promotions" ADD COLUMN IF NOT EXISTS "expires_at" text DEFAULT '2026-11-30T23:59:59.000Z' NOT NULL;
--> statement-breakpoint
ALTER TABLE "promotions" ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true NOT NULL;
--> statement-breakpoint
ALTER TABLE "promotions" ADD COLUMN IF NOT EXISTS "member_only" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"full_name" text NOT NULL,
	"avatar" text,
	"provider" text DEFAULT 'password' NOT NULL,
	"password_hash" text,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_sessions" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL REFERENCES "users"("id") ON DELETE cascade,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "otp_challenges" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"channel" text NOT NULL,
	"code_hash" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_favorites" (
	"user_id" text NOT NULL REFERENCES "users"("id") ON DELETE cascade,
	"property_id" text NOT NULL REFERENCES "properties"("id") ON DELETE cascade,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "user_favorites_user_id_property_id_pk" PRIMARY KEY("user_id","property_id")
);
--> statement-breakpoint
ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "user_id" text REFERENCES "users"("id") ON DELETE set null;
--> statement-breakpoint
ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "applied_promo_code" text;
--> statement-breakpoint
ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "payment_expires_at" timestamp with time zone;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "payment_transactions" (
	"transaction_id" text PRIMARY KEY NOT NULL,
	"booking_id" text NOT NULL REFERENCES "reservations"("booking_id") ON DELETE cascade,
	"provider" text NOT NULL,
	"amount" integer NOT NULL,
	"currency" text DEFAULT 'VND' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"checkout_url" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"paid_at" timestamp with time zone,
	"failure_reason" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "payment_webhook_events" (
	"event_id" text PRIMARY KEY NOT NULL,
	"provider" text NOT NULL,
	"transaction_id" text NOT NULL,
	"booking_id" text NOT NULL,
	"outcome" text NOT NULL,
	"processed_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notification_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"booking_id" text NOT NULL REFERENCES "reservations"("booking_id") ON DELETE cascade,
	"recipient_email" text NOT NULL,
	"channel" text DEFAULT 'email' NOT NULL,
	"type" text NOT NULL,
	"subject" text NOT NULL,
	"preview_text" text NOT NULL,
	"html_body" text NOT NULL,
	"status" text DEFAULT 'logged' NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_phone_idx" ON "users" USING btree ("phone");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_sessions_user_id_idx" ON "user_sessions" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "otp_challenges_identifier_idx" ON "otp_challenges" USING btree ("identifier");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reservations_user_id_idx" ON "reservations" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payment_transactions_booking_id_idx" ON "payment_transactions" USING btree ("booking_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notification_logs_booking_id_idx" ON "notification_logs" USING btree ("booking_id");
