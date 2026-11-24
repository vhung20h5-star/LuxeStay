ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "role" text DEFAULT 'guest' NOT NULL;
--> statement-breakpoint
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "owner_user_id" text REFERENCES "users"("id") ON DELETE set null;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "properties_owner_user_id_idx" ON "properties" ("owner_user_id");
