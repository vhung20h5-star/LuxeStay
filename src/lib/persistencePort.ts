import type {
  AppPorts,
  BookingDetails,
  FavoritesRepository,
  InMemoryReservationAdapter,
  ReservationSubmissionRequest,
  ReservationSubmitter,
  StorageEventLike,
  StorageEventTargetLike,
  StorageLike,
} from "@/types";

export const FAVORITES_STORAGE_KEY = "travel_favorites";
export const DEFAULT_FAVORITE_IDS: readonly string[] = Object.freeze(["stay-01", "stay-02"]);
const EMPTY_IDS: readonly string[] = Object.freeze([]);
const DEFAULT_RESERVATION_DELAY_MS = 1200;

function arraysEqual(a: readonly string[], b: readonly string[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function createAbortError(): Error {
  const error = new Error("Reservation submission aborted");
  error.name = "AbortError";
  return error;
}

function sanitizeDelayMs(delayMs: number): number {
  return Number.isFinite(delayMs) ? Math.max(0, Math.floor(delayMs)) : DEFAULT_RESERVATION_DELAY_MS;
}

function snapshotReservationRequest(
  request: ReservationSubmissionRequest
): ReservationSubmissionRequest {
  return {
    quote: {
      ...request.quote,
      guests: { ...request.quote.guests },
      pricing: { ...request.quote.pricing },
      selectedAmenities: request.quote.selectedAmenities.map((item) => ({ ...item })),
    },
    guestInfo: { ...request.guestInfo },
    paymentMethod: request.paymentMethod,
  };
}

function buildBookingDetails(
  request: ReservationSubmissionRequest,
  bookingId: string,
  createdAt: string
): BookingDetails {
  return Object.freeze({
    property: request.quote.property,
    checkIn: request.quote.checkIn,
    checkOut: request.quote.checkOut,
    nights: request.quote.nights,
    guests: Object.freeze({ ...request.quote.guests }),
    pricing: Object.freeze({ ...request.quote.pricing }),
    selectedAmenities: Object.freeze(
      request.quote.selectedAmenities.map((item) => Object.freeze({ ...item }))
    ),
    guestInfo: Object.freeze({ ...request.guestInfo }),
    paymentMethod: request.paymentMethod,
    bookingId,
    createdAt,
  });
}

export function sanitizeFavoriteIds(
  raw: unknown,
  validPropertyIds?: ReadonlySet<string>
): readonly string[] | null {
  if (!Array.isArray(raw)) return null;

  const seen = new Set<string>();
  const cleaned: string[] = [];

  for (const entry of raw) {
    if (typeof entry !== "string") continue;
    const normalized = entry.trim();
    if (!normalized) continue;
    if (validPropertyIds && !validPropertyIds.has(normalized)) continue;
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    cleaned.push(normalized);
  }

  return cleaned.length === 0 ? EMPTY_IDS : Object.freeze(cleaned);
}

export function toggleFavoriteId(
  current: readonly string[],
  propertyId: string,
  validPropertyIds?: ReadonlySet<string>
): readonly string[] {
  const normalized = propertyId.trim();
  if (!normalized) return current;

  if (current.includes(normalized)) {
    const next = current.filter((id) => id !== normalized);
    return next.length === 0 ? EMPTY_IDS : Object.freeze(next);
  }

  if (validPropertyIds && !validPropertyIds.has(normalized)) {
    return current;
  }

  return Object.freeze([...current, normalized]);
}

export interface BrowserFavoritesAdapterOptions {
  storage?: StorageLike;
  storageKey?: string;
  validPropertyIds?: ReadonlySet<string>;
  defaultIds?: readonly string[];
  eventTarget?: StorageEventTargetLike;
}

export function createBrowserFavoritesAdapter(
  options?: BrowserFavoritesAdapterOptions
): FavoritesRepository {
  const storageKey = options?.storageKey ?? FAVORITES_STORAGE_KEY;
  const validPropertyIds = options?.validPropertyIds;
  const sanitizedDefaults =
    sanitizeFavoriteIds(options?.defaultIds ?? DEFAULT_FAVORITE_IDS, validPropertyIds) ?? EMPTY_IDS;

  let hasLoaded = false;
  let lastRaw: string | null = null;
  let storageWriteFailed = false;
  let cachedSnapshot: readonly string[] = sanitizedDefaults;
  const listeners = new Set<() => void>();

  function resolveStorage(): StorageLike | null {
    if (options?.storage) return options.storage;
    if (typeof window === "undefined") return null;
    try {
      return window.localStorage ?? null;
    } catch {
      return null;
    }
  }

  function resolveEventTarget(): StorageEventTargetLike | null {
    if (options?.eventTarget) return options.eventTarget;
    if (typeof window === "undefined") return null;
    return window;
  }

  function notify() {
    for (const listener of [...listeners]) {
      listener();
    }
  }

  function readFromStorage(forceRefresh = false): readonly string[] {
    if (storageWriteFailed && !forceRefresh) {
      return cachedSnapshot;
    }

    const storage = resolveStorage();
    if (!storage) {
      return cachedSnapshot;
    }

    let raw: string | null;
    try {
      raw = storage.getItem(storageKey);
    } catch {
      return cachedSnapshot;
    }

    if (!forceRefresh && hasLoaded && raw === lastRaw) {
      return cachedSnapshot;
    }

    storageWriteFailed = false;
    hasLoaded = true;
    lastRaw = raw;

    if (raw === null) {
      if (!arraysEqual(cachedSnapshot, sanitizedDefaults)) {
        cachedSnapshot = sanitizedDefaults;
      }
      return cachedSnapshot;
    }

    try {
      const parsed: unknown = JSON.parse(raw);
      const sanitized = sanitizeFavoriteIds(parsed, validPropertyIds);
      const next = sanitized ?? sanitizedDefaults;
      if (!arraysEqual(cachedSnapshot, next)) {
        cachedSnapshot = next;
      }
      return cachedSnapshot;
    } catch {
      if (!arraysEqual(cachedSnapshot, sanitizedDefaults)) {
        cachedSnapshot = sanitizedDefaults;
      }
      return cachedSnapshot;
    }
  }

  function writeNext(next: readonly string[]): readonly string[] {
    const current = readFromStorage();
    if (arraysEqual(current, next)) {
      return current;
    }

    const frozen = Object.isFrozen(next) ? next : Object.freeze([...next]);
    const serialized = JSON.stringify(frozen);
    const storage = resolveStorage();
    if (storage) {
      try {
        storage.setItem(storageKey, serialized);
        storageWriteFailed = false;
        hasLoaded = true;
        lastRaw = serialized;
      } catch {
        storageWriteFailed = true;
        hasLoaded = false;
        lastRaw = null;
      }
    }

    cachedSnapshot = frozen;
    notify();
    return cachedSnapshot;
  }

  const onStorageEvent = (event: StorageEventLike) => {
    if (event.key !== null && event.key !== storageKey) return;
    const before = cachedSnapshot;
    const after = readFromStorage(true);
    if (before !== after) {
      notify();
    }
  };

  return {
    getSnapshot() {
      return readFromStorage();
    },
    getServerSnapshot() {
      return sanitizedDefaults;
    },
    toggle(propertyId: string) {
      const current = readFromStorage();
      const next = toggleFavoriteId(current, propertyId, validPropertyIds);
      return writeNext(next);
    },
    setAll(propertyIds: readonly string[]) {
      const sanitized = sanitizeFavoriteIds(propertyIds, validPropertyIds) ?? EMPTY_IDS;
      return writeNext(sanitized);
    },
    subscribe(listener: () => void) {
      const wasEmpty = listeners.size === 0;
      listeners.add(listener);
      if (wasEmpty) {
        resolveEventTarget()?.addEventListener("storage", onStorageEvent);
      }

      return () => {
        if (listeners.delete(listener) && listeners.size === 0) {
          resolveEventTarget()?.removeEventListener("storage", onStorageEvent);
        }
      };
    },
  };
}

export interface InMemoryFavoritesAdapterOptions {
  initialIds?: readonly string[];
  validPropertyIds?: ReadonlySet<string>;
}

export function createInMemoryFavoritesAdapter(
  options?: InMemoryFavoritesAdapterOptions
): FavoritesRepository {
  const validPropertyIds = options?.validPropertyIds;
  const initialSnapshot =
    sanitizeFavoriteIds(options?.initialIds ?? DEFAULT_FAVORITE_IDS, validPropertyIds) ?? EMPTY_IDS;

  let current: readonly string[] = initialSnapshot;
  const listeners = new Set<() => void>();

  function notify() {
    for (const listener of [...listeners]) {
      listener();
    }
  }

  return {
    getSnapshot() {
      return current;
    },
    getServerSnapshot() {
      return initialSnapshot;
    },
    toggle(propertyId: string) {
      const next = toggleFavoriteId(current, propertyId, validPropertyIds);
      if (arraysEqual(current, next)) return current;
      current = next;
      notify();
      return current;
    },
    setAll(propertyIds: readonly string[]) {
      const next = sanitizeFavoriteIds(propertyIds, validPropertyIds) ?? EMPTY_IDS;
      if (arraysEqual(current, next)) return current;
      current = next;
      notify();
      return current;
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

export function createBrowserReservationAdapter(
  delayMs = DEFAULT_RESERVATION_DELAY_MS
): ReservationSubmitter {
  const safeDelayMs = sanitizeDelayMs(delayMs);

  return {
    submit(request, options) {
      const signal = options?.signal;
      if (signal?.aborted) {
        return Promise.reject(createAbortError());
      }

      const capturedRequest = snapshotReservationRequest(request);

      return new Promise<BookingDetails>((resolve, reject) => {
        const onAbort = () => {
          clearTimeout(timerId);
          reject(createAbortError());
        };

        const timerId = setTimeout(() => {
          signal?.removeEventListener("abort", onAbort);
          const randomBookingId = `LX-${Math.floor(100000 + Math.random() * 900000)}`;
          resolve(buildBookingDetails(capturedRequest, randomBookingId, new Date().toISOString()));
        }, safeDelayMs);

        signal?.addEventListener("abort", onAbort, { once: true });
      });
    },
  };
}

export function createInMemoryReservationAdapter(overrides?: {
  bookingId?: string;
  createdAt?: string;
}): InMemoryReservationAdapter {
  const submitted: BookingDetails[] = [];

  return {
    async submit(request, options) {
      if (options?.signal?.aborted) {
        throw createAbortError();
      }
      const bookingId = overrides?.bookingId ?? "LX-TEST01";
      const createdAt = overrides?.createdAt ?? "2026-11-21T00:00:00.000Z";
      const details = buildBookingDetails(request, bookingId, createdAt);
      submitted.push(details);
      return details;
    },
    getSubmittedBookings() {
      return Object.freeze([...submitted]);
    },
  };
}

export function createBrowserAppPorts(options?: {
  validPropertyIds?: ReadonlySet<string>;
  reservationDelayMs?: number;
  storage?: StorageLike;
  eventTarget?: StorageEventTargetLike;
}): AppPorts {
  return {
    favorites: createBrowserFavoritesAdapter({
      validPropertyIds: options?.validPropertyIds,
      storage: options?.storage,
      eventTarget: options?.eventTarget,
    }),
    reservations: createBrowserReservationAdapter(options?.reservationDelayMs),
  };
}

export function createInMemoryAppPorts(options?: {
  initialFavoriteIds?: readonly string[];
  validPropertyIds?: ReadonlySet<string>;
  bookingId?: string;
  createdAt?: string;
}): {
  favorites: FavoritesRepository;
  reservations: InMemoryReservationAdapter;
} {
  return {
    favorites: createInMemoryFavoritesAdapter({
      initialIds: options?.initialFavoriteIds,
      validPropertyIds: options?.validPropertyIds,
    }),
    reservations: createInMemoryReservationAdapter({
      bookingId: options?.bookingId,
      createdAt: options?.createdAt,
    }),
  };
}
