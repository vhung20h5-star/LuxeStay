import { randomUUID } from "node:crypto";
import type { BookingDetails, ErrorCode, ServerReservationIntent } from "@luxestay/contracts";
import {
  evaluateReservationCancellation,
  matchesReservationContact,
  processServerReservationIntent,
} from "@luxestay/domain";
import type { ApiCatalogRepository } from "../catalog/repository.js";
import type { ApiReservationRepository } from "./repository.js";

export type ReservationOperationResult =
  | { ok: true; booking: BookingDetails }
  | { ok: false; code: ErrorCode; message: string; status: 400 | 403 | 404 | 409 | 422 };

export interface ReservationService {
  createReservation(intent: ServerReservationIntent): Promise<ReservationOperationResult>;
  lookupReservation(bookingId: string, contact: string): Promise<ReservationOperationResult>;
  cancelReservation(
    bookingId: string,
    input: { contact: string; reason?: string }
  ): Promise<ReservationOperationResult>;
}

function mapStatusToErrorCode(status: 400 | 404 | 422): ErrorCode {
  if (status === 404) return "NOT_FOUND";
  if (status === 422) return "UNPROCESSABLE_ENTITY";
  return "VALIDATION_ERROR";
}

export function createReservationService(deps: {
  catalogRepository: ApiCatalogRepository;
  reservationRepository: ApiReservationRepository;
}): ReservationService {
  return {
    async createReservation(
      intent: ServerReservationIntent
    ): Promise<ReservationOperationResult> {
      const snapshot = await deps.catalogRepository.getSnapshot();
      const bookingId = `LX-${randomUUID().replace(/-/g, "").slice(0, 6).toUpperCase()}`;

      const result = processServerReservationIntent(intent, snapshot.properties, {
        bookingId,
        createdAt: new Date().toISOString(),
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
      return { ok: true, booking: saved };
    },

    async lookupReservation(
      bookingId: string,
      contact: string
    ): Promise<ReservationOperationResult> {
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

      if (!matchesReservationContact(existing, contact)) {
        return {
          ok: false,
          code: "FORBIDDEN",
          message: "Email hoặc số điện thoại không khớp với thông tin đặt phòng này.",
          status: 403,
        };
      }

      return { ok: true, booking: existing };
    },

    async cancelReservation(
      bookingId: string,
      input: { contact: string; reason?: string }
    ): Promise<ReservationOperationResult> {
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

      const evaluated = evaluateReservationCancellation(existing, input);
      if (!evaluated.ok) {
        return {
          ok: false,
          code: evaluated.code,
          message: evaluated.error,
          status: evaluated.status,
        };
      }

      const updated = await deps.reservationRepository.update(evaluated.booking);
      return { ok: true, booking: updated };
    },
  };
}
