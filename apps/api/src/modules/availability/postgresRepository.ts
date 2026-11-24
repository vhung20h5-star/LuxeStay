import { and, asc, eq, gte, lte } from "drizzle-orm";
import type { PropertyAvailabilityOverride } from "@luxestay/contracts";
import type { LuxeStayDb } from "../../db/client.js";
import { propertyAvailabilityTable } from "../../db/schema/index.js";
import type { ApiAvailabilityRepository } from "./repository.js";

export type PropertyAvailabilityRow = typeof propertyAvailabilityTable.$inferSelect;

export function mapAvailabilityRowToDomain(
  row: PropertyAvailabilityRow
): PropertyAvailabilityOverride {
  return Object.freeze({
    propertyId: row.propertyId,
    date: row.date,
    isBlocked: row.isBlocked,
    ...(row.overridePrice !== null ? { overridePrice: row.overridePrice } : {}),
    ...(row.inventoryOverride !== null ? { inventoryOverride: row.inventoryOverride } : {}),
    ...(row.note !== null ? { note: row.note } : {}),
    updatedAt: row.updatedAt.toISOString(),
  });
}

export function createPostgresAvailabilityRepository(
  db: LuxeStayDb
): ApiAvailabilityRepository {
  return {
    async listOverrides(propertyId, range) {
      const normalized = propertyId.trim();
      if (!normalized) return Object.freeze([]);

      const conditions = [eq(propertyAvailabilityTable.propertyId, normalized)];
      if (range?.from) {
        conditions.push(gte(propertyAvailabilityTable.date, range.from));
      }
      if (range?.to) {
        conditions.push(lte(propertyAvailabilityTable.date, range.to));
      }

      const rows = await db
        .select()
        .from(propertyAvailabilityTable)
        .where(and(...conditions))
        .orderBy(asc(propertyAvailabilityTable.date));

      return Object.freeze(rows.map(mapAvailabilityRowToDomain));
    },

    async upsertOverride(override) {
      const now = override.updatedAt ? new Date(override.updatedAt) : new Date();
      const [row] = await db
        .insert(propertyAvailabilityTable)
        .values({
          propertyId: override.propertyId.trim(),
          date: override.date.trim(),
          isBlocked: Boolean(override.isBlocked),
          overridePrice: override.overridePrice ?? null,
          inventoryOverride: override.inventoryOverride ?? null,
          note: override.note ?? null,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [propertyAvailabilityTable.propertyId, propertyAvailabilityTable.date],
          set: {
            isBlocked: Boolean(override.isBlocked),
            overridePrice: override.overridePrice ?? null,
            inventoryOverride: override.inventoryOverride ?? null,
            note: override.note ?? null,
            updatedAt: now,
          },
        })
        .returning();

      return row ? mapAvailabilityRowToDomain(row) : Object.freeze({ ...override, updatedAt: now.toISOString() });
    },
  };
}
