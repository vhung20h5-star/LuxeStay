import path from "node:path";
import { fileURLToPath } from "node:url";
import { SEED_CATALOG_SNAPSHOT } from "@luxestay/domain/seed";
import { and, eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { createDbClient, type LuxeStayDb } from "./client.js";
import {
  destinationsTable,
  promotionCampaignsTable,
  propertiesTable,
} from "./schema/index.js";
import { seedDatabase, seedPromotionsAndCampaigns } from "./seed.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsFolder = path.resolve(__dirname, "migrations");

function resolveValidDatabaseUrl(
  rawEnv: Record<string, string | undefined>
): string | undefined {
  const candidates = [
    rawEnv.DATABASE_URL_UNPOOLED,
    rawEnv.POSTGRES_URL_NON_POOLING,
    rawEnv.DATABASE_URL,
  ];
  for (const candidate of candidates) {
    const trimmed = candidate?.trim();
    if (!trimmed || trimmed === "[SENSITIVE]") continue;
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol === "postgres:" || parsed.protocol === "postgresql:") {
        return trimmed;
      }
    } catch {
      // Ignore malformed candidate and try next
    }
  }
  return undefined;
}

export async function backfillPromotionsIfNeeded(
  db: LuxeStayDb
): Promise<{ backfilled: boolean }> {
  const existing = await db
    .select({ id: promotionCampaignsTable.id })
    .from(promotionCampaignsTable)
    .limit(1);

  if (existing.length > 0) {
    return { backfilled: false };
  }

  await seedPromotionsAndCampaigns(db);
  return { backfilled: true };
}

export async function prepareDatabaseIfConfigured(
  rawEnv: Record<string, string | undefined> = process.env
): Promise<{ status: "skipped" | "migrated" | "migrated_and_seeded" }> {
  const storageDriver = rawEnv.STORAGE_DRIVER?.trim();
  if (storageDriver !== "database") {
    console.log(
      `[luxestay-api] Skipping Neon prepare (STORAGE_DRIVER=${storageDriver || "memory"}).`
    );
    return { status: "skipped" };
  }

  const databaseUrl = resolveValidDatabaseUrl(rawEnv);
  if (!databaseUrl) {
    console.log("[luxestay-api] Skipping Neon prepare (no valid DATABASE_URL available).");
    return { status: "skipped" };
  }

  const client = createDbClient(databaseUrl);
  try {
    console.log(`[luxestay-api] Applying PostgreSQL migrations from ${migrationsFolder}...`);
    await migrate(client.db, { migrationsFolder });

    const existing = await client.db
      .select({ id: propertiesTable.id })
      .from(propertiesTable)
      .limit(1);

    if (existing.length === 0) {
      console.log("[luxestay-api] Database has no properties yet; running initial idempotent seed...");
      await seedDatabase(client.db);
      console.log("[luxestay-api] Migrations + initial seed completed.");
      return { status: "migrated_and_seeded" };
    }

    // Repair known retired upstream destination image URL without overwriting user/host catalog edits.
    const hoiAnSeed = SEED_CATALOG_SNAPSHOT.destinations.find((d) => d.id === "hoi-an");
    if (hoiAnSeed) {
      await client.db
        .update(destinationsTable)
        .set({ image: hoiAnSeed.image })
        .where(
          and(
            eq(destinationsTable.id, "hoi-an"),
            eq(
              destinationsTable.image,
              "https://images.unsplash.com/photo-1557750298-47962451bebb?auto=format&fit=crop&w=800&q=80"
            )
          )
        );
    }

    const { backfilled } = await backfillPromotionsIfNeeded(client.db);
    if (backfilled) {
      console.log("[luxestay-api] Backfilled promotions and promotion campaigns.");
    }

    console.log("[luxestay-api] Migrations up to date; properties already seeded (skipping overwrite).");
    return { status: "migrated" };
  } finally {
    await client.close();
  }
}

const currentFilePath = path.resolve(fileURLToPath(import.meta.url));
const entryFilePath = process.argv[1] ? path.resolve(process.argv[1]) : "";
const isDirectEntry =
  process.platform === "win32"
    ? currentFilePath.toLowerCase() === entryFilePath.toLowerCase()
    : currentFilePath === entryFilePath;

if (isDirectEntry) {
  prepareDatabaseIfConfigured().catch((err) => {
    console.error("[luxestay-api] Database prepare failed:", err);
    process.exit(1);
  });
}
