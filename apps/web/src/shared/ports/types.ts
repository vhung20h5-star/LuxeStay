import type {
  BookingDetails,
  CatalogSnapshot,
  ReservationSubmitter,
} from "@luxestay/contracts";

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface StorageEventLike {
  key: string | null;
}

export interface StorageEventTargetLike {
  addEventListener(type: "storage", listener: (event: StorageEventLike) => void): void;
  removeEventListener(type: "storage", listener: (event: StorageEventLike) => void): void;
}

export interface FavoritesRepository {
  getSnapshot(): readonly string[];
  getServerSnapshot(): readonly string[];
  toggle(propertyId: string): readonly string[];
  setAll(propertyIds: readonly string[]): readonly string[];
  subscribe(listener: () => void): () => void;
}

export interface CatalogRepository {
  getSnapshot(options?: { signal?: AbortSignal }): Promise<CatalogSnapshot>;
}

export interface InMemoryReservationAdapter extends ReservationSubmitter {
  getSubmittedBookings(): readonly BookingDetails[];
}

export interface AppPorts {
  favorites: FavoritesRepository;
  reservations: ReservationSubmitter;
}
