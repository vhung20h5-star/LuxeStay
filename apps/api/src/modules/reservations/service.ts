import { randomUUID } from "node:crypto";
import type { BookingDetails, ErrorCode, ServerReservationIntent } from "@luxestay/contracts";
import { processServerReservationIntent } from "@luxestay/domain";
import type { ApiCatalogRepository } from "../catalog/repository.js";
import type { ApiReservationRepository } from "./repository.js";

export type CreateReservationResult =
  | { ok: true; booking: BookingDetails }
  | { ok: false; code: ErrorCode; message: string; status: 400 | 404 | 422 };

export interface ReservationService {
  createReservation(intent: ServerReservationIntent): Promise<CreateReservationResult>;
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
    async createReservation(intent: ServerReservationIntent): Promise<CreateReservationResult> {
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
  };
}
