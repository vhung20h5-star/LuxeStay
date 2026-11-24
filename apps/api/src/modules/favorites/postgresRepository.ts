import { and, asc, eq } from "drizzle-orm";
import type { LuxeStayDb } from "../../db/client.js";
import { userFavoritesTable } from "../../db/schema/index.js";
import type { ApiFavoritesRepository } from "./repository.js";

function dedupe(ids: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of ids) {
    const trimmed = id.trim();
    if (trimmed && !seen.has(trimmed)) {
      seen.add(trimmed);
      out.push(trimmed);
    }
  }
  return out;
}

export function createPostgresFavoritesRepository(db: LuxeStayDb): ApiFavoritesRepository {
  return {
    async getByUserId(userId) {
      const rows = await db
        .select({ propertyId: userFavoritesTable.propertyId })
        .from(userFavoritesTable)
        .where(eq(userFavoritesTable.userId, userId))
        .orderBy(asc(userFavoritesTable.createdAt));
      return Object.freeze(rows.map((r) => r.propertyId));
    },

    async replaceForUser(userId, propertyIds) {
      const clean = dedupe(propertyIds);
      const now = new Date();
      await db.transaction(async (tx) => {
        await tx.delete(userFavoritesTable).where(eq(userFavoritesTable.userId, userId));
        if (clean.length > 0) {
          await tx
            .insert(userFavoritesTable)
            .values(clean.map((propertyId) => ({ userId, propertyId, createdAt: now })))
            .onConflictDoNothing();
        }
      });
      return this.getByUserId(userId);
    },

    async mergeForUser(userId, incomingIds) {
      const clean = dedupe(incomingIds);
      if (clean.length > 0) {
        const now = new Date();
        await db
          .insert(userFavoritesTable)
          .values(clean.map((propertyId) => ({ userId, propertyId, createdAt: now })))
          .onConflictDoNothing();
      }
      return this.getByUserId(userId);
    },

    async toggleForUser(userId, propertyId) {
      const target = propertyId.trim();
      const existing = await db
        .select({ propertyId: userFavoritesTable.propertyId })
        .from(userFavoritesTable)
        .where(
          and(
            eq(userFavoritesTable.userId, userId),
            eq(userFavoritesTable.propertyId, target)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        await db
          .delete(userFavoritesTable)
          .where(
            and(
              eq(userFavoritesTable.userId, userId),
              eq(userFavoritesTable.propertyId, target)
            )
          );
      } else {
        await db
          .insert(userFavoritesTable)
          .values({ userId, propertyId: target, createdAt: new Date() })
          .onConflictDoNothing();
      }
      return this.getByUserId(userId);
    },
  };
}
