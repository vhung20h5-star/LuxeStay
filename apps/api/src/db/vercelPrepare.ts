import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  PROMOTION_CAMPAIGNS,
  RETIRED_SEED_CAMPAIGN_IMAGES,
  RETIRED_SEED_DESTINATION_IMAGES,
  RETIRED_SEED_PROPERTY_IMAGES,
  SEED_CATALOG_SNAPSHOT,
  TRAVEL_ACTIVITIES,
} from "@luxestay/domain/seed";
import { and, eq, inArray } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { createDbClient, type LuxeStayDb } from "./client.js";
import {
  destinationsTable,
  promotionCampaignsTable,
  propertiesTable,
  travelActivitiesTable,
} from "./schema/index.js";
import {
  seedDatabase,
  seedPromotionsAndCampaigns,
  insertMissingSeedProperties,
  insertMissingSeedActivities,
} from "./seed.js";

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

  await db.transaction(async (tx) => {
    await seedPromotionsAndCampaigns(tx);
  });
  return { backfilled: true };
}

export async function backfillMissingSeedProperties(
  db: LuxeStayDb
): Promise<{ insertedCount: number }> {
  const existingRows = await db.select({ id: propertiesTable.id }).from(propertiesTable);
  const existingIds = new Set(existingRows.map((row) => row.id));

  const missingEntries = SEED_CATALOG_SNAPSHOT.properties
    .map((property, sortOrder) => ({ property, sortOrder }))
    .filter(({ property }) => !existingIds.has(property.id));

  if (missingEntries.length === 0) {
    return { insertedCount: 0 };
  }

  await db.transaction(async (tx) => {
    await insertMissingSeedProperties(tx, missingEntries);
  });

  return { insertedCount: missingEntries.length };
}

function sameStringArray(a: readonly string[] | null | undefined, b: readonly string[]): boolean {
  if (!Array.isArray(a) || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/**
 * Narrow conditional repair for retired/duplicated pre-Phase-4C seed images.
 * Updates a destination, campaign, or property image ONLY when its stored value
 * matches an exact retired seed snapshot — Host/Admin edits are never overwritten.
 */
export async function repairRetiredSeedImages(
  db: LuxeStayDb
): Promise<{
  updatedDestinations: number;
  updatedCampaigns: number;
  updatedProperties: number;
}> {
  const seedDestById = new Map(SEED_CATALOG_SNAPSHOT.destinations.map((d) => [d.id, d]));
  const seedCampaignById = new Map(PROMOTION_CAMPAIGNS.map((c) => [c.id, c]));
  const seedPropById = new Map(SEED_CATALOG_SNAPSHOT.properties.map((p) => [p.id, p]));

  const trackedPropIds = Object.keys(RETIRED_SEED_PROPERTY_IMAGES).filter((id) =>
    seedPropById.has(id)
  );

  let updatedDestinations = 0;
  let updatedCampaigns = 0;
  let updatedProperties = 0;

  await db.transaction(async (tx) => {
    for (const [destId, retiredUrls] of Object.entries(RETIRED_SEED_DESTINATION_IMAGES)) {
      const targetDest = seedDestById.get(destId);
      if (!targetDest || retiredUrls.length === 0) continue;
      const retiredCandidates = retiredUrls.filter((u) => u !== targetDest.image);
      if (retiredCandidates.length === 0) continue;

      const updated = await tx
        .update(destinationsTable)
        .set({ image: targetDest.image })
        .where(
          and(
            eq(destinationsTable.id, destId),
            inArray(destinationsTable.image, [...retiredCandidates])
          )
        )
        .returning({ id: destinationsTable.id });
      updatedDestinations += updated.length;
    }

    for (const [campId, retiredUrls] of Object.entries(RETIRED_SEED_CAMPAIGN_IMAGES)) {
      const targetCamp = seedCampaignById.get(campId);
      if (!targetCamp || retiredUrls.length === 0) continue;
      const retiredCandidates = retiredUrls.filter((u) => u !== targetCamp.image);
      if (retiredCandidates.length === 0) continue;

      const updated = await tx
        .update(promotionCampaignsTable)
        .set({ image: targetCamp.image })
        .where(
          and(
            eq(promotionCampaignsTable.id, campId),
            inArray(promotionCampaignsTable.image, [...retiredCandidates])
          )
        )
        .returning({ id: promotionCampaignsTable.id });
      updatedCampaigns += updated.length;
    }

    if (trackedPropIds.length > 0) {
      const existingProps = await tx
        .select({ id: propertiesTable.id, images: propertiesTable.images })
        .from(propertiesTable)
        .where(inArray(propertiesTable.id, trackedPropIds));

      for (const row of existingProps) {
        const targetProp = seedPropById.get(row.id);
        const retiredSets = RETIRED_SEED_PROPERTY_IMAGES[row.id];
        if (!targetProp || !retiredSets || retiredSets.length === 0) continue;
        if (sameStringArray(row.images, targetProp.images)) continue;

        const matchesRetired = retiredSets.some((retiredArr) =>
          sameStringArray(row.images, retiredArr)
        );
        if (!matchesRetired) continue;

        await tx
          .update(propertiesTable)
          .set({ images: targetProp.images })
          .where(eq(propertiesTable.id, row.id));
        updatedProperties += 1;
      }
    }
  });

  return { updatedDestinations, updatedCampaigns, updatedProperties };
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

    const { backfilled } = await backfillPromotionsIfNeeded(client.db);
    if (backfilled) {
      console.log("[luxestay-api] Backfilled promotions and promotion campaigns.");
    }

    const { insertedCount } = await backfillMissingSeedProperties(client.db);
    if (insertedCount > 0) {
      console.log(
        `[luxestay-api] Backfilled ${insertedCount} missing seed properties without overwriting existing rows.`
      );
    }

    const { insertedCount: insertedActivities } = await backfillMissingSeedActivities(client.db);
    if (insertedActivities > 0) {
      console.log(
        `[luxestay-api] Backfilled ${insertedActivities} missing seed travel activities without overwriting existing rows.`
      );
    }

    const repaired = await repairRetiredSeedImages(client.db);
    if (
      repaired.updatedDestinations > 0 ||
      repaired.updatedCampaigns > 0 ||
      repaired.updatedProperties > 0
    ) {
      console.log(
        `[luxestay-api] Repaired retired seed images (properties: ${repaired.updatedProperties}, destinations: ${repaired.updatedDestinations}, campaigns: ${repaired.updatedCampaigns}); host edits preserved.`
      );
    }

    console.log("[luxestay-api] Migrations up to date; existing properties preserved.");
    return { status: "migrated" };
  } finally {
    await client.close();
  }
}

export async function backfillMissingSeedActivities(
  db: LuxeStayDb
): Promise<{ insertedCount: number }> {
  const existingRows = await db
    .select({ id: travelActivitiesTable.id })
    .from(travelActivitiesTable);
  const existingIds = new Set(existingRows.map((row) => row.id));
  const missing = TRAVEL_ACTIVITIES.filter((activity) => !existingIds.has(activity.id));
  if (missing.length === 0) {
    return { insertedCount: 0 };
  }
  await db.transaction(async (tx) => {
    await insertMissingSeedActivities(tx, missing);
  });
  return { insertedCount: missing.length };
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
