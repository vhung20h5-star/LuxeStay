import { randomUUID } from "node:crypto";
import type {
  AuthUser,
  BookingDetails,
  CreateHostPropertyInput,
  ErrorCode,
  HostAnalyticsData,
  Property,
  PropertyAmenityOverride,
  PropertyAvailabilityData,
  ReservationStatus,
  UpdateHostPropertyInput,
  UpsertHostAvailabilityInput,
} from "@luxestay/contracts";
import {
  canManageProperty,
  computeHostAnalytics,
  filterPropertiesForActor,
  isReservationHoldingInventory,
} from "@luxestay/domain";
import type { ApiAvailabilityRepository } from "../availability/repository.js";
import type { AvailabilityService } from "../availability/service.js";
import type { ApiCatalogRepository } from "../catalog/repository.js";
import type { ApiReservationRepository } from "../reservations/repository.js";

export type HostOperationResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: ErrorCode; message: string; status: 400 | 403 | 404 | 409 };

export interface HostService {
  listProperties(actor: AuthUser): Promise<readonly Property[]>;
  createProperty(
    actor: AuthUser,
    input: CreateHostPropertyInput
  ): Promise<HostOperationResult<Property>>;
  updateProperty(
    actor: AuthUser,
    propertyId: string,
    input: UpdateHostPropertyInput
  ): Promise<HostOperationResult<Property>>;
  deleteProperty(
    actor: AuthUser,
    propertyId: string
  ): Promise<HostOperationResult<{ deleted: true; propertyId: string }>>;
  upsertAvailability(
    actor: AuthUser,
    propertyId: string,
    input: UpsertHostAvailabilityInput
  ): Promise<HostOperationResult<PropertyAvailabilityData>>;
  listReservations(
    actor: AuthUser,
    filters?: { propertyId?: string; status?: ReservationStatus }
  ): Promise<readonly BookingDetails[]>;
  getAnalytics(actor: AuthUser): Promise<HostAnalyticsData>;
}

const DEFAULT_HOST_AVATAR =
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=160&q=80";

function buildAmenitiesFromIds(
  amenityIds: readonly string[],
  validCatalogIds: ReadonlySet<string>
): PropertyAmenityOverride[] {
  const seen = new Set<string>();
  const result: PropertyAmenityOverride[] = [];
  for (const raw of amenityIds) {
    const id = raw.trim();
    if (!id || seen.has(id) || !validCatalogIds.has(id)) continue;
    seen.add(id);
    result.push({ amenityId: id, featured: result.length < 6 });
  }
  // Ensure every listing has baseline Wi-Fi if none selected
  if (result.length === 0 && validCatalogIds.has("high-speed-wifi")) {
    result.push({ amenityId: "high-speed-wifi", featured: true });
  }
  return result;
}

export function createHostService(deps: {
  catalogRepository: ApiCatalogRepository;
  availabilityRepository: ApiAvailabilityRepository;
  availabilityService: AvailabilityService;
  reservationRepository: ApiReservationRepository;
}): HostService {
  return {
    async listProperties(actor) {
      const snapshot = await deps.catalogRepository.getSnapshot();
      return filterPropertiesForActor(snapshot.properties, actor);
    },

    async createProperty(actor, input) {
      const snapshot = await deps.catalogRepository.getSnapshot();
      const validAmenityIds = new Set(Object.keys(snapshot.amenityCatalog));
      const id = `stay-h-${randomUUID().replace(/-/g, "").slice(0, 6)}`;
      const resortAmenities = buildAmenitiesFromIds(input.amenityIds, validAmenityIds);

      const newProperty: Property = {
        id,
        title: input.title,
        subtitle: input.subtitle,
        propertyType: input.propertyType,
        category: input.category,
        location: { ...input.location },
        images: [...input.images],
        pricePerNight: input.pricePerNight,
        ...(input.originalPrice ? { originalPrice: input.originalPrice } : {}),
        rating: 5,
        reviewCount: 0,
        inventoryCount: input.inventoryCount,
        ownerUserId: actor.id,
        maxGuests: input.maxGuests,
        bedrooms: input.bedrooms,
        beds: input.beds,
        bathrooms: input.bathrooms,
        resortAmenities,
        isSuperhost: actor.role === "admin",
        isFeatured: false,
        isFlashDeal: false,
        freeCancellation: input.freeCancellation,
        breakfastIncluded: input.breakfastIncluded,
        description: input.description,
        host: {
          name: actor.fullName,
          avatar: actor.avatar ?? DEFAULT_HOST_AVATAR,
          joinedDate: "Thành viên từ 2026",
          responseRate: "Phản hồi trong 15 phút (99%)",
          isSuperhost: actor.role === "admin",
        },
        reviews: [],
      };

      const created = await deps.catalogRepository.createProperty(newProperty);
      return { ok: true, data: created };
    },

    async updateProperty(actor, propertyId, input) {
      const existing = await deps.catalogRepository.getPropertyById(propertyId);
      if (!existing) {
        return {
          ok: false,
          code: "NOT_FOUND",
          message: `Không tìm thấy chỗ nghỉ với mã "${propertyId}".`,
          status: 404,
        };
      }

      if (!canManageProperty(actor, existing)) {
        return {
          ok: false,
          code: "FORBIDDEN",
          message: "Bạn không có quyền chỉnh sửa chỗ nghỉ không thuộc quyền quản lý của mình.",
          status: 403,
        };
      }

      let nextAmenities = existing.resortAmenities;
      if (input.amenityIds !== undefined) {
        const snapshot = await deps.catalogRepository.getSnapshot();
        const validAmenityIds = new Set(Object.keys(snapshot.amenityCatalog));
        nextAmenities = buildAmenitiesFromIds(input.amenityIds, validAmenityIds);
      }

      const updated = await deps.catalogRepository.updateProperty(existing.id, (current) => ({
        ...current,
        title: input.title ?? current.title,
        subtitle: input.subtitle ?? current.subtitle,
        propertyType: input.propertyType ?? current.propertyType,
        category: input.category ?? current.category,
        pricePerNight: input.pricePerNight ?? current.pricePerNight,
        originalPrice:
          input.originalPrice === null
            ? undefined
            : (input.originalPrice ?? current.originalPrice),
        inventoryCount: input.inventoryCount ?? current.inventoryCount,
        maxGuests: input.maxGuests ?? current.maxGuests,
        bedrooms: input.bedrooms ?? current.bedrooms,
        beds: input.beds ?? current.beds,
        bathrooms: input.bathrooms ?? current.bathrooms,
        freeCancellation: input.freeCancellation ?? current.freeCancellation,
        breakfastIncluded: input.breakfastIncluded ?? current.breakfastIncluded,
        description: input.description ?? current.description,
        resortAmenities: nextAmenities,
      }));

      if (!updated) {
        return {
          ok: false,
          code: "NOT_FOUND",
          message: `Không tìm thấy chỗ nghỉ với mã "${propertyId}".`,
          status: 404,
        };
      }

      return { ok: true, data: updated };
    },

    async deleteProperty(actor, propertyId) {
      const existing = await deps.catalogRepository.getPropertyById(propertyId);
      if (!existing) {
        return {
          ok: false,
          code: "NOT_FOUND",
          message: `Không tìm thấy chỗ nghỉ với mã "${propertyId}".`,
          status: 404,
        };
      }

      if (!canManageProperty(actor, existing)) {
        return {
          ok: false,
          code: "FORBIDDEN",
          message: "Bạn không có quyền xóa chỗ nghỉ không thuộc quyền quản lý của mình.",
          status: 403,
        };
      }

      const activeBookings = await deps.reservationRepository.findActiveByPropertyId(existing.id);
      const now = new Date();
      const hasHolding = activeBookings.some((b) => isReservationHoldingInventory(b, now));
      if (hasHolding) {
        return {
          ok: false,
          code: "CONFLICT",
          message:
            "Không thể xóa chỗ nghỉ đang có đơn đặt phòng đã xác nhận hoặc đang chờ thanh toán.",
          status: 409,
        };
      }

      await deps.catalogRepository.deleteProperty(existing.id);
      return { ok: true, data: { deleted: true, propertyId: existing.id } };
    },

    async upsertAvailability(actor, propertyId, input) {
      const existing = await deps.catalogRepository.getPropertyById(propertyId);
      if (!existing) {
        return {
          ok: false,
          code: "NOT_FOUND",
          message: `Không tìm thấy chỗ nghỉ với mã "${propertyId}".`,
          status: 404,
        };
      }

      if (!canManageProperty(actor, existing)) {
        return {
          ok: false,
          code: "FORBIDDEN",
          message: "Bạn không có quyền cập nhật lịch phòng cho chỗ nghỉ này.",
          status: 403,
        };
      }

      const nowIso = new Date().toISOString();
      for (const item of input.dates) {
        await deps.availabilityRepository.upsertOverride({
          propertyId: existing.id,
          date: item.date,
          isBlocked: item.isBlocked,
          ...(item.overridePrice !== undefined && item.overridePrice !== null
            ? { overridePrice: item.overridePrice }
            : {}),
          ...(item.inventoryOverride !== undefined && item.inventoryOverride !== null
            ? { inventoryOverride: item.inventoryOverride }
            : {}),
          ...(item.note ? { note: item.note } : {}),
          updatedAt: nowIso,
        });
      }

      const sortedDates = [...input.dates].map((d) => d.date).sort();
      const cal = await deps.availabilityService.getPropertyAvailability(existing.id, {
        from: sortedDates[0],
        to: sortedDates[sortedDates.length - 1],
      });
      if (!cal.ok) {
        return {
          ok: false,
          code: cal.code,
          message: cal.message,
          status: cal.status,
        };
      }

      return { ok: true, data: cal.data };
    },

    async listReservations(actor, filters) {
      const [snapshot, allBookings] = await Promise.all([
        deps.catalogRepository.getSnapshot(),
        deps.reservationRepository.listAll(),
      ]);
      const owned = filterPropertiesForActor(snapshot.properties, actor);
      const ownedIds = new Set(owned.map((p) => p.id));

      const filtered = allBookings.filter((booking) => {
        if (!ownedIds.has(booking.property.id)) return false;
        if (filters?.propertyId && booking.property.id !== filters.propertyId) return false;
        if (filters?.status && booking.status !== filters.status) return false;
        return true;
      });

      return Object.freeze(filtered);
    },

    async getAnalytics(actor) {
      const [snapshot, allBookings] = await Promise.all([
        deps.catalogRepository.getSnapshot(),
        deps.reservationRepository.listAll(),
      ]);
      const owned = filterPropertiesForActor(snapshot.properties, actor);
      return computeHostAnalytics(owned, allBookings);
    },
  };
}
