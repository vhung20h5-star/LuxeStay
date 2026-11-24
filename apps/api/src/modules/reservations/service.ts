import { randomUUID } from "node:crypto";
import type {
  AuthUser,
  BookingDetails,
  ErrorCode,
  NotificationLog,
  ServerReservationIntent,
} from "@luxestay/contracts";
import {
  canAccessReservation,
  evaluateReservationCancellation,
  processServerReservationIntent,
} from "@luxestay/domain";
import type { ApiCatalogRepository } from "../catalog/repository.js";
import type { NotificationService } from "../notifications/service.js";
import type { ApiPaymentRepository } from "../payments/repository.js";
import type { PaymentService } from "../payments/service.js";
import type { ApiReservationRepository } from "./repository.js";

export type ReservationOperationResult =
  | { ok: true; booking: BookingDetails }
  | { ok: false; code: ErrorCode; message: string; status: 400 | 403 | 404 | 409 | 422 };

export type ReservationNotificationsResult =
  | { ok: true; notifications: readonly NotificationLog[] }
  | { ok: false; code: ErrorCode; message: string; status: 403 | 404 };

export interface ReservationService {
  createReservation(
    intent: ServerReservationIntent,
    context?: { authUser?: AuthUser | null }
  ): Promise<ReservationOperationResult>;
  listMyReservations(userId: string): Promise<readonly BookingDetails[]>;
  lookupReservation(
    bookingId: string,
    credentials: { contact?: string; authUser?: AuthUser | null }
  ): Promise<ReservationOperationResult>;
  cancelReservation(
    bookingId: string,
    input: { contact?: string; reason?: string },
    context?: { authUser?: AuthUser | null }
  ): Promise<ReservationOperationResult>;
  listReservationNotifications(
    bookingId: string,
    credentials: { contact?: string; authUser?: AuthUser | null }
  ): Promise<ReservationNotificationsResult>;
}

function mapStatusToErrorCode(status: 400 | 404 | 422): ErrorCode {
  if (status === 404) return "NOT_FOUND";
  if (status === 422) return "UNPROCESSABLE_ENTITY";
  return "VALIDATION_ERROR";
}

export function createReservationService(deps: {
  catalogRepository: ApiCatalogRepository;
  reservationRepository: ApiReservationRepository;
  paymentRepository: ApiPaymentRepository;
  paymentService: PaymentService;
  notificationService: NotificationService;
}): ReservationService {
  async function attachLatestPayment(booking: BookingDetails): Promise<BookingDetails> {
    if (!booking.bookingId) return booking;
    const latestPayment = await deps.paymentRepository.findLatestByBookingId(booking.bookingId);
    if (!latestPayment) return booking;
    return Object.freeze({
      ...booking,
      payment: latestPayment,
    });
  }

  return {
    async createReservation(intent, context) {
      const snapshot = await deps.catalogRepository.getSnapshot();
      const bookingId = `LX-${randomUUID().replace(/-/g, "").slice(0, 6).toUpperCase()}`;
      const authUser = context?.authUser ?? null;

      const result = processServerReservationIntent(intent, snapshot.properties, {
        bookingId,
        createdAt: new Date().toISOString(),
        vouchers: snapshot.promotions.vouchers,
        userId: authUser?.id,
        isAuthenticated: Boolean(authUser),
      });

      if (!result.ok) {
        return {
          ok: false,
          code: mapStatusToErrorCode(result.status),
          message: result.error,
          status: result.status,
        };
      }

      const saved = await deps.reservationRepository.save(result.booking);

      if (saved.paymentMethod === "hotel") {
        await deps.notificationService.sendBookingNotification(saved, "booking_confirmed");
        return { ok: true, booking: saved };
      }

      // Online payment -> create pending PaymentTransaction & return checkoutUrl on booking.payment
      const transaction = await deps.paymentService.createTransactionForBooking(saved);
      const enriched: BookingDetails = Object.freeze({
        ...saved,
        payment: transaction,
      });
      return { ok: true, booking: enriched };
    },

    async listMyReservations(userId) {
      const bookings = await deps.reservationRepository.findByUserId(userId);
      const hydrated = await Promise.all(bookings.map((b) => attachLatestPayment(b)));
      return Object.freeze(hydrated);
    },

    async lookupReservation(bookingId, credentials) {
      const normalizedId = bookingId.trim().toUpperCase();
      const existing = await deps.reservationRepository.findById(normalizedId);
      if (!existing) {
        return {
          ok: false,
          code: "NOT_FOUND",
          message: `Không tìm thấy đơn đặt phòng với mã ${normalizedId}.`,
          status: 404,
        };
      }

      const authorized = canAccessReservation(existing, {
        contact: credentials.contact,
        authenticatedUserId: credentials.authUser?.id,
      });
      if (!authorized) {
        return {
          ok: false,
          code: "FORBIDDEN",
          message: "Email hoặc số điện thoại không khớp với thông tin đặt phòng này.",
          status: 403,
        };
      }

      return { ok: true, booking: await attachLatestPayment(existing) };
    },

    async cancelReservation(bookingId, input, context) {
      const normalizedId = bookingId.trim().toUpperCase();
      const existing = await deps.reservationRepository.findById(normalizedId);
      if (!existing) {
        return {
          ok: false,
          code: "NOT_FOUND",
          message: `Không tìm thấy đơn đặt phòng với mã ${normalizedId}.`,
          status: 404,
        };
      }

      const evaluated = evaluateReservationCancellation(existing, input, {
        authenticatedUserId: context?.authUser?.id,
      });
      if (!evaluated.ok) {
        return {
          ok: false,
          code: evaluated.code,
          message: evaluated.error,
          status: evaluated.status,
        };
      }

      const updated = await deps.reservationRepository.update(evaluated.booking);
      await deps.notificationService.sendBookingNotification(updated, "booking_cancelled");
      return { ok: true, booking: await attachLatestPayment(updated) };
    },

    async listReservationNotifications(bookingId, credentials) {
      const normalizedId = bookingId.trim().toUpperCase();
      const existing = await deps.reservationRepository.findById(normalizedId);
      if (!existing) {
        return {
          ok: false,
          code: "NOT_FOUND",
          message: `Không tìm thấy đơn đặt phòng với mã ${normalizedId}.`,
          status: 404,
        };
      }

      const authorized = canAccessReservation(existing, {
        contact: credentials.contact,
        authenticatedUserId: credentials.authUser?.id,
      });
      if (!authorized) {
        return {
          ok: false,
          code: "FORBIDDEN",
          message: "Bạn không có quyền xem nhật ký thông báo của đơn đặt phòng này.",
          status: 403,
        };
      }

      const notifications = await deps.notificationService.listForBooking(normalizedId);
      return { ok: true, notifications };
    },
  };
}
