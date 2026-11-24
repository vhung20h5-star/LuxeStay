import type { CatalogSnapshot, Property } from "@luxestay/contracts";
import { SEED_CATALOG_SNAPSHOT } from "@luxestay/domain/seed";

export interface ApiCatalogRepository {
  getSnapshot(): Promise<CatalogSnapshot>;
  getPropertyById(id: string): Promise<Property | null>;
}

export function createSeedCatalogRepository(
  snapshot: CatalogSnapshot = SEED_CATALOG_SNAPSHOT
): ApiCatalogRepository {
  return {
    async getSnapshot() {
      return snapshot;
    },
    async getPropertyById(id: string) {
      const normalized = id.trim();
      return snapshot.properties.find((property) => property.id === normalized) ?? null;
    },
  };
}
