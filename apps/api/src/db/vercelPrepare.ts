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

    const { enrichedCount: enrichedActivities } = await enrichSeedActivitiesGalleryAndDetails(
      client.db
    );
    if (enrichedActivities > 0) {
      console.log(
        `[luxestay-api] Enriched ${enrichedActivities} seed travel activities with multi-photo gallery & Know Before You Go details.`
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

/**
 * Narrow, idempotent Phase 5C enrichment for existing seed activities on Neon/Postgres.
 * Upgrades single-image Phase 5/5B seed rows to 3-image galleries ONLY when the stored
 * array still matches the original single cover image, and fills empty Phase 5C
 * "Know Before You Go" columns without overwriting bookings or manual edits.
 */
export async function enrichSeedActivitiesGalleryAndDetails(
  db: LuxeStayDb
): Promise<{ enrichedCount: number }> {
  const seedById = new Map(TRAVEL_ACTIVITIES.map((activity) => [activity.id, activity]));
  const existingRows = await db
    .select({
      id: travelActivitiesTable.id,
      images: travelActivitiesTable.images,
      imageCaptions: travelActivitiesTable.imageCaptions,
      excluded: travelActivitiesTable.excluded,
      itinerary: travelActivitiesTable.itinerary,
      knowBeforeYouGo: travelActivitiesTable.knowBeforeYouGo,
      howToUse: travelActivitiesTable.howToUse,
      cancellationPolicy: travelActivitiesTable.cancellationPolicy,
      suitableFor: travelActivitiesTable.suitableFor,
      languages: travelActivitiesTable.languages,
      slots: travelActivitiesTable.slots,
    })
    .from(travelActivitiesTable);

  let enrichedCount = 0;

  await db.transaction(async (tx) => {
    for (const row of existingRows) {
      const seed = seedById.get(row.id);
      if (!seed) continue;

      const patch: Partial<typeof travelActivitiesTable.$inferInsert> = {};

      if (
        Array.isArray(row.images) &&
        row.images.length === 1 &&
        row.images[0] === seed.images[0] &&
        seed.images.length > 1
      ) {
        patch.images = [...seed.images];
      }

      if (
        (!row.imageCaptions || row.imageCaptions.length === 0) &&
        seed.imageCaptions &&
        seed.imageCaptions.length > 0
      ) {
        patch.imageCaptions = [...seed.imageCaptions];
      }

      if ((!row.excluded || row.excluded.length === 0) && seed.excluded.length > 0) {
        patch.excluded = [...seed.excluded];
      }

      if ((!row.itinerary || row.itinerary.length === 0) && seed.itinerary.length > 0) {
        patch.itinerary = seed.itinerary.map((step) => ({ ...step }));
      }

      if (
        (!row.knowBeforeYouGo || row.knowBeforeYouGo.length === 0) &&
        seed.knowBeforeYouGo.length > 0
      ) {
        patch.knowBeforeYouGo = seed.knowBeforeYouGo.map((item) => ({ ...item }));
      }

      if (!row.howToUse && seed.howToUse) {
        patch.howToUse = { ...seed.howToUse, steps: [...seed.howToUse.steps] };
      }

      if (!row.cancellationPolicy && seed.cancellationPolicy) {
        patch.cancellationPolicy = {
          ...seed.cancellationPolicy,
          rules: [...seed.cancellationPolicy.rules],
        };
      }

      if ((!row.suitableFor || row.suitableFor.length === 0) && seed.suitableFor.length > 0) {
        patch.suitableFor = [...seed.suitableFor];
      }

      if ((!row.languages || row.languages.length === 0) && seed.languages.length > 0) {
        patch.languages = [...seed.languages];
      }

      // Safely add standalone Business Lounge slot on act-33 when still on legacy 3-slot seed
      if (
        row.id === "act-33" &&
        Array.isArray(row.slots) &&
        row.slots.length === 3 &&
        !row.slots.some((s) => s.id === "slot-ft-lounge-only") &&
        seed.slots.some((s) => s.id === "slot-ft-lounge-only")
      ) {
        patch.slots = seed.slots.map((s) => ({ ...s }));
      }

      if (Object.keys(patch).length > 0) {
        await tx
          .update(travelActivitiesTable)
          .set(patch)
          .where(eq(travelActivitiesTable.id, row.id));
        enrichedCount += 1;
      }
    }
  });

  return { enrichedCount };
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
