import { randomUUID } from "node:crypto";
import type {
  ActivitiesCatalogResponse,
  ActivitiesQueryParams,
  ActivityBooking,
  ActivityDetailResponse,
  AuthUser,
  ErrorCode,
  ServiceBookingIntent,
} from "@luxestay/contracts";
import {
  canAccessActivityBooking,
  evaluateActivityBookingCancellation,
  filterActivities,
  filterActivityEligibleVouchers,
  getActivityCategories,
  getActivityCities,
  getActivitySections,
  getActivitySubcategories,
  normalizeActivitySlug,
  normalizeVietnamese,
  processStandaloneActivityBooking,
} from "@luxestay/domain";
import type { ApiCatalogRepository } from "../catalog/repository.js";
import type { ApiReservationRepository } from "../reservations/repository.js";
import type { ApiActivitiesRepository } from "./repository.js";

export type ActivityBookingOperationResult =
  | { ok: true; booking: ActivityBooking }
  | { ok: false; code: ErrorCode; message: string; status: 400 | 403 | 404 | 409 | 422 };

export interface ActivitiesService {
  listActivities(query?: ActivitiesQueryParams): Promise<ActivitiesCatalogResponse>;
  getActivityDetailBySlug(slug: string): Promise<ActivityDetailResponse | null>;
  createActivityBooking(
    intent: ServiceBookingIntent,
    context?: { authUser?: AuthUser | null }
  ): Promise<ActivityBookingOperationResult>;
  lookupActivityBooking(
    bookingId: string,
    credentials: { contact?: string; authUser?: AuthUser | null }
  ): Promise<ActivityBookingOperationResult>;
  listMyActivityBookings(userId: string): Promise<readonly ActivityBooking[]>;
  cancelActivityBooking(
    bookingId: string,
    input: { contact?: string; reason?: string },
    context?: { authUser?: AuthUser | null }
  ): Promise<ActivityBookingOperationResult>;
}

export function createActivitiesService(deps: {
  activitiesRepository: ApiActivitiesRepository;
  catalogRepository: ApiCatalogRepository;
  reservationRepository: ApiReservationRepository;
}): ActivitiesService {
  return {
    async listActivities(query = {}) {
      const all = await deps.activitiesRepository.listActivities();
      const filtered = filterActivities(all, query);
      return Object.freeze({
        activities: filtered,
        cities: getActivityCities(all),
        categories: getActivityCategories(all),
        sections: getActivitySections(all),
        subcategories: getActivitySubcategories(all, query.section),
      });
    },

    async getActivityDetailBySlug(slug: string) {
      const normalized = normalizeActivitySlug(slug);
      if (!normalized) return null;

      const [activity, snapshot] = await Promise.all([
        deps.activitiesRepository.findActivityBySlug(normalized),
        deps.catalogRepository.getSnapshot(),
      ]);
      if (!activity || !activity.isActive) return null;

      const cityNorm = normalizeVietnamese(activity.destinationCity);
      const routeNorm = activity.transferDetails
        ? normalizeVietnamese(`${activity.transferDetails.routeFrom} ${activity.transferDetails.routeTo}`)
        : "";
      const relatedStays = snapshot.properties
        .filter((prop) => {
          const propCityNorm = normalizeVietnamese(prop.location.city);
          return propCityNorm === cityNorm || (routeNorm.length > 0 && routeNorm.includes(propCityNorm));
        })
        .slice(0, 4);

      const availableVouchers = filterActivityEligibleVouchers(snapshot.promotions.vouchers);

      return Object.freeze({
        activity,
        relatedStays: Object.freeze(relatedStays),
        availableVouchers,
      });
    },

    async createActivityBooking(intent, context) {
      const authUser = context?.authUser ?? null;
      const [allActivities, snapshot] = await Promise.all([
        deps.activitiesRepository.listActivities(),
        deps.catalogRepository.getSnapshot(),
      ]);

      const hasPromo = Boolean(intent.promoCode?.trim());
      const hasPriorSuccessful =
        authUser && hasPromo
          ? await deps.reservationRepository.hasSuccessfulBookingByUserId(authUser.id)
          : undefined;

      const bookingId = `ACT-${randomUUID().replace(/-/g, "").slice(0, 6).toUpperCase()}`;

      const locked = await deps.activitiesRepository.createBookingWithSlotLock(
        {
          activityId: intent.activityId,
          slotId: intent.slotId,
          dateIso: intent.dateIso,
        },
        ({ bookedQuantityForSlot }) => {
          const now = new Date();
          return processStandaloneActivityBooking(intent, allActivities, {
            bookingId,
            createdAt: now.toISOString(),
            now,
            bookedQuantityForSlot,
            vouchers: snapshot.promotions.vouchers,
            userId: authUser?.id,
            isAuthenticated: Boolean(authUser),
            hasPriorSuccessfulBookings: hasPriorSuccessful,
          });
        }
      );

      return locked;
    },

    async lookupActivityBooking(bookingId, credentials) {
      const existing = await deps.activitiesRepository.findBookingById(bookingId);
      if (!existing) {
        return {
          ok: false,
          code: "NOT_FOUND",
          message: "Không tìm thấy đơn dịch vụ với mã đã nhập.",
          status: 404,
        };
      }

      if (!canAccessActivityBooking(existing, credentials)) {
        return {
          ok: false,
          code: "FORBIDDEN",
          message: "Email hoặc số điện thoại không khớp với đơn dịch vụ này.",
          status: 403,
        };
      }

      return { ok: true, booking: existing };
    },

    async listMyActivityBookings(userId: string) {
      return deps.activitiesRepository.findBookingsByUserId(userId);
    },

    async cancelActivityBooking(bookingId, input, context) {
      const existing = await deps.activitiesRepository.findBookingById(bookingId);
      if (!existing) {
        return {
          ok: false,
          code: "NOT_FOUND",
          message: "Không tìm thấy đơn dịch vụ cần hủy.",
          status: 404,
        };
      }

      const evaluation = evaluateActivityBookingCancellation(existing, {
        authUser: context?.authUser ?? null,
        contact: input.contact,
        reason: input.reason,
      });
      if (!evaluation.ok) {
        return evaluation;
      }

      const saved = await deps.activitiesRepository.updateBooking(evaluation.booking);
      return { ok: true, booking: saved };
    },
  };
}
