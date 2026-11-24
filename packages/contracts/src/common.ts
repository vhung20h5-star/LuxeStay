import { z } from "zod";

export const ErrorCodeSchema = z.enum([
  "VALIDATION_ERROR",
  "FORBIDDEN",
  "NOT_FOUND",
  "CONFLICT",
  "UNPROCESSABLE_ENTITY",
  "INVALID_JSON",
  "INTERNAL_ERROR",
  "NETWORK_ERROR",
  "CONTRACT_MISMATCH",
]);

export type ErrorCode = z.infer<typeof ErrorCodeSchema>;

export const ApiMetaSchema = z.object({
  requestId: z.string().min(1).optional(),
  timestamp: z.string().min(1),
});

export type ApiMeta = z.infer<typeof ApiMetaSchema>;

export const ApiErrorPayloadSchema = z.object({
  code: ErrorCodeSchema,
  message: z.string().min(1),
  details: z.unknown().optional(),
});

export type ApiErrorPayload = z.infer<typeof ApiErrorPayloadSchema>;

export const ApiErrorResponseSchema = z.object({
  ok: z.literal(false),
  error: ApiErrorPayloadSchema,
  meta: ApiMetaSchema.optional(),
});

export type ApiErrorResponse = z.infer<typeof ApiErrorResponseSchema>;

export interface ApiSuccessResponse<T> {
  ok: true;
  data: T;
  meta?: ApiMeta;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export function createApiSuccessSchema<T extends z.ZodTypeAny>(dataSchema: T) {
  return z.object({
    ok: z.literal(true),
    data: dataSchema,
    meta: ApiMetaSchema.optional(),
  });
}

export function buildApiSuccess<T>(data: T, meta?: ApiMeta): ApiSuccessResponse<T> {
  return meta ? { ok: true, data, meta } : { ok: true, data };
}

export function buildApiError(
  code: ErrorCode,
  message: string,
  details?: unknown,
  meta?: ApiMeta
): ApiErrorResponse {
  const error: ApiErrorPayload =
    details !== undefined ? { code, message, details } : { code, message };
  return meta ? { ok: false, error, meta } : { ok: false, error };
}

// ============================================
// Shared Domain Enums
// ============================================

export const PropertyTypeSchema = z.enum([
  "hotel",
  "homestay",
  "villa",
  "resort",
  "glamping",
]);

export type PropertyType = z.infer<typeof PropertyTypeSchema>;

export const CategoryIdSchema = z.enum([
  "all",
  "mountain-view",
  "beachfront",
  "vintage-homestay",
  "infinity-pool",
  "ecolodge",
  "city-center",
  "pine-forest",
  "luxury-resort",
]);

export type CategoryId = z.infer<typeof CategoryIdSchema>;

export const AmenityCategoryIdSchema = z.enum([
  "pool-beach",
  "sports-recreation",
  "dining",
  "hotel-spa",
  "transport",
  "room-family",
  "security-general",
]);

export type AmenityCategoryId = z.infer<typeof AmenityCategoryIdSchema>;

export const AmenityPricingTypeSchema = z.enum([
  "included",
  "free-reservation",
  "paid",
]);

export type AmenityPricingType = z.infer<typeof AmenityPricingTypeSchema>;

export const AmenityFilterKeySchema = z.enum([
  "pool",
  "beach",
  "sports-gym",
  "dining",
  "spa-wellness",
  "transport-shuttle",
  "bbq-campfire",
  "bath-fireplace",
  "family-pet",
]);

export type AmenityFilterKey = z.infer<typeof AmenityFilterKeySchema>;

export const PaymentMethodSchema = z.enum(["momo", "vnpay", "card", "hotel"]);

export type PaymentMethod = z.infer<typeof PaymentMethodSchema>;

export const SortOptionSchema = z.enum([
  "popular",
  "price-asc",
  "price-desc",
  "rating-desc",
]);

export type SortOption = z.infer<typeof SortOptionSchema>;

export const AmenityFeeFilterSchema = z.enum(["all", "free", "paid", "selected"]);

export type AmenityFeeFilter = z.infer<typeof AmenityFeeFilterSchema>;

export const ActiveFilterChipKindSchema = z.enum([
  "destination",
  "category",
  "price",
  "propertyType",
  "rating",
  "amenity",
  "freeCancellation",
]);

export type ActiveFilterChipKind = z.infer<typeof ActiveFilterChipKindSchema>;

export const BookingSessionStepSchema = z.enum([
  "idle",
  "previewing",
  "checking-out",
  "confirmed",
]);

export type BookingSessionStep = z.infer<typeof BookingSessionStepSchema>;

export const ReservationStatusSchema = z.enum(["confirmed", "cancelled"]);

export type ReservationStatus = z.infer<typeof ReservationStatusSchema>;

export const HealthDataSchema = z.object({
  status: z.literal("ok"),
  service: z.string().min(1),
});

export type HealthData = z.infer<typeof HealthDataSchema>;
