import { resolvePropertyAmenities } from "@/lib/amenities";
import type { BookingDraft, Property } from "@/types";

export function clampDraftNights(nights: number): number {
  if (!Number.isFinite(nights)) return 1;
  return Math.min(30, Math.max(1, Math.floor(nights)));
}

export function clampDraftAdults(adults: number, maxGuests: number): number {
  const safeMax = Math.max(1, Math.floor(maxGuests));
  if (!Number.isFinite(adults)) return 1;
  return Math.min(safeMax, Math.max(1, Math.floor(adults)));
}

export function createInitialDraft(
  property?: Pick<Property, "id" | "maxGuests"> | null
): BookingDraft {
  if (!property) {
    return {
      propertyId: null,
      nights: 2,
      adults: 2,
      selectedAmenityIds: [],
    };
  }

  return {
    propertyId: property.id,
    nights: 2,
    adults: clampDraftAdults(2, property.maxGuests),
    selectedAmenityIds: [],
  };
}

export function syncDraftForProperty(
  current: BookingDraft,
  property: Pick<Property, "id" | "maxGuests">
): BookingDraft {
  if (current.propertyId === property.id) {
    return {
      ...current,
      nights: clampDraftNights(current.nights),
      adults: clampDraftAdults(current.adults, property.maxGuests),
    };
  }

  return createInitialDraft(property);
}

export function toggleDraftAmenity(
  current: BookingDraft,
  property: Pick<Property, "id" | "resortAmenities">,
  amenityId: string
): BookingDraft {
  const resolved = resolvePropertyAmenities(property);
  const target = resolved.find((item) => item.id === amenityId);
  if (!target || target.pricingType === "included") {
    return current;
  }

  const baseIds = current.propertyId === property.id ? current.selectedAmenityIds : [];
  const exists = baseIds.includes(amenityId);
  const nextIds = exists
    ? baseIds.filter((id) => id !== amenityId)
    : [...baseIds, amenityId];

  return {
    ...current,
    propertyId: property.id,
    selectedAmenityIds: nextIds,
  };
}

export function removeDraftAmenity(
  current: BookingDraft,
  amenityId: string
): BookingDraft {
  if (!current.selectedAmenityIds.includes(amenityId)) return current;
  return {
    ...current,
    selectedAmenityIds: current.selectedAmenityIds.filter((id) => id !== amenityId),
  };
}

function formatDDMMYYYY(date: Date): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function buildValidatedLocalDate(year: number, monthIndex: number, day: number): Date | null {
  const parsed = new Date(year, monthIndex, day);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== monthIndex ||
    parsed.getDate() !== day
  ) {
    return null;
  }
  return parsed;
}

function parseLocalDate(dateStr: string | undefined, defaultYear: number): Date | null {
  if (!dateStr) return null;
  const trimmed = dateStr.trim();

  const isoMatch = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(trimmed);
  if (isoMatch) {
    return buildValidatedLocalDate(
      Number(isoMatch[1]),
      Number(isoMatch[2]) - 1,
      Number(isoMatch[3])
    );
  }

  const dmyMatch = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed);
  if (dmyMatch) {
    return buildValidatedLocalDate(
      Number(dmyMatch[3]),
      Number(dmyMatch[2]) - 1,
      Number(dmyMatch[1])
    );
  }

  const dmMatch = /^(\d{1,2})\/(\d{1,2})$/.exec(trimmed);
  if (dmMatch) {
    return buildValidatedLocalDate(
      defaultYear,
      Number(dmMatch[2]) - 1,
      Number(dmMatch[1])
    );
  }

  return null;
}

export function computeStayDates(
  nights: number,
  preferredCheckIn?: string,
  fallbackBaseDate: Date = new Date()
): { checkIn: string; checkOut: string } {
  const safeNights = clampDraftNights(nights);
  const parsed = parseLocalDate(preferredCheckIn, fallbackBaseDate.getFullYear());

  const checkInDate = parsed
    ? new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate())
    : new Date(
        fallbackBaseDate.getFullYear(),
        fallbackBaseDate.getMonth(),
        fallbackBaseDate.getDate() + 1
      );

  const checkOutDate = new Date(
    checkInDate.getFullYear(),
    checkInDate.getMonth(),
    checkInDate.getDate() + safeNights
  );

  return {
    checkIn: formatDDMMYYYY(checkInDate),
    checkOut: formatDDMMYYYY(checkOutDate),
  };
}
