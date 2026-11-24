import type { CatalogSnapshot, Property } from "@luxestay/contracts";
import type { ApiCatalogRepository } from "./repository.js";

export interface CatalogService {
  getCatalogSnapshot(): Promise<CatalogSnapshot>;
  getPropertyById(id: string): Promise<Property | null>;
}

export function createCatalogService(repository: ApiCatalogRepository): CatalogService {
  return {
    getCatalogSnapshot() {
      return repository.getSnapshot();
    },
    getPropertyById(id: string) {
      return repository.getPropertyById(id);
    },
  };
}
