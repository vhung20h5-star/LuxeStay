import type { PropertyAvailabilityOverride } from "@luxestay/contracts";

export interface ApiAvailabilityRepository {
  listOverrides(
    propertyId: string,
    range?: { from?: string; to?: string }
  ): Promise<readonly PropertyAvailabilityOverride[]>;
  upsertOverride(
    override: PropertyAvailabilityOverride
  ): Promise<PropertyAvailabilityOverride>;
}

export function createInMemoryAvailabilityRepository(
  initialOverrides: readonly PropertyAvailabilityOverride[] = []
): ApiAvailabilityRepository {
  // Key: `${propertyId}::${date}`
  const store = new Map<string, PropertyAvailabilityOverride>();
  for (const item of initialOverrides) {
    store.set(`${item.propertyId}::${item.date}`, Object.freeze({ ...item }));
  }

  return {
    async listOverrides(propertyId, range) {
      const normalized = propertyId.trim();
      const matching: PropertyAvailabilityOverride[] = [];
      for (const item of store.values()) {
        if (item.propertyId !== normalized) continue;
        if (range?.from && item.date < range.from) continue;
        if (range?.to && item.date > range.to) continue;
        matching.push(item);
      }
      matching.sort((a, b) => a.date.localeCompare(b.date));
      return Object.freeze(matching);
    },

    async upsertOverride(override) {
      const normalized: PropertyAvailabilityOverride = Object.freeze({
        ...override,
        propertyId: override.propertyId.trim(),
        date: override.date.trim(),
        updatedAt: override.updatedAt ?? new Date().toISOString(),
      });
      store.set(`${normalized.propertyId}::${normalized.date}`, normalized);
      return normalized;
    },
  };
}
