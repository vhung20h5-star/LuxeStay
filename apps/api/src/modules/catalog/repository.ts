import type { CatalogSnapshot, Property, PropertyReview } from "@luxestay/contracts";
import { SEED_CATALOG_SNAPSHOT } from "@luxestay/domain/seed";

export interface ApiCatalogRepository {
  getSnapshot(): Promise<CatalogSnapshot>;
  getPropertyById(id: string): Promise<Property | null>;
  createProperty(property: Property): Promise<Property>;
  updateProperty(
    propertyId: string,
    updater: (existing: Property) => Property
  ): Promise<Property | null>;
  deleteProperty(propertyId: string): Promise<boolean>;
}

export interface InMemoryCatalogRepository extends ApiCatalogRepository {
  applyVerifiedReview(
    propertyId: string,
    review: PropertyReview,
    rating: number,
    reviewCount: number
  ): Property | null;
}

export function createSeedCatalogRepository(
  snapshot: CatalogSnapshot = SEED_CATALOG_SNAPSHOT
): InMemoryCatalogRepository {
  // Clone property shells per repository instance so tests and in-memory mutations stay isolated
  const properties = snapshot.properties.map((prop) => ({
    ...prop,
    resortAmenities: prop.resortAmenities.map((a) => ({ ...a })),
    reviews: [...prop.reviews],
  }));

  return {
    async getSnapshot() {
      return {
        ...snapshot,
        properties: properties.map((p) => ({
          ...p,
          reviews: [...p.reviews],
        })),
      };
    },
    async getPropertyById(id: string) {
      const normalized = id.trim();
      const found = properties.find((property) => property.id === normalized);
      return found ? { ...found, reviews: [...found.reviews] } : null;
    },
    async createProperty(property: Property) {
      const cloned: Property = {
        ...property,
        resortAmenities: property.resortAmenities.map((a) => ({ ...a })),
        reviews: [...property.reviews],
      };
      properties.unshift(cloned);
      return { ...cloned, reviews: [...cloned.reviews] };
    },
    async updateProperty(propertyId, updater) {
      const idx = properties.findIndex((p) => p.id === propertyId.trim());
      if (idx === -1) return null;
      const updated = updater({
        ...properties[idx],
        reviews: [...properties[idx].reviews],
      });
      properties[idx] = {
        ...updated,
        resortAmenities: updated.resortAmenities.map((a) => ({ ...a })),
        reviews: [...updated.reviews],
      };
      return { ...properties[idx], reviews: [...properties[idx].reviews] };
    },
    async deleteProperty(propertyId) {
      const idx = properties.findIndex((p) => p.id === propertyId.trim());
      if (idx === -1) return false;
      properties.splice(idx, 1);
      return true;
    },
    applyVerifiedReview(propertyId, review, rating, reviewCount) {
      const idx = properties.findIndex((p) => p.id === propertyId);
      if (idx === -1) return null;
      const existing = properties[idx];
      const updated: Property = {
        ...existing,
        rating,
        reviewCount,
        reviews: [review, ...existing.reviews],
      };
      properties[idx] = updated;
      return updated;
    },
  };
}
