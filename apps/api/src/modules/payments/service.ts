import type {
  BookingDetails,
  ErrorCode,
  PaymentGatewaySession,
  PaymentProvider,
  PaymentSimulateInput,
  PaymentTransaction,
  PaymentWebhookPayload,
  PaymentWebhookResult,
} from "@luxestay/contracts";
import { PaymentWebhookPayloadSchema } from "@luxestay/contracts";
import { evaluatePaymentWebhookTransition } from "@luxestay/domain";
import { generateId } from "../auth/crypto.js";
import type { NotificationService } from "../notifications/service.js";
import type { ApiReservationRepository } from "../reservations/repository.js";
import type { ApiPaymentRepository } from "./repository.js";
import { signWebhookPayload, verifyWebhookSignature } from "./signature.js";

export type PaymentOperationResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: ErrorCode; message: string; status: 400 | 401 | 403 | 404 | 409 };

export interface PaymentService {
  createTransactionForBooking(booking: BookingDetails): Promise<PaymentTransaction>;
  getGatewaySession(transactionId: string): Promise<PaymentOperationResult<PaymentGatewaySession>>;
  processWebhook(
    provider: PaymentProvider,
    rawBody: string,
    signatureHeader: string | undefined | null
  ): Promise<PaymentOperationResult<PaymentWebhookResult>>;
  simulateSandboxOutcome(
    transactionId: string,
    input: PaymentSimulateInput
  ): Promise<PaymentOperationResult<PaymentWebhookResult>>;
}

export function createPaymentService(deps: {
  paymentRepository: ApiPaymentRepository;
  reservationRepository: ApiReservationRepository;
  notificationService: NotificationService;
  webhookSecret: string;
  sandboxEnabled: boolean;
}): PaymentService {
  return {
    async createTransactionForBooking(booking) {
      const bookingId = booking.bookingId?.trim().toUpperCase();
      if (!bookingId) {
        throw new Error("Cannot create payment transaction without bookingId.");
      }
      if (booking.paymentMethod === "hotel") {
        throw new Error("Offline hotel payment does not require an online transaction.");
      }

      const transactionId = generateId("TXN");
      const nowIso = booking.createdAt ?? new Date().toISOString();
      const expiresAt =
        booking.paymentExpiresAt ?? new Date(Date.now() + 15 * 60_000).toISOString();

      const tx: PaymentTransaction = {
        transactionId,
        bookingId,
        provider: booking.paymentMethod,
        amount: booking.pricing.total,
        currency: "VND",
        status: "pending",
        checkoutUrl: `/payments/${transactionId}`,
        expiresAt,
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      return deps.paymentRepository.createTransaction(tx);
    },

    async getGatewaySession(transactionId) {
      const tx = await deps.paymentRepository.findByTransactionId(transactionId);
      if (!tx) {
        return {
          ok: false,
          code: "NOT_FOUND",
          message: `Không tìm thấy giao dịch thanh toán ${transactionId.toUpperCase()}.`,
          status: 404,
        };
      }

      const booking = await deps.reservationRepository.findById(tx.bookingId);
      if (!booking) {
        return {
          ok: false,
          code: "NOT_FOUND",
          message: "Không tìm thấy đơn đặt phòng tương ứng với giao dịch này.",
          status: 404,
        };
      }

      return {
        ok: true,
        data: {
          transaction: tx,
          bookingSummary: {
            bookingId: booking.bookingId ?? tx.bookingId,
            propertyTitle: booking.property.title,
            propertyCity: booking.property.location.city,
            checkIn: booking.checkIn,
            checkOut: booking.checkOut,
            nights: booking.nights,
            guestFullName: booking.guestInfo.fullName,
            guestEmail: booking.guestInfo.email,
            status: booking.status,
          },
          sandboxEnabled: deps.sandboxEnabled,
        },
      };
    },

    async processWebhook(provider, rawBody, signatureHeader) {
      if (!verifyWebhookSignature(rawBody, signatureHeader, deps.webhookSecret)) {
        return {
          ok: false,
          code: "UNAUTHORIZED",
          message: "Chữ ký HMAC-SHA256 webhook thanh toán không hợp lệ.",
          status: 401,
        };
      }

      let parsedJson: unknown;
      try {
        parsedJson = JSON.parse(rawBody);
      } catch {
        return {
          ok: false,
          code: "INVALID_JSON",
          message: "Payload webhook không phải JSON hợp lệ.",
          status: 400,
        };
      }

      const parsed = PaymentWebhookPayloadSchema.safeParse(parsedJson);
      if (!parsed.success) {
        return {
          ok: false,
          code: "VALIDATION_ERROR",
          message: parsed.error.issues[0]?.message ?? "Payload webhook thanh toán chưa đúng chuẩn.",
          status: 400,
        };
      }

      const payload: PaymentWebhookPayload = parsed.data;
      if (payload.provider !== provider) {
        return {
          ok: false,
          code: "VALIDATION_ERROR",
          message: `Provider webhook (${provider}) không khớp với payload (${payload.provider}).`,
          status: 400,
        };
      }

      const tx = await deps.paymentRepository.findByTransactionId(payload.transactionId);
      if (!tx) {
        return {
          ok: false,
          code: "NOT_FOUND",
          message: `Không tìm thấy giao dịch ${payload.transactionId}.`,
          status: 404,
        };
      }

      const booking = await deps.reservationRepository.findById(tx.bookingId);
      if (!booking) {
        return {
          ok: false,
          code: "NOT_FOUND",
          message: `Không tìm thấy đơn đặt phòng ${tx.bookingId}.`,
          status: 404,
        };
      }

      if (tx.bookingId !== payload.bookingId.trim().toUpperCase()) {
        return {
          ok: false,
          code: "VALIDATION_ERROR",
          message: "Mã đơn đặt phòng trong webhook không khớp với giao dịch.",
          status: 400,
        };
      }

      // Idempotency check BEFORE mutating state or sending emails
      const alreadyProcessed = await deps.paymentRepository.hasWebhookEvent(payload.eventId);
      if (alreadyProcessed) {
        return {
          ok: true,
          data: {
            received: true,
            deduplicated: true,
            transaction: tx,
            bookingStatus: booking.status,
          },
        };
      }

      const transition = evaluatePaymentWebhookTransition(booking, payload.outcome);
      if (!transition.ok) {
        return {
          ok: false,
          code: transition.code,
          message: transition.error,
          status: transition.status,
        };
      }

      const nowIso = new Date().toISOString();
      const recorded = await deps.paymentRepository.recordWebhookEvent({
        eventId: payload.eventId,
        provider: payload.provider,
        transactionId: tx.transactionId,
        bookingId: tx.bookingId,
        outcome: payload.outcome,
        processedAt: nowIso,
      });

      // Handle concurrent duplicate race gracefully
      if (!recorded) {
        const latestTx = (await deps.paymentRepository.findByTransactionId(tx.transactionId)) ?? tx;
        const latestBooking = (await deps.reservationRepository.findById(tx.bookingId)) ?? booking;
        return {
          ok: true,
          data: {
            received: true,
            deduplicated: true,
            transaction: latestTx,
            bookingStatus: latestBooking.status,
          },
        };
      }

      const updatedTx: PaymentTransaction = await deps.paymentRepository.updateTransaction({
        ...tx,
        status: payload.outcome,
        updatedAt: nowIso,
        ...(payload.outcome === "succeeded" ? { paidAt: payload.occurredAt || nowIso } : {}),
        ...(payload.outcome !== "succeeded"
          ? {
              failureReason:
                payload.reason?.trim() ||
                (payload.outcome === "expired"
                  ? "Giao dịch quá thời hạn thanh toán."
                  : "Thanh toán bị từ chối bởi cổng thanh toán."),
            }
          : {}),
      });

      const bookingWithPayment: BookingDetails = Object.freeze({
        ...transition.booking,
        payment: updatedTx,
      });

      const updatedBooking = await deps.reservationRepository.update(bookingWithPayment);

      if (transition.changed) {
        if (updatedBooking.status === "confirmed") {
          await deps.notificationService.sendBookingNotification(
            updatedBooking,
            "booking_confirmed"
          );
        } else if (
          updatedBooking.status === "payment_failed" ||
          updatedBooking.status === "expired"
        ) {
          await deps.notificationService.sendBookingNotification(
            updatedBooking,
            "payment_failed"
          );
        }
      }

      return {
        ok: true,
        data: {
          received: true,
          deduplicated: false,
          transaction: updatedTx,
          bookingStatus: updatedBooking.status,
        },
      };
    },

    async simulateSandboxOutcome(transactionId, input) {
      if (!deps.sandboxEnabled) {
        return {
          ok: false,
          code: "FORBIDDEN",
          message: "Chế độ mô phỏng cổng thanh toán (Sandbox) đã bị tắt trong môi trường này.",
          status: 403,
        };
      }

      const tx = await deps.paymentRepository.findByTransactionId(transactionId);
      if (!tx) {
        return {
          ok: false,
          code: "NOT_FOUND",
          message: `Không tìm thấy giao dịch ${transactionId.toUpperCase()}.`,
          status: 404,
        };
      }

      const payload: PaymentWebhookPayload = {
        eventId: generateId("EVT"),
        transactionId: tx.transactionId,
        bookingId: tx.bookingId,
        provider: tx.provider,
        outcome: input.outcome,
        amount: tx.amount,
        ...(input.reason?.trim() ? { reason: input.reason.trim() } : {}),
        occurredAt: new Date().toISOString(),
      };

      const rawBody = JSON.stringify(payload);
      const signature = signWebhookPayload(rawBody, deps.webhookSecret);
      return this.processWebhook(tx.provider, rawBody, signature);
    },
  };
}
