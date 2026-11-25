import {
  API_ENDPOINTS,
  ActivitiesCatalogResponseSchema,
  ActivityBookingSchema,
  ActivityDetailResponseSchema,
  ApiErrorResponseSchema,
  createApiSuccessSchema,
  type ActivitiesCatalogResponse,
  type ActivitiesQueryParams,
  type ActivityBooking,
  type ActivityDetailResponse,
  type ServiceBookingIntent,
  type TravelActivity,
} from "@luxestay/contracts";
import {
  evaluateActivityBookingCancellation,
  filterActivities,
  filterActivityEligibleVouchers,
  getActivityCategories,
  getActivityCities,
  matchesActivityBookingContact,
  normalizeActivitySlug,
  normalizeVietnamese,
  processStandaloneActivityBooking,
} from "@luxestay/domain";
import { SEED_CATALOG_SNAPSHOT, TRAVEL_ACTIVITIES } from "@luxestay/domain/seed";
import { z } from "zod";
import { getServerWebEnv, type DataMode } from "../config/env";
import { HttpApiError, isAbortError } from "./errors";
import type { ActivitiesPort } from "./types";

const ActivitiesCatalogSuccessSchema = createApiSuccessSchema(ActivitiesCatalogResponseSchema);
const ActivityDetailSuccessSchema = createApiSuccessSchema(ActivityDetailResponseSchema);
const ActivityBookingSuccessSchema = createApiSuccessSchema(ActivityBookingSchema);
const MyActivityBookingsSuccessSchema = createApiSuccessSchema(
  z.object({ bookings: z.array(ActivityBookingSchema) })
);

function joinUrl(baseUrl: string, path: string): string {
  const normalizedBase = baseUrl.replace(/\/+$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}

function buildActivitiesQueryString(query?: ActivitiesQueryParams): string {
  if (!query) return "";
  const params = new URLSearchParams();
  if (query.city?.trim()) params.set("city", query.city.trim());
  if (query.search?.trim()) params.set("search", query.search.trim());
  if (query.category && query.category !== "all") params.set("category", query.category);
  if (query.period && query.period !== "all") params.set("period", query.period);
  if (query.maxPrice !== undefined && Number.isFinite(query.maxPrice)) {
    params.set("maxPrice", String(query.maxPrice));
  }
  if (query.sortBy) params.set("sortBy", query.sortBy);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

async function requestActivityContract<TSchema extends z.ZodTypeAny>(options: {
  baseUrl: string;
  path: string;
  method: "GET" | "POST" | "PATCH";
  body?: unknown;
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
  schema: TSchema;
  nullOn404?: boolean;
  invalidJsonMessage: string;
  contractMismatchMessage: string;
}): Promise<z.infer<TSchema>["data"] | null> {
  const fetchFn = options.fetchImpl ?? (typeof fetch !== "undefined" ? fetch : undefined);
  if (!fetchFn) {
    throw new HttpApiError({
      status: 0,
      code: "NETWORK_ERROR",
      message: "Fetch API không khả dụng trong môi trường hiện tại.",
    });
  }

  const endpoint = joinUrl(options.baseUrl, options.path);
  let response: Response;
  try {
    response = await fetchFn(endpoint, {
      method: options.method,
      credentials: "include",
      headers: {
        Accept: "application/json",
        ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
      cache: "no-store",
      signal: options.signal,
    });
  } catch (err) {
    if (isAbortError(err)) throw err;
    throw new HttpApiError({
      status: 0,
      code: "NETWORK_ERROR",
      message: `Không thể kết nối máy chủ LuxeStay API (${options.baseUrl || "same-origin"}).`,
      details: err instanceof Error ? err.message : undefined,
    });
  }

  if (options.nullOn404 && response.status === 404) {
    return null;
  }

  let rawBody: unknown;
  try {
    rawBody = await response.json();
  } catch {
    throw new HttpApiError({
      status: response.status,
      code: "CONTRACT_MISMATCH",
      message: options.invalidJsonMessage,
      requestId: response.headers.get("x-request-id") ?? undefined,
    });
  }

  if (!response.ok) {
    const parsedErr = ApiErrorResponseSchema.safeParse(rawBody);
    if (parsedErr.success) {
      throw new HttpApiError({
        status: response.status,
        code: parsedErr.data.error.code,
        message: parsedErr.data.error.message,
        details: parsedErr.data.error.details,
        requestId:
          parsedErr.data.meta?.requestId ??
          response.headers.get("x-request-id") ??
          undefined,
      });
    }
    throw new HttpApiError({
      status: response.status,
      code: "INTERNAL_ERROR",
      message: `Máy chủ trả về lỗi HTTP ${response.status} khi xử lý dịch vụ trải nghiệm.`,
      requestId: response.headers.get("x-request-id") ?? undefined,
    });
  }

  const parsedSuccess = options.schema.safeParse(rawBody);
  if (!parsedSuccess.success) {
    throw new HttpApiError({
      status: response.status,
      code: "CONTRACT_MISMATCH",
      message: options.contractMismatchMessage,
      details: parsedSuccess.error.issues,
      requestId: response.headers.get("x-request-id") ?? undefined,
    });
  }

  return parsedSuccess.data.data;
}

export function createHttpActivitiesPort(options: {
  baseUrl: string;
  fetchImpl?: typeof fetch;
}): ActivitiesPort {
  return {
    async listActivities(query, reqOptions) {
      const qs = buildActivitiesQueryString(query);
      const data = await requestActivityContract({
        baseUrl: options.baseUrl,
        path: `${API_ENDPOINTS.activities}${qs}`,
        method: "GET",
        fetchImpl: options.fetchImpl,
        signal: reqOptions?.signal,
        schema: ActivitiesCatalogSuccessSchema,
        invalidJsonMessage: "Dữ liệu danh mục trải nghiệm trả về không đúng định dạng JSON.",
        contractMismatchMessage: "Dữ liệu danh mục trải nghiệm không khớp schema chuẩn.",
      });
      return data as ActivitiesCatalogResponse;
    },

    async getActivityBySlug(slug, reqOptions) {
      const normalized = normalizeActivitySlug(slug);
      if (!normalized) return null;
      return (await requestActivityContract({
        baseUrl: options.baseUrl,
        path: API_ENDPOINTS.activityBySlug(normalized),
        method: "GET",
        fetchImpl: options.fetchImpl,
        signal: reqOptions?.signal,
        schema: ActivityDetailSuccessSchema,
        nullOn404: true,
        invalidJsonMessage: "Dữ liệu chi tiết hoạt động trả về không đúng định dạng JSON.",
        contractMismatchMessage: "Dữ liệu chi tiết hoạt động không khớp schema chuẩn.",
      })) as ActivityDetailResponse | null;
    },

    async createBooking(intent, reqOptions) {
      const data = await requestActivityContract({
        baseUrl: options.baseUrl,
        path: API_ENDPOINTS.activityBookings,
        method: "POST",
        body: intent,
        fetchImpl: options.fetchImpl,
        signal: reqOptions?.signal,
        schema: ActivityBookingSuccessSchema,
        invalidJsonMessage: "Phản hồi đặt dịch vụ không đúng định dạng JSON.",
        contractMismatchMessage: "Biên lai đặt dịch vụ từ máy chủ không khớp schema chuẩn.",
      });
      return data as ActivityBooking;
    },

    async lookupBooking(bookingId, contact, reqOptions) {
      const qs = contact?.trim() ? `?contact=${encodeURIComponent(contact.trim())}` : "";
      const data = await requestActivityContract({
        baseUrl: options.baseUrl,
        path: `${API_ENDPOINTS.activityBookingById(bookingId)}${qs}`,
        method: "GET",
        fetchImpl: options.fetchImpl,
        signal: reqOptions?.signal,
        schema: ActivityBookingSuccessSchema,
        invalidJsonMessage: "Phản hồi tra cứu đơn dịch vụ không đúng định dạng JSON.",
        contractMismatchMessage: "Dữ liệu đơn dịch vụ không khớp schema chuẩn.",
      });
      return data as ActivityBooking;
    },

    async listMyBookings(reqOptions) {
      const data = await requestActivityContract({
        baseUrl: options.baseUrl,
        path: API_ENDPOINTS.myActivityBookings,
        method: "GET",
        fetchImpl: options.fetchImpl,
        signal: reqOptions?.signal,
        schema: MyActivityBookingsSuccessSchema,
        invalidJsonMessage: "Phản hồi lịch sử dịch vụ không đúng định dạng JSON.",
        contractMismatchMessage: "Dữ liệu lịch sử dịch vụ không khớp schema chuẩn.",
      });
      return Object.freeze((data as { bookings: ActivityBooking[] }).bookings);
    },

    async cancelBooking(bookingId, input, reqOptions) {
      const data = await requestActivityContract({
        baseUrl: options.baseUrl,
        path: API_ENDPOINTS.cancelActivityBooking(bookingId),
        method: "PATCH",
        body: input,
        fetchImpl: options.fetchImpl,
        signal: reqOptions?.signal,
        schema: ActivityBookingSuccessSchema,
        invalidJsonMessage: "Phản hồi hủy đơn dịch vụ không đúng định dạng JSON.",
        contractMismatchMessage: "Dữ liệu hủy đơn dịch vụ không khớp schema chuẩn.",
      });
      return data as ActivityBooking;
    },
  };
}

export function createMockActivitiesPort(options?: {
  activities?: readonly TravelActivity[];
}): ActivitiesPort {
  const catalog = options?.activities ?? TRAVEL_ACTIVITIES;
  const store = new Map<string, ActivityBooking>();

  return {
    async listActivities(query) {
      return Object.freeze({
        activities: filterActivities(catalog, query),
        cities: getActivityCities(catalog),
        categories: getActivityCategories(catalog),
      });
    },

    async getActivityBySlug(slug) {
      const normalized = normalizeActivitySlug(slug);
      const activity = catalog.find((item) => item.slug.toLowerCase() === normalized && item.isActive);
      if (!activity) return null;

      const cityNorm = normalizeVietnamese(activity.destinationCity);
      const routeNorm = activity.transferDetails
        ? normalizeVietnamese(`${activity.transferDetails.routeFrom} ${activity.transferDetails.routeTo}`)
        : "";
      const relatedStays = SEED_CATALOG_SNAPSHOT.properties
        .filter((prop) => {
          const pCity = normalizeVietnamese(prop.location.city);
          return pCity === cityNorm || (routeNorm.length > 0 && routeNorm.includes(pCity));
        })
        .slice(0, 4);

      return Object.freeze({
        activity,
        relatedStays: Object.freeze(relatedStays),
        availableVouchers: filterActivityEligibleVouchers(SEED_CATALOG_SNAPSHOT.promotions.vouchers),
      });
    },

    async createBooking(intent: ServiceBookingIntent) {
      const bookingId = `ACT-${Math.floor(100000 + Math.random() * 900000)}`;
      const bookedQuantityForSlot = [...store.values()]
        .filter(
          (b) =>
            b.status === "confirmed" &&
            b.activityId === intent.activityId &&
            b.slotId === intent.slotId &&
            b.dateIso === intent.dateIso
        )
        .reduce((sum, b) => sum + b.quantity, 0);

      const res = processStandaloneActivityBooking(intent, catalog, {
        bookingId,
        bookedQuantityForSlot,
        vouchers: SEED_CATALOG_SNAPSHOT.promotions.vouchers,
      });
      if (!res.ok) {
        throw new HttpApiError({
          status: res.status,
          code: res.code,
          message: res.message,
        });
      }
      store.set(res.booking.bookingId, res.booking);
      return res.booking;
    },

    async lookupBooking(bookingId, contact) {
      const existing = store.get(bookingId.trim().toUpperCase());
      if (!existing) {
        throw new HttpApiError({
          status: 404,
          code: "NOT_FOUND",
          message: "Không tìm thấy đơn dịch vụ.",
        });
      }
      if (contact && !matchesActivityBookingContact(existing, contact)) {
        throw new HttpApiError({
          status: 403,
          code: "FORBIDDEN",
          message: "Thông tin liên hệ không khớp với đơn dịch vụ.",
        });
      }
      return existing;
    },

    async listMyBookings() {
      return Object.freeze([...store.values()]);
    },

    async cancelBooking(bookingId, input) {
      const existing = store.get(bookingId.trim().toUpperCase());
      if (!existing) {
        throw new HttpApiError({
          status: 404,
          code: "NOT_FOUND",
          message: "Không tìm thấy đơn dịch vụ.",
        });
      }
      const res = evaluateActivityBookingCancellation(existing, {
        contact: input.contact,
        reason: input.reason,
      });
      if (!res.ok) {
        throw new HttpApiError({
          status: res.status,
          code: res.code,
          message: res.message,
        });
      }
      store.set(res.booking.bookingId, res.booking);
      return res.booking;
    },
  };
}

export function createActivitiesPort(options: {
  mode: DataMode;
  apiBaseUrl: string;
  fetchImpl?: typeof fetch;
}): ActivitiesPort {
  if (options.mode === "mock") {
    return createMockActivitiesPort();
  }
  return createHttpActivitiesPort({
    baseUrl: options.apiBaseUrl,
    fetchImpl: options.fetchImpl,
  });
}

export async function loadActivitiesCatalog(
  query?: ActivitiesQueryParams
): Promise<ActivitiesCatalogResponse> {
  const env = getServerWebEnv();
  const port = createActivitiesPort({
    mode: env.dataMode,
    apiBaseUrl: env.serverApiBaseUrl,
  });
  return port.listActivities(query);
}

export async function loadActivityBySlug(slug: string): Promise<ActivityDetailResponse | null> {
  const env = getServerWebEnv();
  const port = createActivitiesPort({
    mode: env.dataMode,
    apiBaseUrl: env.serverApiBaseUrl,
  });
  return port.getActivityBySlug(slug);
}
