import {
  API_ENDPOINTS,
  ApiErrorResponseSchema,
  CreateReviewResultSchema,
  PropertyAvailabilityDataSchema,
  createApiSuccessSchema,
  type BookingDetails,
  type CreateReviewInput,
  type CreateReviewResult,
  type Property,
  type PropertyAvailabilityData,
  type PropertyReview,
} from "@luxestay/contracts";
import {
  addDaysIso,
  buildAvailabilityCalendar,
  evaluateReviewEligibility,
  formatIsoDate,
  recalculatePropertyRating,
} from "@luxestay/domain";
import { HttpApiError, isAbortError } from "./errors";
import type { PropertyExperiencePort } from "./types";

const AvailabilitySuccessSchema = createApiSuccessSchema(PropertyAvailabilityDataSchema);
const ReviewSuccessSchema = createApiSuccessSchema(CreateReviewResultSchema);

function createAbortError(): Error {
  const error = new Error("Request aborted");
  error.name = "AbortError";
  return error;
}

export function createHttpPropertyExperiencePort(options?: {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
}): PropertyExperiencePort {
  const baseUrl = (options?.baseUrl ?? "http://localhost:4000").replace(/\/+$/, "");

  function resolveFetch(): typeof fetch {
    const fetchFn = options?.fetchImpl ?? (typeof fetch !== "undefined" ? fetch : undefined);
    if (!fetchFn) {
      throw new HttpApiError({
        status: 0,
        code: "NETWORK_ERROR",
        message: "Fetch API không khả dụng trong môi trường hiện tại.",
      });
    }
    return fetchFn;
  }

  return {
    async getAvailability(propertyId, range, callOptions): Promise<PropertyAvailabilityData> {
      const signal = callOptions?.signal;
      if (signal?.aborted) throw createAbortError();
      const fetchFn = resolveFetch();

      const params = new URLSearchParams();
      if (range?.from) params.set("from", range.from);
      if (range?.to) params.set("to", range.to);
      const query = params.toString() ? `?${params.toString()}` : "";
      const url = `${baseUrl}${API_ENDPOINTS.propertyAvailability(propertyId)}${query}`;

      let response: Response;
      try {
        response = await fetchFn(url, {
          method: "GET",
          credentials: "include",
          headers: { Accept: "application/json" },
          cache: "no-store",
          signal,
        });
      } catch (err) {
        if (isAbortError(err)) throw err;
        throw new HttpApiError({
          status: 0,
          code: "NETWORK_ERROR",
          message: "Không thể tải lịch phòng trống từ máy chủ.",
          details: err instanceof Error ? err.message : undefined,
        });
      }

      const rawBody = await response.json().catch(() => null);
      if (!response.ok) {
        const errParsed = ApiErrorResponseSchema.safeParse(rawBody);
        throw new HttpApiError({
          status: response.status,
          code: errParsed.success ? errParsed.data.error.code : "INTERNAL_ERROR",
          message: errParsed.success
            ? errParsed.data.error.message
            : "Không thể tải lịch phòng trống lúc này.",
          requestId: response.headers.get("x-request-id") ?? undefined,
        });
      }

      const parsed = AvailabilitySuccessSchema.safeParse(rawBody);
      if (!parsed.success) {
        throw new HttpApiError({
          status: response.status,
          code: "CONTRACT_MISMATCH",
          message: "Dữ liệu lịch phòng trống không khớp hợp đồng @luxestay/contracts.",
          requestId: response.headers.get("x-request-id") ?? undefined,
        });
      }

      return parsed.data.data;
    },

    async submitReview(propertyId, input: CreateReviewInput, callOptions): Promise<CreateReviewResult> {
      const signal = callOptions?.signal;
      if (signal?.aborted) throw createAbortError();
      const fetchFn = resolveFetch();

      const url = `${baseUrl}${API_ENDPOINTS.propertyReviews(propertyId)}`;
      let response: Response;
      try {
        response = await fetchFn(url, {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(input),
          signal,
        });
      } catch (err) {
        if (isAbortError(err)) throw err;
        throw new HttpApiError({
          status: 0,
          code: "NETWORK_ERROR",
          message: "Không thể gửi đánh giá xác thực tới máy chủ.",
          details: err instanceof Error ? err.message : undefined,
        });
      }

      const rawBody = await response.json().catch(() => null);
      if (!response.ok) {
        const errParsed = ApiErrorResponseSchema.safeParse(rawBody);
        throw new HttpApiError({
          status: response.status,
          code: errParsed.success ? errParsed.data.error.code : "INTERNAL_ERROR",
          message: errParsed.success
            ? errParsed.data.error.message
            : "Không thể gửi đánh giá lúc này.",
          requestId: response.headers.get("x-request-id") ?? undefined,
        });
      }

      const parsed = ReviewSuccessSchema.safeParse(rawBody);
      if (!parsed.success) {
        throw new HttpApiError({
          status: response.status,
          code: "CONTRACT_MISMATCH",
          message: "Phản hồi đánh giá từ máy chủ không khớp hợp đồng @luxestay/contracts.",
          requestId: response.headers.get("x-request-id") ?? undefined,
        });
      }

      return parsed.data.data;
    },
  };
}

export function createMockPropertyExperiencePort(options?: {
  properties?: readonly Property[];
  getBookings?: () => readonly BookingDetails[];
}): PropertyExperiencePort {
  const reviewedBookingIds = new Set<string>();
  const mockProperties = options?.properties ?? [];

  return {
    async getAvailability(propertyId, range, callOptions) {
      if (callOptions?.signal?.aborted) throw createAbortError();
      const property = mockProperties.find((p) => p.id === propertyId.trim()) ?? {
        id: propertyId.trim(),
        pricePerNight: 1500000,
        inventoryCount: 1,
      };
      const now = new Date();
      const from = range?.from ?? formatIsoDate(now);
      const to = range?.to ?? addDaysIso(from, 44) ?? from;
      const bookings = options?.getBookings?.() ?? [];
      return buildAvailabilityCalendar(property, from, to, [], bookings, now);
    },

    async submitReview(propertyId, input, callOptions) {
      if (callOptions?.signal?.aborted) throw createAbortError();
      const bookingId = input.bookingId.trim().toUpperCase();
      const bookings = options?.getBookings?.() ?? [];
      const booking = bookings.find((b) => b.bookingId?.toUpperCase() === bookingId);
      if (!booking) {
        throw new HttpApiError({
          status: 404,
          code: "NOT_FOUND",
          message: `Không tìm thấy đơn đặt phòng ${bookingId}.`,
        });
      }

      const eligibility = evaluateReviewEligibility(booking, reviewedBookingIds, {
        contact: input.contact,
        authenticatedUserId: booking.userId,
      });
      if (!eligibility.ok) {
        throw new HttpApiError({
          status: eligibility.status,
          code: eligibility.code,
          message: eligibility.error,
        });
      }

      const now = new Date();
      const review: PropertyReview = Object.freeze({
        id: `rev-mock-${Date.now()}`,
        authorName: booking.guestInfo.fullName,
        authorAvatar:
          "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80",
        rating: input.rating,
        date: `Tháng ${now.getMonth() + 1}, ${now.getFullYear()}`,
        comment: input.comment.trim(),
        bookingId,
        isVerified: true,
        createdAt: now.toISOString(),
      });

      const property = mockProperties.find((p) => p.id === propertyId) ?? booking.property;
      const { rating, reviewCount } = recalculatePropertyRating(
        property.rating,
        property.reviewCount,
        property.reviews,
        input.rating
      );
      reviewedBookingIds.add(bookingId);

      return {
        review,
        propertyRating: rating,
        propertyReviewCount: reviewCount,
      };
    },
  };
}
