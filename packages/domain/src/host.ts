import type {
  AuthUser,
  BookingDetails,
  HostAnalyticsData,
  HostMonthlyRevenueRow,
  HostPropertyAnalyticsRow,
  Property,
  UserRole,
} from "@luxestay/contracts";
import { parseBookingDateToIso } from "./availability.js";

export const DEMO_HOST_USER_ID = "USR-HOST-01";
export const DEMO_ADMIN_USER_ID = "USR-ADMIN-01";
export const DEMO_HOST_OWNED_PROPERTY_IDS: ReadonlySet<string> = new Set([
  "stay-01",
  "stay-02",
  "stay-03",
  "stay-04",
  "stay-05",
  "stay-06",
]);

export function isHostOrAdmin(role: UserRole | undefined | null): boolean {
  return role === "host" || role === "admin";
}

export function canManageProperty(
  actor: Pick<AuthUser, "id" | "role"> | null | undefined,
  property: Pick<Property, "ownerUserId"> | null | undefined
): boolean {
  if (!actor || !property) return false;
  if (actor.role === "admin") return true;
  if (actor.role === "host") {
    return Boolean(property.ownerUserId && property.ownerUserId === actor.id);
  }
  return false;
}

export function filterPropertiesForActor<T extends Pick<Property, "ownerUserId">>(
  properties: readonly T[],
  actor: Pick<AuthUser, "id" | "role"> | null | undefined
): readonly T[] {
  if (!actor) return Object.freeze([]);
  if (actor.role === "admin") return Object.freeze([...properties]);
  if (actor.role === "host") {
    return Object.freeze(properties.filter((p) => p.ownerUserId === actor.id));
  }
  return Object.freeze([]);
}

function extractMonthKey(booking: Pick<BookingDetails, "checkIn" | "createdAt">): string {
  const isoCheckIn = parseBookingDateToIso(booking.checkIn);
  if (isoCheckIn) return isoCheckIn.slice(0, 7);
  if (booking.createdAt && /^\d{4}-\d{2}/.test(booking.createdAt)) {
    return booking.createdAt.slice(0, 7);
  }
  return "2026-11";
}

export function computeHostAnalytics(
  ownedProperties: readonly Pick<Property, "id" | "title" | "location">[],
  bookings: readonly BookingDetails[]
): HostAnalyticsData {
  const ownedIds = new Set(ownedProperties.map((p) => p.id));
  const relevant = bookings.filter((b) => ownedIds.has(b.property.id));

  let confirmedRevenue = 0;
  let completedRevenue = 0;
  let confirmedBookings = 0;
  let completedBookings = 0;
  let pendingBookings = 0;
  let cancelledBookings = 0;

  const propertyMap = new Map<
    string,
    {
      propertyId: string;
      title: string;
      city: string;
      bookingsCount: number;
      confirmedRevenue: number;
      completedRevenue: number;
      occupancyNights: number;
    }
  >();

  for (const prop of ownedProperties) {
    propertyMap.set(prop.id, {
      propertyId: prop.id,
      title: prop.title,
      city: prop.location.city,
      bookingsCount: 0,
      confirmedRevenue: 0,
      completedRevenue: 0,
      occupancyNights: 0,
    });
  }

  const monthlyMap = new Map<string, { month: string; revenue: number; bookingsCount: number }>();

  for (const booking of relevant) {
    const entry = propertyMap.get(booking.property.id);
    if (booking.status === "confirmed") {
      confirmedBookings += 1;
      confirmedRevenue += booking.pricing.total;
      if (entry) {
        entry.bookingsCount += 1;
        entry.confirmedRevenue += booking.pricing.total;
        entry.occupancyNights += booking.nights * booking.guests.rooms;
      }
    } else if (booking.status === "completed") {
      completedBookings += 1;
      completedRevenue += booking.pricing.total;
      if (entry) {
        entry.bookingsCount += 1;
        entry.completedRevenue += booking.pricing.total;
        entry.occupancyNights += booking.nights * booking.guests.rooms;
      }
    } else if (booking.status === "pending_payment") {
      pendingBookings += 1;
    } else if (
      booking.status === "cancelled" ||
      booking.status === "expired" ||
      booking.status === "payment_failed"
    ) {
      cancelledBookings += 1;
    }

    if (booking.status === "confirmed" || booking.status === "completed") {
      const month = extractMonthKey(booking);
      const existing = monthlyMap.get(month) ?? { month, revenue: 0, bookingsCount: 0 };
      existing.revenue += booking.pricing.total;
      existing.bookingsCount += 1;
      monthlyMap.set(month, existing);
    }
  }

  const totalRevenue = confirmedRevenue + completedRevenue;
  const paidBookingsCount = confirmedBookings + completedBookings;
  const averageOrderValue =
    paidBookingsCount > 0 ? Math.round(totalRevenue / paidBookingsCount) : 0;

  const propertyBreakdown: HostPropertyAnalyticsRow[] = [...propertyMap.values()]
    .map((row) =>
      Object.freeze({
        propertyId: row.propertyId,
        title: row.title,
        city: row.city,
        bookingsCount: row.bookingsCount,
        confirmedRevenue: row.confirmedRevenue,
        completedRevenue: row.completedRevenue,
        totalRevenue: row.confirmedRevenue + row.completedRevenue,
        occupancyNights: row.occupancyNights,
      })
    )
    .sort((a, b) => b.totalRevenue - a.totalRevenue || a.title.localeCompare(b.title));

  const monthlyRevenue: HostMonthlyRevenueRow[] = [...monthlyMap.values()]
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((row) => Object.freeze({ ...row }));

  return {
    totalRevenue,
    confirmedRevenue,
    completedRevenue,
    totalBookings: relevant.length,
    confirmedBookings,
    completedBookings,
    pendingBookings,
    cancelledBookings,
    averageOrderValue,
    totalProperties: ownedProperties.length,
    propertyBreakdown: Object.freeze(propertyBreakdown),
    monthlyRevenue: Object.freeze(monthlyRevenue),
  };
}
