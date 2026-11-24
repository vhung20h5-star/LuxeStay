import type {
  AvailabilityDay,
  BookingDetails,
  NightlyPriceBreakdown,
  NightlyPriceReason,
  Property,
  PropertyAvailabilityData,
  PropertyAvailabilityOverride,
} from "@luxestay/contracts";

export const WEEKEND_SURCHARGE_PERCENT = 20;
export const HOLIDAY_SURCHARGE_PERCENT = 30;

/**
 * Fixed Gregorian public/peak holiday dates in Vietnam (MM-DD).
 * Lunar holidays (Tết, Giỗ Tổ) are configured per-year via property_availability overridePrice.
 */
export const VN_PUBLIC_HOLIDAY_MONTH_DAYS: ReadonlySet<string> = new Set([
  "01-01",
  "04-30",
  "05-01",
  "09-02",
  "12-24",
  "12-25",
  "12-31",
]);

const MS_PER_DAY = 86_400_000;
const MAX_CALENDAR_DAYS = 90;

export function formatIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseIsoDateParts(
  iso: string
): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (
    Number.isNaN(probe.getTime()) ||
    probe.getUTCFullYear() !== year ||
    probe.getUTCMonth() !== month - 1 ||
    probe.getUTCDate() !== day
  ) {
    return null;
  }
  return { year, month, day };
}

export function parseBookingDateToIso(dateStr: string | undefined | null): string | null {
  if (!dateStr) return null;
  const trimmed = dateStr.trim();

  if (parseIsoDateParts(trimmed)) {
    return trimmed;
  }

  const dmy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed);
  if (dmy) {
    const day = String(Number(dmy[1])).padStart(2, "0");
    const month = String(Number(dmy[2])).padStart(2, "0");
    const year = dmy[3];
    const candidate = `${year}-${month}-${day}`;
    return parseIsoDateParts(candidate) ? candidate : null;
  }

  return null;
}

export function addDaysIso(dateIso: string, days: number): string | null {
  const parts = parseIsoDateParts(dateIso);
  if (!parts) return null;
  const utc = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days));
  const y = utc.getUTCFullYear();
  const m = String(utc.getUTCMonth() + 1).padStart(2, "0");
  const d = String(utc.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function enumerateStayDates(checkInStr: string, nights: number): string[] {
  const startIso = parseBookingDateToIso(checkInStr);
  if (!startIso) return [];
  const safeNights = Math.max(0, Math.min(60, Math.floor(nights)));
  const dates: string[] = [];
  for (let i = 0; i < safeNights; i += 1) {
    const next = addDaysIso(startIso, i);
    if (next) dates.push(next);
  }
  return dates;
}

export function isVietnamHoliday(dateIso: string): boolean {
  const parts = parseIsoDateParts(dateIso);
  if (!parts) return false;
  const mmdd = `${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
  return VN_PUBLIC_HOLIDAY_MONTH_DAYS.has(mmdd);
}

/**
 * Weekend stay nights in Vietnamese hospitality: Friday (5) & Saturday (6).
 */
export function isWeekendNight(dateIso: string): boolean {
  const parts = parseIsoDateParts(dateIso);
  if (!parts) return false;
  const dayOfWeek = new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay();
  return dayOfWeek === 5 || dayOfWeek === 6;
}

export function computeNightlyPrice(
  basePrice: number,
  dateIso: string,
  override?: Pick<PropertyAvailabilityOverride, "overridePrice">
): NightlyPriceBreakdown {
  const safeBase = Math.max(0, Math.round(basePrice));
  let effectivePrice = safeBase;
  let reason: NightlyPriceReason = "base";

  if (override?.overridePrice !== undefined) {
    effectivePrice = Math.max(0, Math.round(override.overridePrice));
    reason = "override";
  } else if (isVietnamHoliday(dateIso)) {
    effectivePrice = Math.round((safeBase * (100 + HOLIDAY_SURCHARGE_PERCENT)) / 100);
    reason = "holiday";
  } else if (isWeekendNight(dateIso)) {
    effectivePrice = Math.round((safeBase * (100 + WEEKEND_SURCHARGE_PERCENT)) / 100);
    reason = "weekend";
  }

  return Object.freeze({
    date: dateIso,
    basePrice: safeBase,
    effectivePrice,
    reason,
  });
}

export type ReservationOccupancyLike = Pick<
  BookingDetails,
  "property" | "checkIn" | "nights" | "guests" | "status" | "paymentExpiresAt"
>;

/**
 * Determines whether a reservation is currently holding inventory.
 * - confirmed: always holds inventory
 * - pending_payment: holds inventory only while paymentExpiresAt is still in the future
 * - cancelled, expired, payment_failed, completed: releases inventory immediately
 */
export function isReservationHoldingInventory(
  booking: Pick<BookingDetails, "status" | "paymentExpiresAt">,
  now: Date = new Date()
): boolean {
  if (booking.status === "confirmed") return true;
  if (booking.status === "pending_payment") {
    if (!booking.paymentExpiresAt) return true;
    const expiresMs = Date.parse(booking.paymentExpiresAt);
    return Number.isFinite(expiresMs) ? expiresMs > now.getTime() : true;
  }
  return false;
}

export interface AvailabilityEvaluation {
  available: boolean;
  unavailableDates: readonly string[];
  blockedDates: readonly string[];
  remainingUnitsByDate: Readonly<Record<string, number>>;
  nightlyBreakdown: readonly NightlyPriceBreakdown[];
  baseNightsTotal: number;
  nightsTotal: number;
  seasonalSurcharge: number;
  errorMessage?: string;
}

function buildOccupancyMap(
  propertyId: string,
  reservations: readonly ReservationOccupancyLike[],
  now: Date
): Map<string, number> {
  const occupancy = new Map<string, number>();
  for (const res of reservations) {
    if (res.property.id !== propertyId) continue;
    if (!isReservationHoldingInventory(res, now)) continue;
    const rooms = Math.max(1, Math.floor(res.guests.rooms));
    const dates = enumerateStayDates(res.checkIn, res.nights);
    for (const dateIso of dates) {
      occupancy.set(dateIso, (occupancy.get(dateIso) ?? 0) + rooms);
    }
  }
  return occupancy;
}

export function evaluatePropertyAvailability(
  property: Pick<Property, "id" | "pricePerNight" | "inventoryCount">,
  stayDates: readonly string[],
  roomsRequested: number,
  dailyOverrides: readonly PropertyAvailabilityOverride[] = [],
  existingReservations: readonly ReservationOccupancyLike[] = [],
  now: Date = new Date()
): AvailabilityEvaluation {
  const rooms = Math.max(1, Math.floor(Number.isFinite(roomsRequested) ? roomsRequested : 1));
  const defaultInventory = Math.max(1, Math.floor(property.inventoryCount ?? 1));

  const overrideMap = new Map<string, PropertyAvailabilityOverride>();
  for (const item of dailyOverrides) {
    if (item.propertyId === property.id) {
      overrideMap.set(item.date, item);
    }
  }

  const occupancyMap = buildOccupancyMap(property.id, existingReservations, now);

  const unavailableDates: string[] = [];
  const blockedDates: string[] = [];
  const remainingUnitsByDate: Record<string, number> = {};
  const nightlyBreakdown: NightlyPriceBreakdown[] = [];

  for (const dateIso of stayDates) {
    const override = overrideMap.get(dateIso);
    const totalUnits =
      override?.inventoryOverride !== undefined
        ? Math.max(0, Math.floor(override.inventoryOverride))
        : defaultInventory;
    const bookedUnits = occupancyMap.get(dateIso) ?? 0;
    const isBlocked = Boolean(override?.isBlocked);
    const remainingUnits = isBlocked ? 0 : Math.max(0, totalUnits - bookedUnits);

    remainingUnitsByDate[dateIso] = remainingUnits;
    if (isBlocked) {
      blockedDates.push(dateIso);
      unavailableDates.push(dateIso);
    } else if (remainingUnits < rooms) {
      unavailableDates.push(dateIso);
    }

    nightlyBreakdown.push(computeNightlyPrice(property.pricePerNight, dateIso, override));
  }

  const baseNightsTotal = property.pricePerNight * stayDates.length * rooms;
  const nightsTotal =
    nightlyBreakdown.reduce((sum, item) => sum + item.effectivePrice, 0) * rooms;
  const seasonalSurcharge = nightsTotal - baseNightsTotal;

  let errorMessage: string | undefined;
  if (blockedDates.length > 0) {
    errorMessage = `Chỗ nghỉ tạm ngừng nhận khách vào các ngày: ${blockedDates.join(", ")}. Vui lòng chọn khoảng ngày khác.`;
  } else if (unavailableDates.length > 0) {
    errorMessage = `Chỗ nghỉ không còn đủ ${rooms} phòng trống cho các ngày: ${unavailableDates.join(", ")}. Vui lòng chọn ngày khác.`;
  }

  return {
    available: unavailableDates.length === 0,
    unavailableDates: Object.freeze(unavailableDates),
    blockedDates: Object.freeze(blockedDates),
    remainingUnitsByDate: Object.freeze(remainingUnitsByDate),
    nightlyBreakdown: Object.freeze(nightlyBreakdown),
    baseNightsTotal,
    nightsTotal,
    seasonalSurcharge,
    ...(errorMessage ? { errorMessage } : {}),
  };
}

export function buildAvailabilityCalendar(
  property: Pick<Property, "id" | "pricePerNight" | "inventoryCount">,
  fromIso: string,
  toIso: string,
  dailyOverrides: readonly PropertyAvailabilityOverride[] = [],
  existingReservations: readonly ReservationOccupancyLike[] = [],
  now: Date = new Date()
): PropertyAvailabilityData {
  const fromParts = parseIsoDateParts(fromIso);
  const toParts = parseIsoDateParts(toIso);
  const defaultStart = formatIsoDate(now);
  const startIso = fromParts ? fromIso : defaultStart;

  let totalDays = 45;
  if (fromParts && toParts) {
    const startUtc = Date.UTC(fromParts.year, fromParts.month - 1, fromParts.day);
    const endUtc = Date.UTC(toParts.year, toParts.month - 1, toParts.day);
    const diff = Math.floor((endUtc - startUtc) / MS_PER_DAY) + 1;
    totalDays = Math.max(1, Math.min(MAX_CALENDAR_DAYS, diff));
  }

  const defaultInventory = Math.max(1, Math.floor(property.inventoryCount ?? 1));
  const overrideMap = new Map<string, PropertyAvailabilityOverride>();
  for (const item of dailyOverrides) {
    if (item.propertyId === property.id) {
      overrideMap.set(item.date, item);
    }
  }
  const occupancyMap = buildOccupancyMap(property.id, existingReservations, now);

  const days: AvailabilityDay[] = [];
  let lastIso = startIso;
  for (let i = 0; i < totalDays; i += 1) {
    const dateIso = addDaysIso(startIso, i);
    if (!dateIso) break;
    lastIso = dateIso;
    const override = overrideMap.get(dateIso);
    const totalUnits =
      override?.inventoryOverride !== undefined
        ? Math.max(0, Math.floor(override.inventoryOverride))
        : defaultInventory;
    const bookedUnits = occupancyMap.get(dateIso) ?? 0;
    const isBlocked = Boolean(override?.isBlocked);
    const remainingUnits = isBlocked ? 0 : Math.max(0, totalUnits - bookedUnits);
    const pricing = computeNightlyPrice(property.pricePerNight, dateIso, override);

    days.push(
      Object.freeze({
        date: dateIso,
        totalUnits,
        bookedUnits,
        remainingUnits,
        isBlocked,
        isAvailable: !isBlocked && remainingUnits > 0,
        basePrice: pricing.basePrice,
        effectivePrice: pricing.effectivePrice,
        priceReason: pricing.reason,
        ...(override?.note ? { note: override.note } : {}),
      })
    );
  }

  return {
    propertyId: property.id,
    inventoryCount: defaultInventory,
    from: startIso,
    to: lastIso,
    days: Object.freeze(days),
  };
}
