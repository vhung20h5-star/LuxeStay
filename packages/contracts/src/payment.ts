import { z } from "zod";
import {
  PaymentProviderSchema,
  PaymentTransactionStatusSchema,
  ReservationStatusSchema,
} from "./common.js";

export const PaymentTransactionSchema = z.object({
  transactionId: z.string().min(1),
  bookingId: z.string().min(1),
  provider: PaymentProviderSchema,
  amount: z.number().nonnegative(),
  currency: z.literal("VND"),
  status: PaymentTransactionStatusSchema,
  checkoutUrl: z.string().min(1),
  expiresAt: z.string().min(1),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
  paidAt: z.string().min(1).optional(),
  failureReason: z.string().min(1).optional(),
});

export type PaymentTransaction = z.infer<typeof PaymentTransactionSchema>;

export const PaymentOutcomeSchema = z.enum(["succeeded", "failed", "expired"]);

export type PaymentOutcome = z.infer<typeof PaymentOutcomeSchema>;

export const PaymentWebhookPayloadSchema = z.object({
  eventId: z.string().trim().min(1),
  transactionId: z.string().trim().min(1),
  bookingId: z.string().trim().min(1),
  provider: PaymentProviderSchema,
  outcome: PaymentOutcomeSchema,
  amount: z.number().nonnegative(),
  reason: z.string().max(500).optional(),
  occurredAt: z.string().min(1),
});

export type PaymentWebhookPayload = z.infer<typeof PaymentWebhookPayloadSchema>;

export const PaymentWebhookResultSchema = z.object({
  received: z.literal(true),
  deduplicated: z.boolean(),
  transaction: PaymentTransactionSchema,
  bookingStatus: ReservationStatusSchema,
});

export type PaymentWebhookResult = z.infer<typeof PaymentWebhookResultSchema>;

export const PaymentSimulateInputSchema = z.object({
  outcome: PaymentOutcomeSchema,
  reason: z.string().max(500).optional(),
});

export type PaymentSimulateInput = z.infer<typeof PaymentSimulateInputSchema>;

export const NotificationTypeSchema = z.enum([
  "booking_confirmed",
  "booking_cancelled",
  "payment_failed",
]);

export type NotificationType = z.infer<typeof NotificationTypeSchema>;

export const NotificationLogSchema = z.object({
  id: z.string().min(1),
  bookingId: z.string().min(1),
  recipientEmail: z.string().min(1),
  channel: z.literal("email"),
  type: NotificationTypeSchema,
  subject: z.string().min(1),
  previewText: z.string().min(1),
  htmlBody: z.string().min(1),
  status: z.enum(["sent", "logged"]),
  createdAt: z.string().min(1),
});

export type NotificationLog = z.infer<typeof NotificationLogSchema>;

export const PaymentGatewaySessionSchema = z.object({
  transaction: PaymentTransactionSchema,
  bookingSummary: z.object({
    bookingId: z.string().min(1),
    propertyTitle: z.string().min(1),
    propertyCity: z.string().min(1),
    checkIn: z.string().min(1),
    checkOut: z.string().min(1),
    nights: z.number().int().min(1),
    guestFullName: z.string().min(1),
    guestEmail: z.string().min(1),
    status: ReservationStatusSchema,
  }),
  sandboxEnabled: z.boolean(),
});

export type PaymentGatewaySession = z.infer<typeof PaymentGatewaySessionSchema>;
