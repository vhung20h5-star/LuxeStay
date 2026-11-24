import {
  API_ENDPOINTS,
  ApiErrorResponseSchema,
  BookingDetailsSchema,
  createApiSuccessSchema,
  type BookingDetails,
  type ReservationSubmissionRequest,
  type ReservationSubmitter,
  type ServerReservationIntent,
} from "@luxestay/contracts";
import {
  evaluateReservationCancellation,
  matchesReservationContact,
} from "@luxestay/domain";
import type { DataMode } from "../config/env";
import { HttpApiError, isAbortError } from "./errors";
import type {
  AppPorts,
  FavoritesRepository,
  InMemoryReservationAdapter,
  ReservationManagerPort,
  StorageEventLike,
  StorageEventTargetLike,
  StorageLike,
} from "./types";

export const FAVORITES_STORAGE_KEY = "travel_favorites";
export const MOCK_RESERVATIONS_STORAGE_KEY = "luxestay_mock_bookings";
export const DEFAULT_FAVORITE_IDS: readonly string[] = Object.freeze(["stay-01", "stay-02"]);
const EMPTY_IDS: readonly string[] = Object.freeze([]);
const DEFAULT_RESERVATION_DELAY_MS = 1200;

const BookingApiSuccessSchema = createApiSuccessSchema(BookingDetailsSchema);

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

function freezeBookingDetails(details: BookingDetails): BookingDetails {
  return Object.freeze({
    ...details,
    status: details.status ?? "confirmed",
    guests: Object.freeze({ ...details.guests }),
    pricing: Object.freeze({ ...details.pricing }),
    selectedAmenities: Object.freeze(
      details.selectedAmenities.map((item) => Object.freeze({ ...item }))
    ),
    guestInfo: Object.freeze({ ...details.guestInfo }),
  });
}

function buildBookingDetails(
  request: ReservationSubmissionRequest,
  bookingId: string,
  createdAt: string
): BookingDetails {
  return freezeBookingDetails({
    property: request.quote.property,
    checkIn: request.quote.checkIn,
    checkOut: request.quote.checkOut,
    nights: request.quote.nights,
    guests: request.quote.guests,
    pricing: request.quote.pricing,
    selectedAmenities: request.quote.selectedAmenities,
    guestInfo: request.guestInfo,
    paymentMethod: request.paymentMethod,
    bookingId,
    createdAt,
    status: "confirmed",
  });
}

function resolveReservationEndpoint(options?: HttpReservationAdapterOptions): string {
  if (options?.endpoint) return options.endpoint;
  const baseUrl = (options?.baseUrl ?? "http://localhost:4000").replace(/\/+$/, "");
  return `${baseUrl}${API_ENDPOINTS.reservations}`;
}

function readMockBookings(storage?: StorageLike | null): Map<string, BookingDetails> {
  const map = new Map<string, BookingDetails>();
  const target =
    storage ??
    (typeof window !== "undefined"
      ? (() => {
          try {
            return window.localStorage ?? null;
          } catch {
            return null;
          }
        })()
      : null);

  if (!target) return map;
  try {
    const raw = target.getItem(MOCK_RESERVATIONS_STORAGE_KEY);
    if (!raw) return map;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return map;
    for (const item of parsed) {
      const checked = BookingDetailsSchema.safeParse(item);
      if (checked.success && checked.data.bookingId) {
        map.set(checked.data.bookingId.toUpperCase(), freezeBookingDetails(checked.data));
      }
    }
  } catch {
    return map;
  }
  return map;
}

function writeMockBookings(
  bookings: Map<string, BookingDetails>,
  storage?: StorageLike | null
): void {
  const target =
    storage ??
    (typeof window !== "undefined"
      ? (() => {
          try {
            return window.localStorage ?? null;
          } catch {
            return null;
          }
        })()
      : null);

  if (!target) return;
  try {
    target.setItem(MOCK_RESERVATIONS_STORAGE_KEY, JSON.stringify([...bookings.values()]));
  } catch {
    // Graceful degradation under private mode / QuotaExceededError
  }
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
  delayMs = DEFAULT_RESERVATION_DELAY_MS,
  options?: { storage?: StorageLike }
): ReservationSubmitter {
  const safeDelayMs = sanitizeDelayMs(delayMs);

  return {
    submit(request, submitOptions) {
      const signal = submitOptions?.signal;
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
          const booking = buildBookingDetails(
            capturedRequest,
            randomBookingId,
            new Date().toISOString()
          );
          const stored = readMockBookings(options?.storage);
          stored.set(randomBookingId, booking);
          writeMockBookings(stored, options?.storage);
          resolve(booking);
        }, safeDelayMs);

        signal?.addEventListener("abort", onAbort, { once: true });
      });
    },
  };
}

export function createBrowserReservationManagerAdapter(options?: {
  storage?: StorageLike;
}): ReservationManagerPort {
  return {
    async lookup(bookingId, contact, callOptions) {
      if (callOptions?.signal?.aborted) throw createAbortError();
      const normalizedId = bookingId.trim().toUpperCase();
      const stored = readMockBookings(options?.storage);
      const found = stored.get(normalizedId);
      if (!found) {
        throw new HttpApiError({
          status: 404,
          code: "NOT_FOUND",
          message: `Không tìm thấy đơn đặt phòng với mã ${normalizedId}.`,
        });
      }
      if (!matchesReservationContact(found, contact)) {
        throw new HttpApiError({
          status: 403,
          code: "FORBIDDEN",
          message: "Email hoặc số điện thoại không khớp với thông tin đặt phòng này.",
        });
      }
      return found;
    },

    async cancel(bookingId, input, callOptions) {
      if (callOptions?.signal?.aborted) throw createAbortError();
      const normalizedId = bookingId.trim().toUpperCase();
      const stored = readMockBookings(options?.storage);
      const found = stored.get(normalizedId);
      if (!found) {
        throw new HttpApiError({
          status: 404,
          code: "NOT_FOUND",
          message: `Không tìm thấy đơn đặt phòng với mã ${normalizedId}.`,
        });
      }
      const evaluated = evaluateReservationCancellation(found, input);
      if (!evaluated.ok) {
        throw new HttpApiError({
          status: evaluated.status,
          code: evaluated.code,
          message: evaluated.error,
        });
      }
      stored.set(normalizedId, evaluated.booking);
      writeMockBookings(stored, options?.storage);
      return evaluated.booking;
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

export function createInMemoryReservationManager(
  initialBookings: readonly BookingDetails[] = []
): ReservationManagerPort & { upsert(booking: BookingDetails): void } {
  const store = new Map<string, BookingDetails>();
  for (const booking of initialBookings) {
    if (booking.bookingId) {
      store.set(booking.bookingId.trim().toUpperCase(), freezeBookingDetails(booking));
    }
  }

  return {
    upsert(booking: BookingDetails) {
      if (booking.bookingId) {
        store.set(booking.bookingId.trim().toUpperCase(), freezeBookingDetails(booking));
      }
    },
    async lookup(bookingId, contact, options) {
      if (options?.signal?.aborted) throw createAbortError();
      const normalized = bookingId.trim().toUpperCase();
      const found = store.get(normalized);
      if (!found) {
        throw new HttpApiError({
          status: 404,
          code: "NOT_FOUND",
          message: `Không tìm thấy đơn đặt phòng với mã ${normalized}.`,
        });
      }
      if (!matchesReservationContact(found, contact)) {
        throw new HttpApiError({
          status: 403,
          code: "FORBIDDEN",
          message: "Email hoặc số điện thoại không khớp với thông tin đặt phòng này.",
        });
      }
      return found;
    },
    async cancel(bookingId, input, options) {
      if (options?.signal?.aborted) throw createAbortError();
      const normalized = bookingId.trim().toUpperCase();
      const found = store.get(normalized);
      if (!found) {
        throw new HttpApiError({
          status: 404,
          code: "NOT_FOUND",
          message: `Không tìm thấy đơn đặt phòng với mã ${normalized}.`,
        });
      }
      const evaluated = evaluateReservationCancellation(found, input);
      if (!evaluated.ok) {
        throw new HttpApiError({
          status: evaluated.status,
          code: evaluated.code,
          message: evaluated.error,
        });
      }
      store.set(normalized, evaluated.booking);
      return evaluated.booking;
    },
  };
}

export interface HttpReservationAdapterOptions {
  baseUrl?: string;
  endpoint?: string;
  fetchImpl?: typeof fetch;
}

async function parseBookingApiResponse(
  response: Response,
  fallbackErrorMessage: string
): Promise<BookingDetails> {
  let rawBody: unknown;
  try {
    rawBody = await response.json();
  } catch {
    throw new HttpApiError({
      status: response.status,
      code: "CONTRACT_MISMATCH",
      message: "Phản hồi đặt phòng từ máy chủ không hợp lệ.",
      requestId: response.headers.get("x-request-id") ?? undefined,
    });
  }

  if (!response.ok) {
    const parsedError = ApiErrorResponseSchema.safeParse(rawBody);
    if (parsedError.success) {
      throw new HttpApiError({
        status: response.status,
        code: parsedError.data.error.code,
        message: parsedError.data.error.message,
        details: parsedError.data.error.details,
        requestId:
          parsedError.data.meta?.requestId ??
          response.headers.get("x-request-id") ??
          undefined,
      });
    }
    throw new HttpApiError({
      status: response.status,
      code: "INTERNAL_ERROR",
      message: fallbackErrorMessage,
      requestId: response.headers.get("x-request-id") ?? undefined,
    });
  }

  const parsedSuccess = BookingApiSuccessSchema.safeParse(rawBody);
  if (!parsedSuccess.success) {
    throw new HttpApiError({
      status: response.status,
      code: "CONTRACT_MISMATCH",
      message: "Dữ liệu vé xác nhận từ máy chủ không khớp hợp đồng @luxestay/contracts.",
      details: parsedSuccess.error.issues,
      requestId: response.headers.get("x-request-id") ?? undefined,
    });
  }

  return freezeBookingDetails(parsedSuccess.data.data);
}

export function createHttpReservationAdapter(
  options?: HttpReservationAdapterOptions
): ReservationSubmitter {
  const endpoint = resolveReservationEndpoint(options);

  return {
    async submit(request, submitOptions) {
      const signal = submitOptions?.signal;
      if (signal?.aborted) {
        throw createAbortError();
      }

      const fetchFn = options?.fetchImpl ?? (typeof fetch !== "undefined" ? fetch : undefined);
      if (!fetchFn) {
        throw new HttpApiError({
          status: 0,
          code: "NETWORK_ERROR",
          message: "Fetch API không khả dụng trong môi trường hiện tại.",
        });
      }

      const intent: ServerReservationIntent = {
        propertyId: request.quote.property.id,
        checkInSeed: request.quote.checkIn,
        nights: request.quote.nights,
        guests: { ...request.quote.guests },
        selectedAmenityIds: [...request.quote.selectedAmenityIds],
        guestInfo: { ...request.guestInfo },
        paymentMethod: request.paymentMethod,
      };

      let response: Response;
      try {
        response = await fetchFn(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(intent),
          signal,
        });
      } catch (err) {
        if (isAbortError(err)) throw err;
        throw new HttpApiError({
          status: 0,
          code: "NETWORK_ERROR",
          message: "Không thể kết nối máy chủ đặt phòng. Vui lòng thử lại sau!",
          details: err instanceof Error ? err.message : undefined,
        });
      }

      return parseBookingApiResponse(
        response,
        "Không thể xác nhận đặt phòng từ máy chủ. Vui lòng thử lại!"
      );
    },
  };
}

export function createHttpReservationManagerAdapter(options?: {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
}): ReservationManagerPort {
  const baseUrl = (options?.baseUrl ?? "http://localhost:4000").replace(/\/+$/, "");

  return {
    async lookup(bookingId, contact, callOptions) {
      const signal = callOptions?.signal;
      if (signal?.aborted) throw createAbortError();

      const fetchFn = options?.fetchImpl ?? (typeof fetch !== "undefined" ? fetch : undefined);
      if (!fetchFn) {
        throw new HttpApiError({
          status: 0,
          code: "NETWORK_ERROR",
          message: "Fetch API không khả dụng trong môi trường hiện tại.",
        });
      }

      const url = `${baseUrl}${API_ENDPOINTS.reservationById(bookingId)}?contact=${encodeURIComponent(contact.trim())}`;
      let response: Response;
      try {
        response = await fetchFn(url, {
          method: "GET",
          headers: { Accept: "application/json" },
          cache: "no-store",
          signal,
        });
      } catch (err) {
        if (isAbortError(err)) throw err;
        throw new HttpApiError({
          status: 0,
          code: "NETWORK_ERROR",
          message: "Không thể kết nối máy chủ để tra cứu đơn đặt phòng.",
          details: err instanceof Error ? err.message : undefined,
        });
      }

      return parseBookingApiResponse(response, "Không thể tra cứu đơn đặt phòng từ máy chủ.");
    },

    async cancel(bookingId, input, callOptions) {
      const signal = callOptions?.signal;
      if (signal?.aborted) throw createAbortError();

      const fetchFn = options?.fetchImpl ?? (typeof fetch !== "undefined" ? fetch : undefined);
      if (!fetchFn) {
        throw new HttpApiError({
          status: 0,
          code: "NETWORK_ERROR",
          message: "Fetch API không khả dụng trong môi trường hiện tại.",
        });
      }

      const url = `${baseUrl}${API_ENDPOINTS.cancelReservation(bookingId)}`;
      let response: Response;
      try {
        response = await fetchFn(url, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            contact: input.contact.trim(),
            reason: input.reason?.trim() || undefined,
          }),
          signal,
        });
      } catch (err) {
        if (isAbortError(err)) throw err;
        throw new HttpApiError({
          status: 0,
          code: "NETWORK_ERROR",
          message: "Không thể kết nối máy chủ để hủy đặt phòng.",
          details: err instanceof Error ? err.message : undefined,
        });
      }

      return parseBookingApiResponse(response, "Không thể hủy đặt phòng từ máy chủ.");
    },
  };
}

export function createWebAppPorts(options: {
  mode: DataMode;
  apiBaseUrl: string;
  validPropertyIds?: ReadonlySet<string>;
  mockReservationDelayMs?: number;
  storage?: StorageLike;
  eventTarget?: StorageEventTargetLike;
  fetchImpl?: typeof fetch;
}): AppPorts {
  return {
    favorites: createBrowserFavoritesAdapter({
      validPropertyIds: options.validPropertyIds,
      storage: options.storage,
      eventTarget: options.eventTarget,
    }),
    reservations:
      options.mode === "api"
        ? createHttpReservationAdapter({
            baseUrl: options.apiBaseUrl,
            fetchImpl: options.fetchImpl,
          })
        : createBrowserReservationAdapter(options.mockReservationDelayMs, {
            storage: options.storage,
          }),
    reservationManager:
      options.mode === "api"
        ? createHttpReservationManagerAdapter({
            baseUrl: options.apiBaseUrl,
            fetchImpl: options.fetchImpl,
          })
        : createBrowserReservationManagerAdapter({
            storage: options.storage,
          }),
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
  reservationManager: ReservationManagerPort;
} {
  const manager = createInMemoryReservationManager();
  const baseReservations = createInMemoryReservationAdapter({
    bookingId: options?.bookingId,
    createdAt: options?.createdAt,
  });

  const reservations: InMemoryReservationAdapter = {
    async submit(request, submitOptions) {
      const booking = await baseReservations.submit(request, submitOptions);
      manager.upsert(booking);
      return booking;
    },
    getSubmittedBookings() {
      return baseReservations.getSubmittedBookings();
    },
  };

  return {
    favorites: createInMemoryFavoritesAdapter({
      initialIds: options?.initialFavoriteIds,
      validPropertyIds: options?.validPropertyIds,
    }),
    reservations,
    reservationManager: manager,
  };
}
