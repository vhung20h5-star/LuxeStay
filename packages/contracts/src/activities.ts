import { z } from "zod";
import { PaymentMethodSchema } from "./common.js";
import { PromotionVoucherSchema, PropertySchema } from "./catalog.js";

const ACTIVITY_VN_PHONE_REGEX = /^(?:\+?84|0)\d{8,10}$/;
const ACTIVITY_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const ActivityCategorySchema = z.enum([
  "tour",
  "experience",
  "transfer",
  "wellness",
  "culinary",
]);

export type ActivityCategory = z.infer<typeof ActivityCategorySchema>;

export const ActivityHubSectionSchema = z.enum([
  "attractions",
  "tours",
  "essentials",
  "entertainment",
]);

export type ActivityHubSection = z.infer<typeof ActivityHubSectionSchema>;

export const ActivitySubcategorySchema = z.enum([
  "theme-park",
  "heritage-culture",
  "island-sea",
  "mountain-nature",
  "local-workshop",
  "airport-transfer",
  "sim-wifi",
  "fast-track",
  "live-show",
  "spa-wellness",
  "dining-cruise",
]);

export type ActivitySubcategory = z.infer<typeof ActivitySubcategorySchema>;

export const ActivityTimeSlotPeriodSchema = z.enum([
  "morning",
  "afternoon",
  "evening",
  "flexible",
]);

export type ActivityTimeSlotPeriod = z.infer<typeof ActivityTimeSlotPeriodSchema>;

export const ActivitySlotSchema = z.object({
  id: z.string().trim().min(1),
  startTime: z.string().trim().min(1),
  endTime: z.string().trim().min(1).optional(),
  period: ActivityTimeSlotPeriodSchema,
  label: z.string().trim().min(1),
  maxCapacity: z.number().int().min(1),
  priceModifier: z.number().int().default(0),
});

export type ActivitySlot = z.infer<typeof ActivitySlotSchema>;

export const TransferDetailsSchema = z.object({
  routeFrom: z.string().trim().min(1),
  routeTo: z.string().trim().min(1),
  vehicleType: z.string().trim().min(1),
  maxPassengers: z.number().int().min(1),
  maxLuggage: z.number().int().min(0),
  roundTripAvailable: z.boolean().default(true),
});

export type TransferDetails = z.infer<typeof TransferDetailsSchema>;

export const AttractionDetailsSchema = z.object({
  openingHours: z.string().trim().min(1),
  entryMethod: z.string().trim().min(1),
  ageOrHeightNote: z.string().trim().min(1).optional(),
  venueAddress: z.string().trim().min(1),
});

export type AttractionDetails = z.infer<typeof AttractionDetailsSchema>;

export const EssentialDetailsSchema = z.object({
  deliveryMethod: z.string().trim().min(1),
  validityWindow: z.string().trim().min(1),
  activationNote: z.string().trim().min(1),
});

export type EssentialDetails = z.infer<typeof EssentialDetailsSchema>;

export const ActivityItineraryStepSchema = z.object({
  timeOrStep: z.string().trim().min(1),
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
});

export type ActivityItineraryStep = z.infer<typeof ActivityItineraryStepSchema>;

export const ActivityGoodToKnowCategorySchema = z.enum([
  "dress-code",
  "weather",
  "health-age",
  "bring",
  "policy",
  "tip",
]);

export type ActivityGoodToKnowCategory = z.infer<typeof ActivityGoodToKnowCategorySchema>;

export const ActivityGoodToKnowItemSchema = z.object({
  category: ActivityGoodToKnowCategorySchema,
  title: z.string().trim().min(1),
  detail: z.string().trim().min(1),
});

export type ActivityGoodToKnowItem = z.infer<typeof ActivityGoodToKnowItemSchema>;

export const ActivityHowToUseSchema = z.object({
  ticketType: z.string().trim().min(1),
  steps: z.array(z.string().trim().min(1)).min(1),
  arrivalLeadTime: z.string().trim().min(1),
  requiredDocuments: z.string().trim().min(1).optional(),
});

export type ActivityHowToUse = z.infer<typeof ActivityHowToUseSchema>;

export const ActivityCancellationPolicySchema = z.object({
  headline: z.string().trim().min(1),
  refundWindowHours: z.number().int().nonnegative().default(24),
  rules: z.array(z.string().trim().min(1)).min(1),
  rescheduleNote: z.string().trim().min(1).optional(),
  weatherNote: z.string().trim().min(1).optional(),
});

export type ActivityCancellationPolicy = z.infer<typeof ActivityCancellationPolicySchema>;

export const TravelActivitySchema = z.object({
  id: z.string().trim().min(1),
  slug: z.string().trim().min(1),
  title: z.string().trim().min(1),
  subtitle: z.string().trim().min(1),
  category: ActivityCategorySchema,
  hubSection: ActivityHubSectionSchema.default("tours"),
  subcategory: ActivitySubcategorySchema.default("local-workshop"),
  destinationCity: z.string().trim().min(1),
  province: z.string().trim().min(1),
  meetingPoint: z.string().trim().min(1),
  durationLabel: z.string().trim().min(1),
  pricePerUnit: z.number().int().nonnegative(),
  unitLabel: z.string().trim().min(1),
  originalPrice: z.number().int().positive().optional(),
  rating: z.number().min(0).max(5),
  reviewCount: z.number().int().nonnegative(),
  images: z.array(z.string().trim().min(1)).min(1),
  imageCaptions: z.array(z.string().trim().min(1)).optional(),
  highlights: z.array(z.string().trim().min(1)).min(1),
  included: z.array(z.string().trim().min(1)).min(1),
  excluded: z.array(z.string().trim().min(1)).default([]),
  itinerary: z.array(ActivityItineraryStepSchema).default([]),
  knowBeforeYouGo: z.array(ActivityGoodToKnowItemSchema).default([]),
  howToUse: ActivityHowToUseSchema.optional(),
  cancellationPolicy: ActivityCancellationPolicySchema.optional(),
  suitableFor: z.array(z.string().trim().min(1)).default([]),
  languages: z.array(z.string().trim().min(1)).default(["Tiếng Việt", "Tiếng Anh"]),
  freeCancellation: z.boolean().default(true),
  instantConfirmation: z.boolean().default(true),
  slots: z.array(ActivitySlotSchema).min(1),
  transferDetails: TransferDetailsSchema.optional(),
  attractionDetails: AttractionDetailsSchema.optional(),
  essentialDetails: EssentialDetailsSchema.optional(),
  isFeatured: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export type TravelActivity = z.infer<typeof TravelActivitySchema>;

export const TransferServiceSchema = TravelActivitySchema.extend({
  category: z.literal("transfer"),
  transferDetails: TransferDetailsSchema,
});

export type TransferService = z.infer<typeof TransferServiceSchema>;

export const ActivityGuestInfoSchema = z.object({
  fullName: z.string().trim().min(1, "Vui lòng điền đầy đủ họ tên, số điện thoại và email!"),
  phone: z
    .string()
    .trim()
    .min(1, "Vui lòng điền đầy đủ họ tên, số điện thoại và email!")
    .refine(
      (val) => ACTIVITY_VN_PHONE_REGEX.test(val.replace(/[\s.-]/g, "")),
      "Số điện thoại chưa đúng định dạng. Vui lòng kiểm tra lại!"
    ),
  email: z
    .string()
    .trim()
    .min(1, "Vui lòng điền đầy đủ họ tên, số điện thoại và email!")
    .refine(
      (val) => ACTIVITY_EMAIL_REGEX.test(val),
      "Địa chỉ email chưa đúng định dạng. Vui lòng kiểm tra lại!"
    ),
  note: z
    .string()
    .optional()
    .transform((val) => (val === undefined ? undefined : val.trim() || undefined)),
});

export type ActivityGuestInfo = z.infer<typeof ActivityGuestInfoSchema>;

export const ServiceBookingIntentSchema = z.object({
  activityId: z.string().trim().min(1, "Thiếu mã dịch vụ cần đặt."),
  slotId: z.string().trim().min(1, "Vui lòng chọn khung giờ tham gia."),
  dateIso: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày khởi hành phải theo định dạng YYYY-MM-DD."),
  quantity: z.number().int().min(1, "Số lượng tối thiểu là 1.").max(20, "Số lượng tối đa là 20."),
  guestInfo: ActivityGuestInfoSchema,
  paymentMethod: PaymentMethodSchema.default("hotel"),
  promoCode: z
    .string()
    .trim()
    .max(64)
    .optional()
    .transform((val) => (val && val.length > 0 ? val.toUpperCase() : undefined)),
  linkedReservationId: z
    .string()
    .trim()
    .max(64)
    .optional()
    .transform((val) => (val && val.length > 0 ? val.toUpperCase() : undefined)),
});

export type ServiceBookingIntent = z.infer<typeof ServiceBookingIntentSchema>;

export const ActivityBookingStatusSchema = z.enum(["confirmed", "cancelled"]);

export type ActivityBookingStatus = z.infer<typeof ActivityBookingStatusSchema>;

export const ActivityBookingSchema = z.object({
  bookingId: z.string().trim().min(1),
  activityId: z.string().trim().min(1),
  activitySlug: z.string().trim().min(1),
  activityTitle: z.string().trim().min(1),
  activityCategory: ActivityCategorySchema,
  activityImage: z.string().trim().min(1),
  destinationCity: z.string().trim().min(1),
  slotId: z.string().trim().min(1),
  slotLabel: z.string().trim().min(1),
  dateIso: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
  quantity: z.number().int().min(1),
  unitLabel: z.string().trim().min(1),
  unitPrice: z.number().int().nonnegative(),
  subtotal: z.number().int().nonnegative(),
  discount: z.number().int().nonnegative(),
  appliedPromoCode: z.string().trim().min(1).optional(),
  total: z.number().int().nonnegative(),
  guestInfo: z.object({
    fullName: z.string().min(1),
    email: z.string().min(1),
    phone: z.string().min(1),
    note: z.string().optional(),
  }),
  paymentMethod: PaymentMethodSchema,
  userId: z.string().min(1).optional(),
  linkedReservationId: z.string().min(1).optional(),
  freeCancellation: z.boolean().default(true),
  status: ActivityBookingStatusSchema.default("confirmed"),
  createdAt: z.string().min(1),
  cancelledAt: z.string().min(1).optional(),
  cancellationReason: z.string().min(1).optional(),
});

export type ActivityBooking = z.infer<typeof ActivityBookingSchema>;

export const SelectedBundleActivityInputSchema = z.object({
  activityId: z.string().trim().min(1),
  slotId: z.string().trim().min(1),
  dateIso: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
  quantity: z.number().int().min(1).max(20).default(1),
});

export type SelectedBundleActivityInput = z.infer<typeof SelectedBundleActivityInputSchema>;

export const BookedBundleActivitySchema = z.object({
  id: z.string().trim().min(1),
  activityId: z.string().trim().min(1),
  activitySlug: z.string().trim().min(1),
  activityTitle: z.string().trim().min(1),
  activityCategory: ActivityCategorySchema,
  slotId: z.string().trim().min(1),
  slotLabel: z.string().trim().min(1),
  dateIso: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
  quantity: z.number().int().min(1),
  unitLabel: z.string().trim().min(1),
  unitPrice: z.number().int().nonnegative(),
  totalPrice: z.number().int().nonnegative(),
  status: ActivityBookingStatusSchema.default("confirmed"),
  cancelledAt: z.string().min(1).optional(),
  cancellationReason: z.string().min(1).optional(),
});

export type BookedBundleActivity = z.infer<typeof BookedBundleActivitySchema>;

export const ActivitySortOptionSchema = z.enum([
  "popular",
  "price-asc",
  "price-desc",
  "rating",
]);

export type ActivitySortOption = z.infer<typeof ActivitySortOptionSchema>;

export const ActivitiesQueryParamsSchema = z.object({
  city: z.string().trim().optional(),
  search: z.string().trim().optional(),
  category: z.union([ActivityCategorySchema, z.literal("all")]).optional(),
  section: z.union([ActivityHubSectionSchema, z.literal("explore")]).optional(),
  subcategory: z.union([ActivitySubcategorySchema, z.literal("all")]).optional(),
  period: z.union([ActivityTimeSlotPeriodSchema, z.literal("all")]).optional(),
  maxPrice: z.number().nonnegative().optional(),
  sortBy: ActivitySortOptionSchema.optional(),
});

export type ActivitiesQueryParams = z.infer<typeof ActivitiesQueryParamsSchema>;

export const ActivitiesCatalogResponseSchema = z.object({
  activities: z.array(TravelActivitySchema).readonly(),
  cities: z.array(z.string().min(1)).readonly(),
  categories: z.array(ActivityCategorySchema).readonly(),
  sections: z.array(ActivityHubSectionSchema).readonly().optional(),
  subcategories: z.array(ActivitySubcategorySchema).readonly().optional(),
});

export type ActivitiesCatalogResponse = z.infer<typeof ActivitiesCatalogResponseSchema>;

export const ActivityDetailResponseSchema = z.object({
  activity: TravelActivitySchema,
  relatedStays: z.array(PropertySchema).readonly(),
  availableVouchers: z.array(PromotionVoucherSchema).readonly(),
});

export type ActivityDetailResponse = z.infer<typeof ActivityDetailResponseSchema>;
