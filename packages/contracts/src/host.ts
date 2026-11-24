import { z } from "zod";
import { ISO_DATE_REGEX } from "./availability.js";
import { BookingDetailsSchema } from "./booking.js";
import { PropertySchema } from "./catalog.js";
import { CategoryIdSchema, PropertyTypeSchema } from "./common.js";

export const CreateHostPropertyInputSchema = z.object({
  title: z.string().trim().min(5, "Tên chỗ nghỉ cần tối thiểu 5 ký tự.").max(140),
  subtitle: z.string().trim().min(5, "Mô tả ngắn cần tối thiểu 5 ký tự.").max(240),
  propertyType: PropertyTypeSchema,
  category: CategoryIdSchema.refine((c) => c !== "all", "Vui lòng chọn danh mục trải nghiệm."),
  location: z.object({
    city: z.string().trim().min(2, "Vui lòng nhập thành phố.").max(80),
    province: z.string().trim().min(2, "Vui lòng nhập tỉnh/thành.").max(80),
    address: z.string().trim().min(4, "Vui lòng nhập địa chỉ chi tiết.").max(200),
    distanceToCenter: z.string().trim().min(2).max(120).default("Cách trung tâm 2 km"),
  }),
  images: z
    .array(z.string().trim().url("URL hình ảnh không hợp lệ."))
    .min(1, "Cần tối thiểu 1 hình ảnh đại diện.")
    .max(10),
  pricePerNight: z.number().int().min(100_000, "Giá tối thiểu 100.000đ / đêm.").max(100_000_000),
  originalPrice: z.number().int().min(100_000).max(200_000_000).optional(),
  inventoryCount: z.number().int().min(1).max(100).default(1),
  maxGuests: z.number().int().min(1).max(30),
  bedrooms: z.number().int().min(0).max(20),
  beds: z.number().int().min(1).max(30),
  bathrooms: z.number().int().min(1).max(20),
  freeCancellation: z.boolean().default(true),
  breakfastIncluded: z.boolean().default(false),
  description: z.string().trim().min(20, "Mô tả chi tiết cần tối thiểu 20 ký tự.").max(3000),
  amenityIds: z.array(z.string().trim().min(1)).max(30).default([]),
});

export type CreateHostPropertyInput = z.infer<typeof CreateHostPropertyInputSchema>;

export const UpdateHostPropertyInputSchema = z.object({
  title: z.string().trim().min(5).max(140).optional(),
  subtitle: z.string().trim().min(5).max(240).optional(),
  propertyType: PropertyTypeSchema.optional(),
  category: CategoryIdSchema.refine((c) => c !== "all").optional(),
  pricePerNight: z.number().int().min(100_000).max(100_000_000).optional(),
  originalPrice: z.number().int().min(100_000).max(200_000_000).nullable().optional(),
  inventoryCount: z.number().int().min(1).max(100).optional(),
  maxGuests: z.number().int().min(1).max(30).optional(),
  bedrooms: z.number().int().min(0).max(20).optional(),
  beds: z.number().int().min(1).max(30).optional(),
  bathrooms: z.number().int().min(1).max(20).optional(),
  freeCancellation: z.boolean().optional(),
  breakfastIncluded: z.boolean().optional(),
  description: z.string().trim().min(20).max(3000).optional(),
  amenityIds: z.array(z.string().trim().min(1)).max(30).optional(),
});

export type UpdateHostPropertyInput = z.infer<typeof UpdateHostPropertyInputSchema>;

export const HostAvailabilityDateUpdateSchema = z.object({
  date: z.string().regex(ISO_DATE_REGEX, "Ngày phải có định dạng YYYY-MM-DD."),
  isBlocked: z.boolean().default(false),
  overridePrice: z.number().int().min(0).max(200_000_000).nullable().optional(),
  inventoryOverride: z.number().int().min(0).max(100).nullable().optional(),
  note: z.string().trim().max(240).nullable().optional(),
});

export type HostAvailabilityDateUpdate = z.infer<typeof HostAvailabilityDateUpdateSchema>;

export const UpsertHostAvailabilityInputSchema = z.object({
  dates: z
    .array(HostAvailabilityDateUpdateSchema)
    .min(1, "Cần chọn ít nhất 1 ngày để cập nhật.")
    .max(60, "Chỉ hỗ trợ cập nhật tối đa 60 ngày mỗi lần."),
});

export type UpsertHostAvailabilityInput = z.infer<typeof UpsertHostAvailabilityInputSchema>;

export const HostPropertyAnalyticsRowSchema = z.object({
  propertyId: z.string().min(1),
  title: z.string().min(1),
  city: z.string().min(1),
  bookingsCount: z.number().int().nonnegative(),
  confirmedRevenue: z.number().nonnegative(),
  completedRevenue: z.number().nonnegative(),
  totalRevenue: z.number().nonnegative(),
  occupancyNights: z.number().int().nonnegative(),
});

export type HostPropertyAnalyticsRow = z.infer<typeof HostPropertyAnalyticsRowSchema>;

export const HostMonthlyRevenueRowSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
  revenue: z.number().nonnegative(),
  bookingsCount: z.number().int().nonnegative(),
});

export type HostMonthlyRevenueRow = z.infer<typeof HostMonthlyRevenueRowSchema>;

export const HostAnalyticsDataSchema = z.object({
  totalRevenue: z.number().nonnegative(),
  confirmedRevenue: z.number().nonnegative(),
  completedRevenue: z.number().nonnegative(),
  totalBookings: z.number().int().nonnegative(),
  confirmedBookings: z.number().int().nonnegative(),
  completedBookings: z.number().int().nonnegative(),
  pendingBookings: z.number().int().nonnegative(),
  cancelledBookings: z.number().int().nonnegative(),
  averageOrderValue: z.number().nonnegative(),
  totalProperties: z.number().int().nonnegative(),
  propertyBreakdown: z.array(HostPropertyAnalyticsRowSchema).readonly(),
  monthlyRevenue: z.array(HostMonthlyRevenueRowSchema).readonly(),
});

export type HostAnalyticsData = z.infer<typeof HostAnalyticsDataSchema>;

export const HostPropertiesListDataSchema = z.object({
  properties: z.array(PropertySchema).readonly(),
});

export type HostPropertiesListData = z.infer<typeof HostPropertiesListDataSchema>;

export const HostReservationsListDataSchema = z.object({
  bookings: z.array(BookingDetailsSchema).readonly(),
});

export type HostReservationsListData = z.infer<typeof HostReservationsListDataSchema>;
