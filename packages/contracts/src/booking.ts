import { z } from "zod";
import {
  AmenityCategoryIdSchema,
  PaymentMethodSchema,
  ReservationStatusSchema,
  type BookingSessionStep,
  type PaymentMethod,
} from "./common.js";
import {
  PropertySchema,
  type Property,
  type ResolvedPropertyAmenity,
} from "./catalog.js";
import { PaymentTransactionSchema } from "./payment.js";

export const VN_PHONE_REGEX = /^(?:\+?84|0)\d{8,10}$/;
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const GuestsSchema = z.object({
  adults: z.number().int().min(1),
  children: z.number().int().min(0),
  rooms: z.number().int().min(1),
});

export type Guests = z.infer<typeof GuestsSchema>;

export const SelectedBookingAmenitySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category: AmenityCategoryIdSchema,
  pricingType: z.enum(["free-reservation", "paid"]),
  price: z.number().nonnegative(),
  priceUnit: z.string().optional(),
});

export type SelectedBookingAmenity = z.infer<typeof SelectedBookingAmenitySchema>;

export const BookingPricingSchema = z.object({
  basePrice: z.number().nonnegative(),
  nightsTotal: z.number().nonnegative(),
  cleaningFee: z.number().nonnegative(),
  serviceFee: z.number().nonnegative(),
  amenitiesFee: z.number().nonnegative(),
  discount: z.number().nonnegative(),
  appliedPromoCode: z.string().min(1).optional(),
  total: z.number().nonnegative(),
});

export type BookingPricing = z.infer<typeof BookingPricingSchema>;

export const GuestInfoSchema = z.object({
  fullName: z.string().trim().min(1, "Vui lòng điền đầy đủ họ tên, số điện thoại và email!"),
  phone: z
    .string()
    .trim()
    .min(1, "Vui lòng điền đầy đủ họ tên, số điện thoại và email!")
    .refine(
      (val) => VN_PHONE_REGEX.test(val.replace(/[\s.-]/g, "")),
      "Số điện thoại chưa đúng định dạng. Vui lòng kiểm tra lại!"
    ),
  email: z
    .string()
    .trim()
    .min(1, "Vui lòng điền đầy đủ họ tên, số điện thoại và email!")
    .refine(
      (val) => EMAIL_REGEX.test(val),
      "Địa chỉ email chưa đúng định dạng. Vui lòng kiểm tra lại!"
    ),
  note: z
    .string()
    .optional()
    .transform((val) => (val === undefined ? undefined : val.trim() || undefined)),
});

export type GuestInfo = z.infer<typeof GuestInfoSchema>;

export const CheckoutGuestInputSchema = GuestInfoSchema.extend({
  paymentMethod: PaymentMethodSchema,
  promoCode: z
    .string()
    .trim()
    .optional()
    .transform((val) => (val && val.length > 0 ? val.toUpperCase() : undefined)),
});

export interface CheckoutGuestInput {
  fullName: string;
  phone: string;
  email: string;
  note?: string;
  paymentMethod: PaymentMethod;
  promoCode?: string;
}

export const ServerReservationIntentSchema = z.object({
  propertyId: z.string().trim().min(1, "Thiếu mã chỗ nghỉ cần đặt phòng."),
  checkInSeed: z.string().trim().optional(),
  nights: z.number().finite(),
  guests: z.object({
    adults: z.number().finite(),
    children: z.number().finite().default(0),
    rooms: z.number().finite().default(1),
  }),
  selectedAmenityIds: z.array(z.string()).default([]),
  guestInfo: GuestInfoSchema,
  paymentMethod: PaymentMethodSchema,
  promoCode: z
    .string()
    .trim()
    .max(64)
    .optional()
    .transform((val) => (val && val.length > 0 ? val.toUpperCase() : undefined)),
});

export type ServerReservationIntent = z.infer<typeof ServerReservationIntentSchema>;

export const ReservationLookupInputSchema = z.object({
  bookingId: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập mã đặt phòng (ví dụ: LX-123456).")
    .transform((val) => val.toUpperCase()),
  contact: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập email hoặc số điện thoại đã dùng khi đặt phòng."),
});

export type ReservationLookupInput = z.infer<typeof ReservationLookupInputSchema>;

export const CancelReservationInputSchema = z.object({
  contact: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập email hoặc số điện thoại để xác nhận chủ đơn.")
    .optional(),
  reason: z
    .string()
    .max(500, "Lý do hủy không được vượt quá 500 ký tự.")
    .optional()
    .transform((val) => (val === undefined ? undefined : val.trim() || undefined)),
});

export type CancelReservationInput = z.infer<typeof CancelReservationInputSchema>;

export const BookingDetailsSchema = z.object({
  property: PropertySchema,
  checkIn: z.string().min(1),
  checkOut: z.string().min(1),
  nights: z.number().int().min(1),
  guests: GuestsSchema,
  pricing: BookingPricingSchema,
  selectedAmenities: z.array(SelectedBookingAmenitySchema).readonly(),
  guestInfo: z.object({
    fullName: z.string().min(1),
    email: z.string().min(1),
    phone: z.string().min(1),
    note: z.string().optional(),
  }),
  paymentMethod: PaymentMethodSchema,
  bookingId: z.string().min(1).optional(),
  userId: z.string().min(1).optional(),
  createdAt: z.string().min(1).optional(),
  status: ReservationStatusSchema.default("confirmed"),
  paymentExpiresAt: z.string().min(1).optional(),
  payment: PaymentTransactionSchema.optional(),
  cancelledAt: z.string().min(1).optional(),
  cancellationReason: z.string().min(1).optional(),
});

export type BookingDetails = z.infer<typeof BookingDetailsSchema>;

export interface BookingSessionState {
  step: BookingSessionStep;
  property: Property | null;
  searchSeedKey: string;
  checkInSeed: string;
  nights: number;
  guests: Guests;
  selectedAmenityIds: string[];
  promoCode?: string;
  confirmedBooking: BookingDetails | null;
}

export interface BookingQuote {
  property: Property;
  nights: number;
  checkIn: string;
  checkOut: string;
  guests: Guests;
  resolvedAmenities: ResolvedPropertyAmenity[];
  selectedAmenityIds: string[];
  selectedAmenities: SelectedBookingAmenity[];
  pricing: BookingPricing;
}

export interface ReservationSubmissionRequest {
  quote: BookingQuote;
  guestInfo: {
    fullName: string;
    phone: string;
    email: string;
    note?: string;
  };
  paymentMethod: PaymentMethod;
  promoCode?: string;
}

export interface ReservationSubmitter {
  submit(
    request: ReservationSubmissionRequest,
    options?: { signal?: AbortSignal }
  ): Promise<BookingDetails>;
}
