import { z } from "zod";
import { NightlyPriceReasonSchema } from "./common.js";
import { PropertyReviewSchema } from "./catalog.js";

export const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const NightlyPriceBreakdownSchema = z.object({
  date: z.string().regex(ISO_DATE_REGEX),
  basePrice: z.number().nonnegative(),
  effectivePrice: z.number().nonnegative(),
  reason: NightlyPriceReasonSchema,
});

export type NightlyPriceBreakdown = z.infer<typeof NightlyPriceBreakdownSchema>;

export const PropertyAvailabilityOverrideSchema = z.object({
  propertyId: z.string().min(1),
  date: z.string().regex(ISO_DATE_REGEX),
  isBlocked: z.boolean().default(false),
  overridePrice: z.number().int().nonnegative().optional(),
  inventoryOverride: z.number().int().nonnegative().optional(),
  note: z.string().max(250).optional(),
  updatedAt: z.string().min(1).optional(),
});

export type PropertyAvailabilityOverride = z.infer<typeof PropertyAvailabilityOverrideSchema>;

export const AvailabilityDaySchema = z.object({
  date: z.string().regex(ISO_DATE_REGEX),
  totalUnits: z.number().int().nonnegative(),
  bookedUnits: z.number().int().nonnegative(),
  remainingUnits: z.number().int().nonnegative(),
  isBlocked: z.boolean(),
  isAvailable: z.boolean(),
  basePrice: z.number().nonnegative(),
  effectivePrice: z.number().nonnegative(),
  priceReason: NightlyPriceReasonSchema,
  note: z.string().optional(),
});

export type AvailabilityDay = z.infer<typeof AvailabilityDaySchema>;

export const PropertyAvailabilityDataSchema = z.object({
  propertyId: z.string().min(1),
  inventoryCount: z.number().int().positive(),
  from: z.string().regex(ISO_DATE_REGEX),
  to: z.string().regex(ISO_DATE_REGEX),
  days: z.array(AvailabilityDaySchema).readonly(),
});

export type PropertyAvailabilityData = z.infer<typeof PropertyAvailabilityDataSchema>;

export const CompleteReservationInputSchema = z.object({
  contact: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập email hoặc số điện thoại để xác nhận chủ đơn.")
    .optional(),
});

export type CompleteReservationInput = z.infer<typeof CompleteReservationInputSchema>;

export const CreateReviewInputSchema = z.object({
  bookingId: z
    .string()
    .trim()
    .min(1, "Thiếu mã đặt phòng cần đánh giá.")
    .transform((val) => val.toUpperCase()),
  rating: z
    .number()
    .min(1, "Điểm đánh giá tối thiểu là 1 sao.")
    .max(5, "Điểm đánh giá tối đa là 5 sao."),
  comment: z
    .string()
    .trim()
    .min(10, "Nhận xét cần tối thiểu 10 ký tự để hữu ích cho các khách khác.")
    .max(1000, "Nhận xét không vượt quá 1000 ký tự."),
  contact: z
    .string()
    .trim()
    .min(1)
    .optional(),
});

export type CreateReviewInput = z.infer<typeof CreateReviewInputSchema>;

export const CreateReviewResultSchema = z.object({
  review: PropertyReviewSchema,
  propertyRating: z.number().min(0).max(5),
  propertyReviewCount: z.number().int().nonnegative(),
});

export type CreateReviewResult = z.infer<typeof CreateReviewResultSchema>;
