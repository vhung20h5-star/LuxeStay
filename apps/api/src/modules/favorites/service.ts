import type { ApiCatalogRepository } from "../catalog/repository.js";
import type { ApiFavoritesRepository } from "./repository.js";

export interface FavoritesService {
  getFavorites(userId: string): Promise<readonly string[]>;
  syncFavorites(
    userId: string,
    propertyIds: readonly string[],
    mode: "merge" | "replace"
  ): Promise<readonly string[]>;
  toggleFavorite(
    userId: string,
    propertyId: string
  ): Promise<{ ok: true; propertyIds: readonly string[] } | { ok: false; message: string }>;
}

export function createFavoritesService(deps: {
  catalogRepository: ApiCatalogRepository;
  favoritesRepository: ApiFavoritesRepository;
}): FavoritesService {
  async function getValidPropertyIdSet(): Promise<Set<string>> {
    const snapshot = await deps.catalogRepository.getSnapshot();
    return new Set(snapshot.properties.map((p) => p.id));
  }

  return {
    async getFavorites(userId) {
      return deps.favoritesRepository.getByUserId(userId);
    },

    async syncFavorites(userId, propertyIds, mode) {
      const validIds = await getValidPropertyIdSet();
      const filtered = propertyIds.map((id) => id.trim()).filter((id) => validIds.has(id));
      if (mode === "replace") {
        return deps.favoritesRepository.replaceForUser(userId, filtered);
      }
      return deps.favoritesRepository.mergeForUser(userId, filtered);
    },

    async toggleFavorite(userId, propertyId) {
      const target = propertyId.trim();
      const validIds = await getValidPropertyIdSet();
      if (!validIds.has(target)) {
        return {
          ok: false,
          message: `Chỗ nghỉ "${target}" không tồn tại.`,
        };
      }
      const next = await deps.favoritesRepository.toggleForUser(userId, target);
      return { ok: true, propertyIds: next };
    },
  };
}
