import {
  API_ENDPOINTS,
  ApiErrorResponseSchema,
  HostAnalyticsDataSchema,
  HostPropertiesListDataSchema,
  HostReservationsListDataSchema,
  PropertyAvailabilityDataSchema,
  PropertySchema,
  createApiSuccessSchema,
  type BookingDetails,
  type CreateHostPropertyInput,
  type HostAnalyticsData,
  type Property,
  type PropertyAvailabilityData,
  type ReservationStatus,
  type UpdateHostPropertyInput,
  type UpsertHostAvailabilityInput,
} from "@luxestay/contracts";
import { buildAvailabilityCalendar, computeHostAnalytics } from "@luxestay/domain";
import { z } from "zod";
import type { DataMode } from "../config/env";
import { HttpApiError, isAbortError } from "./errors";

export interface HostPort {
  listProperties(options?: { signal?: AbortSignal }): Promise<readonly Property[]>;
  createProperty(input: CreateHostPropertyInput): Promise<Property>;
  updateProperty(propertyId: string, input: UpdateHostPropertyInput): Promise<Property>;
  deleteProperty(propertyId: string): Promise<{ deleted: true; propertyId: string }>;
  upsertAvailability(
    propertyId: string,
    input: UpsertHostAvailabilityInput
  ): Promise<PropertyAvailabilityData>;
  listReservations(
    filters?: { propertyId?: string; status?: ReservationStatus },
    options?: { signal?: AbortSignal }
  ): Promise<readonly BookingDetails[]>;
  getAnalytics(options?: { signal?: AbortSignal }): Promise<HostAnalyticsData>;
}

const HostPropsSuccessSchema = createApiSuccessSchema(HostPropertiesListDataSchema);
const PropertySuccessSchema = createApiSuccessSchema(PropertySchema);
const DeletePropSuccessSchema = createApiSuccessSchema(
  z.object({ deleted: z.literal(true), propertyId: z.string().min(1) })
);
const AvailabilitySuccessSchema = createApiSuccessSchema(PropertyAvailabilityDataSchema);
const HostBookingsSuccessSchema = createApiSuccessSchema(HostReservationsListDataSchema);
const HostAnalyticsSuccessSchema = createApiSuccessSchema(HostAnalyticsDataSchema);

export function createHttpHostPort(options?: {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
}): HostPort {
  const baseUrl = (options?.baseUrl ?? "http://localhost:4000").replace(/\/+$/, "");

  async function requestJson<T extends z.ZodTypeAny>(
    path: string,
    init: RequestInit,
    schema: T,
    fallbackMessage: string
  ): Promise<z.infer<T>> {
    const fetchFn = options?.fetchImpl ?? (typeof fetch !== "undefined" ? fetch : undefined);
    if (!fetchFn) {
      throw new HttpApiError({
        status: 0,
        code: "NETWORK_ERROR",
        message: "Fetch API không khả dụng trong môi trường hiện tại.",
      });
    }

    let response: Response;
    try {
      response = await fetchFn(`${baseUrl}${path}`, {
        ...init,
        credentials: "include",
        headers: {
          Accept: "application/json",
          ...(init.body ? { "Content-Type": "application/json" } : {}),
          ...init.headers,
        },
      });
    } catch (err) {
      if (isAbortError(err)) throw err;
      throw new HttpApiError({
        status: 0,
        code: "NETWORK_ERROR",
        message: "Không thể kết nối máy chủ Cổng Chủ nhà LuxeStay.",
        details: err instanceof Error ? err.message : undefined,
      });
    }

    const rawBody = await response.json().catch(() => null);
    if (!response.ok) {
      const errParsed = ApiErrorResponseSchema.safeParse(rawBody);
      throw new HttpApiError({
        status: response.status,
        code: errParsed.success ? errParsed.data.error.code : "INTERNAL_ERROR",
        message: errParsed.success ? errParsed.data.error.message : fallbackMessage,
        requestId: response.headers.get("x-request-id") ?? undefined,
      });
    }

    const parsed = schema.safeParse(rawBody);
    if (!parsed.success) {
      throw new HttpApiError({
        status: response.status,
        code: "CONTRACT_MISMATCH",
        message: "Dữ liệu Cổng Chủ nhà không khớp hợp đồng @luxestay/contracts.",
        details: parsed.error.issues,
        requestId: response.headers.get("x-request-id") ?? undefined,
      });
    }

    return parsed.data;
  }

  return {
    async listProperties(callOptions) {
      const res = await requestJson(
        API_ENDPOINTS.hostProperties,
        { method: "GET", cache: "no-store", signal: callOptions?.signal },
        HostPropsSuccessSchema,
        "Không thể tải danh sách chỗ nghỉ quản lý."
      );
      return res.data.properties;
    },

    async createProperty(input) {
      const res = await requestJson(
        API_ENDPOINTS.hostProperties,
        { method: "POST", body: JSON.stringify(input) },
        PropertySuccessSchema,
        "Không thể tạo chỗ nghỉ mới."
      );
      return res.data;
    },

    async updateProperty(propertyId, input) {
      const res = await requestJson(
        API_ENDPOINTS.hostPropertyById(propertyId),
        { method: "PATCH", body: JSON.stringify(input) },
        PropertySuccessSchema,
        "Không thể cập nhật thông tin chỗ nghỉ."
      );
      return res.data;
    },

    async deleteProperty(propertyId) {
      const res = await requestJson(
        API_ENDPOINTS.hostPropertyById(propertyId),
        { method: "DELETE" },
        DeletePropSuccessSchema,
        "Không thể xóa chỗ nghỉ."
      );
      return res.data;
    },

    async upsertAvailability(propertyId, input) {
      const res = await requestJson(
        API_ENDPOINTS.hostPropertyAvailability(propertyId),
        { method: "PUT", body: JSON.stringify(input) },
        AvailabilitySuccessSchema,
        "Không thể cập nhật lịch phòng và giá đặc biệt."
      );
      return res.data;
    },

    async listReservations(filters, callOptions) {
      const params = new URLSearchParams();
      if (filters?.propertyId) params.set("propertyId", filters.propertyId);
      if (filters?.status) params.set("status", filters.status);
      const query = params.toString() ? `?${params.toString()}` : "";
      const res = await requestJson(
        `${API_ENDPOINTS.hostReservations}${query}`,
        { method: "GET", cache: "no-store", signal: callOptions?.signal },
        HostBookingsSuccessSchema,
        "Không thể tải danh sách đơn đặt phòng của khách."
      );
      return res.data.bookings;
    },

    async getAnalytics(callOptions) {
      const res = await requestJson(
        API_ENDPOINTS.hostAnalytics,
        { method: "GET", cache: "no-store", signal: callOptions?.signal },
        HostAnalyticsSuccessSchema,
        "Không thể tải báo cáo doanh thu."
      );
      return res.data;
    },
  };
}

export function createMockHostPort(options?: {
  properties?: readonly Property[];
}): HostPort {
  const properties: Property[] = (options?.properties ?? []).map((p) => ({ ...p }));

  return {
    async listProperties() {
      return Object.freeze([...properties]);
    },
    async createProperty(input) {
      const created: Property = {
        id: `stay-mock-${Date.now().toString(36)}`,
        title: input.title,
        subtitle: input.subtitle,
        propertyType: input.propertyType,
        category: input.category,
        location: { ...input.location },
        images: [...input.images],
        pricePerNight: input.pricePerNight,
        originalPrice: input.originalPrice,
        rating: 5,
        reviewCount: 0,
        inventoryCount: input.inventoryCount,
        ownerUserId: "USR-HOST-01",
        maxGuests: input.maxGuests,
        bedrooms: input.bedrooms,
        beds: input.beds,
        bathrooms: input.bathrooms,
        resortAmenities: input.amenityIds.map((amenityId, idx) => ({
          amenityId,
          featured: idx < 6,
        })),
        freeCancellation: input.freeCancellation,
        breakfastIncluded: input.breakfastIncluded,
        description: input.description,
        host: {
          name: "Minh Quân Host",
          avatar:
            "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=160&q=80",
          joinedDate: "Thành viên từ 2026",
          responseRate: "Phản hồi trong 15 phút (99%)",
          isSuperhost: true,
        },
        reviews: [],
      };
      properties.unshift(created);
      return created;
    },
    async updateProperty(propertyId, input) {
      const idx = properties.findIndex((p) => p.id === propertyId);
      if (idx === -1) {
        throw new HttpApiError({
          status: 404,
          code: "NOT_FOUND",
          message: `Không tìm thấy chỗ nghỉ ${propertyId}.`,
        });
      }
      const next: Property = {
        ...properties[idx],
        title: input.title ?? properties[idx].title,
        subtitle: input.subtitle ?? properties[idx].subtitle,
        pricePerNight: input.pricePerNight ?? properties[idx].pricePerNight,
        inventoryCount: input.inventoryCount ?? properties[idx].inventoryCount,
        maxGuests: input.maxGuests ?? properties[idx].maxGuests,
        freeCancellation: input.freeCancellation ?? properties[idx].freeCancellation,
        breakfastIncluded: input.breakfastIncluded ?? properties[idx].breakfastIncluded,
        description: input.description ?? properties[idx].description,
      };
      properties[idx] = next;
      return next;
    },
    async deleteProperty(propertyId) {
      const idx = properties.findIndex((p) => p.id === propertyId);
      if (idx === -1) {
        throw new HttpApiError({
          status: 404,
          code: "NOT_FOUND",
          message: `Không tìm thấy chỗ nghỉ ${propertyId}.`,
        });
      }
      properties.splice(idx, 1);
      return { deleted: true, propertyId };
    },
    async upsertAvailability(propertyId, input) {
      const prop = properties.find((p) => p.id === propertyId) ?? {
        id: propertyId,
        pricePerNight: 1_500_000,
        inventoryCount: 1,
      };
      const sorted = [...input.dates].map((d) => d.date).sort();
      const overrides = input.dates.map((d) => ({
        propertyId,
        date: d.date,
        isBlocked: d.isBlocked,
        ...(d.overridePrice !== undefined && d.overridePrice !== null
          ? { overridePrice: d.overridePrice }
          : {}),
        ...(d.inventoryOverride !== undefined && d.inventoryOverride !== null
          ? { inventoryOverride: d.inventoryOverride }
          : {}),
        ...(d.note ? { note: d.note } : {}),
      }));
      return buildAvailabilityCalendar(prop, sorted[0], sorted[sorted.length - 1], overrides, []);
    },
    async listReservations() {
      return Object.freeze([]);
    },
    async getAnalytics() {
      return computeHostAnalytics(properties, []);
    },
  };
}

export function createHostPortForMode(options: {
  mode: DataMode;
  apiBaseUrl: string;
  properties?: readonly Property[];
  fetchImpl?: typeof fetch;
}): HostPort {
  return options.mode === "api"
    ? createHttpHostPort({ baseUrl: options.apiBaseUrl, fetchImpl: options.fetchImpl })
    : createMockHostPort({ properties: options.properties });
}
