import {
  ISO_DATE_REGEX,
  type ErrorCode,
  type PropertyAvailabilityData,
} from "@luxestay/contracts";
import {
  addDaysIso,
  buildAvailabilityCalendar,
  formatIsoDate,
} from "@luxestay/domain";
import type { ApiCatalogRepository } from "../catalog/repository.js";
import type { ApiReservationRepository } from "../reservations/repository.js";
import type { ApiAvailabilityRepository } from "./repository.js";

export type AvailabilityQueryResult =
  | { ok: true; data: PropertyAvailabilityData }
  | { ok: false; code: ErrorCode; message: string; status: 400 | 404 };

export interface AvailabilityService {
  getPropertyAvailability(
    propertyId: string,
    query?: { from?: string; to?: string; now?: Date }
  ): Promise<AvailabilityQueryResult>;
}

export function createAvailabilityService(deps: {
  catalogRepository: ApiCatalogRepository;
  availabilityRepository: ApiAvailabilityRepository;
  reservationRepository: ApiReservationRepository;
}): AvailabilityService {
  return {
    async getPropertyAvailability(propertyId, query) {
      const normalizedId = propertyId.trim();
      const property = await deps.catalogRepository.getPropertyById(normalizedId);
      if (!property) {
        return {
          ok: false,
          code: "NOT_FOUND",
          message: `Không tìm thấy chỗ nghỉ với mã "${normalizedId}".`,
          status: 404,
        };
      }

      const now = query?.now ?? new Date();
      const from = query?.from?.trim() || formatIsoDate(now);
      if (!ISO_DATE_REGEX.test(from)) {
        return {
          ok: false,
          code: "VALIDATION_ERROR",
          message: 'Tham số "from" phải có định dạng YYYY-MM-DD.',
          status: 400,
        };
      }

      const defaultTo = addDaysIso(from, 44) ?? from;
      const to = query?.to?.trim() || defaultTo;
      if (!ISO_DATE_REGEX.test(to)) {
        return {
          ok: false,
          code: "VALIDATION_ERROR",
          message: 'Tham số "to" phải có định dạng YYYY-MM-DD.',
          status: 400,
        };
      }

      if (to < from) {
        return {
          ok: false,
          code: "VALIDATION_ERROR",
          message: 'Ngày kết thúc ("to") phải lớn hơn hoặc bằng ngày bắt đầu ("from").',
          status: 400,
        };
      }

      const [dailyOverrides, existingReservations] = await Promise.all([
        deps.availabilityRepository.listOverrides(normalizedId, { from, to }),
        deps.reservationRepository.findActiveByPropertyId(normalizedId),
      ]);

      const data = buildAvailabilityCalendar(
        property,
        from,
        to,
        dailyOverrides,
        existingReservations,
        now
      );

      return { ok: true, data };
    },
  };
}
