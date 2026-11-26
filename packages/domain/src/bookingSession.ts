import {
  EMAIL_REGEX,
  VN_PHONE_REGEX,
  type BookedBundleActivity,
  type BookingDetails,
  type BookingQuote,
  type BookingSessionState,
  type CheckoutGuestInput,
  type NightlyPriceBreakdown,
  type PaymentOutcome,
  type PromotionVoucher,
  type Property,
  type PropertyAvailabilityOverride,
  type ReservationStatus,
  type ReservationSubmitter,
  type ResolvedPropertyAmenity,
  type SearchCriteria,
  type SelectedBookingAmenity,
  type SelectedBundleActivityInput,
  type ServerReservationIntent,
  type TravelActivity,
} from "@luxestay/contracts";
import { resolveSelectedBundleActivities } from "./activities.js";
import { projectPropertyAmenities } from "./amenities.js";
import {
  enumerateStayDates,
  evaluatePropertyAvailability,
  type ReservationOccupancyLike,
} from "./availability.js";
import { evaluatePromotionVoucher, normalizeVoucherCode } from "./vouchers.js";

export const CLEANING_FEE = 150000;
export const PAYMENT_EXPIRY_MINUTES = 15;
const DEFAULT_NIGHTS = 2;
const MAX_NIGHTS = 30;
const MS_PER_DAY = 86_400_000;

interface ParsedDateResult {
  date: Date;
  yearInferred: boolean;
}

function clampNights(nights: number): number {
  if (!Number.isFinite(nights)) return 1;
  return Math.min(MAX_NIGHTS, Math.max(1, Math.floor(nights)));
}

function clampAdults(adults: number, maxGuests: number): number {
  const safeMax = Math.max(1, Math.floor(maxGuests));
  if (!Number.isFinite(adults)) return 1;
  return Math.min(safeMax, Math.max(1, Math.floor(adults)));
}

function buildValidatedLocalDate(
  year: number,
  monthIndex: number,
  day: number
): Date | null {
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

function parseDateInput(
  dateStr: string | undefined,
  defaultYear: number
): ParsedDateResult | null {
  if (!dateStr) return null;
  const trimmed = dateStr.trim();

  const isoMatch = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(trimmed);
  if (isoMatch) {
    const date = buildValidatedLocalDate(
      Number(isoMatch[1]),
      Number(isoMatch[2]) - 1,
      Number(isoMatch[3])
    );
    return date ? { date, yearInferred: false } : null;
  }

  const dmyMatch = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed);
  if (dmyMatch) {
    const date = buildValidatedLocalDate(
      Number(dmyMatch[3]),
      Number(dmyMatch[2]) - 1,
      Number(dmyMatch[1])
    );
    return date ? { date, yearInferred: false } : null;
  }

  const dmMatch = /^(\d{1,2})\/(\d{1,2})$/.exec(trimmed);
  if (dmMatch) {
    const date = buildValidatedLocalDate(
      defaultYear,
      Number(dmMatch[2]) - 1,
      Number(dmMatch[1])
    );
    return date ? { date, yearInferred: true } : null;
  }

  return null;
}

function diffDaysUTC(start: Date, end: Date): number {
  const startUTC = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const endUTC = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.round((endUTC - startUTC) / MS_PER_DAY);
}

function formatDDMMYYYY(date: Date): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function computeStayDates(
  nights: number,
  checkInSeed?: string,
  fallbackBaseDate: Date = new Date()
): { checkIn: string; checkOut: string } {
  const safeNights = clampNights(nights);
  const parsed = parseDateInput(checkInSeed, fallbackBaseDate.getFullYear());

  const checkInDate = parsed
    ? new Date(parsed.date.getFullYear(), parsed.date.getMonth(), parsed.date.getDate())
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

function deriveSeedNights(
  searchCriteria: SearchCriteria | undefined,
  fallbackBaseDate: Date
): number {
  if (!searchCriteria?.checkIn || !searchCriteria?.checkOut) {
    return DEFAULT_NIGHTS;
  }

  const defaultYear = fallbackBaseDate.getFullYear();
  const parsedIn = parseDateInput(searchCriteria.checkIn, defaultYear);
  const parsedOut = parseDateInput(searchCriteria.checkOut, defaultYear);
  if (!parsedIn || !parsedOut) {
    return DEFAULT_NIGHTS;
  }

  let checkOutDate = parsedOut.date;
  if (parsedOut.yearInferred && diffDaysUTC(parsedIn.date, checkOutDate) <= 0) {
    const nextYearOut = buildValidatedLocalDate(
      parsedIn.date.getFullYear() + 1,
      parsedOut.date.getMonth(),
      parsedOut.date.getDate()
    );
    if (nextYearOut && diffDaysUTC(parsedIn.date, nextYearOut) <= MAX_NIGHTS) {
      checkOutDate = nextYearOut;
    }
  }

  const diff = diffDaysUTC(parsedIn.date, checkOutDate);
  if (diff < 1) {
    return DEFAULT_NIGHTS;
  }

  return clampNights(diff);
}

function buildSearchSeedKey(searchCriteria?: SearchCriteria): string {
  if (!searchCriteria) return "";
  return [
    searchCriteria.checkIn.trim(),
    searchCriteria.checkOut.trim(),
    searchCriteria.guests.adults,
    searchCriteria.guests.children,
    searchCriteria.guests.rooms,
  ].join("|");
}

function buildSelectedBookingAmenities(
  amenities: ResolvedPropertyAmenity[],
  selectedIds: string[]
): SelectedBookingAmenity[] {
  const selectedSet = new Set(selectedIds);
  const result: SelectedBookingAmenity[] = [];

  for (const item of amenities) {
    if (!selectedSet.has(item.id)) continue;
    if (item.pricingType !== "paid" && item.pricingType !== "free-reservation") continue;

    result.push({
      id: item.id,
      name: item.name,
      category: item.category,
      pricingType: item.pricingType,
      price: item.pricingType === "paid" ? (item.price ?? 0) : 0,
      priceUnit: item.pricingType === "paid" ? item.priceUnit : undefined,
    });
  }

  return result;
}

function calculateBookingPricing(
  stayPricing: {
    basePrice: number;
    nightsTotal: number;
    seasonalSurcharge: number;
    nightlyBreakdown: readonly NightlyPriceBreakdown[];
  },
  selectedAmenities: SelectedBookingAmenity[],
  promo?: {
    promoCode?: string;
    vouchers?: readonly PromotionVoucher[];
    now?: Date;
    isAuthenticated?: boolean;
    hasPriorSuccessfulBookings?: boolean;
    property?: Pick<Property, "propertyType" | "category">;
  },
  activitiesFee = 0
): BookingQuote["pricing"] {
  const { basePrice, nightsTotal, seasonalSurcharge, nightlyBreakdown } = stayPricing;
  const amenitiesFee = selectedAmenities.reduce(
    (sum, item) => sum + (item.pricingType === "paid" ? item.price : 0),
    0
  );
  const safeActivitiesFee = Math.max(0, Math.round(Number.isFinite(activitiesFee) ? activitiesFee : 0));
  const subtotal = nightsTotal + CLEANING_FEE + amenitiesFee + safeActivitiesFee;

  let discount = 0;
  let appliedPromoCode: string | undefined;

  const normalizedPromo = normalizeVoucherCode(promo?.promoCode);
  if (normalizedPromo && promo?.vouchers && promo.vouchers.length > 0) {
    const evalResult = evaluatePromotionVoucher(
      normalizedPromo,
      subtotal,
      promo.vouchers,
      {
        now: promo.now,
        isAuthenticated: promo.isAuthenticated,
        hasPriorSuccessfulBookings: promo.hasPriorSuccessfulBookings,
        property: promo.property,
      }
    );
    if (evalResult.ok) {
      discount = evalResult.discount;
      appliedPromoCode = evalResult.code;
    }
  }

  const total = Math.max(0, subtotal - discount);

  return {
    basePrice,
    nightsTotal,
    seasonalSurcharge,
    nightlyBreakdown: Object.freeze(
      nightlyBreakdown.map((item) => Object.freeze({ ...item }))
    ),
    cleaningFee: CLEANING_FEE,
    serviceFee: 0,
    amenitiesFee,
    activitiesFee: safeActivitiesFee,
    discount,
    ...(appliedPromoCode ? { appliedPromoCode } : {}),
    total,
  };
}

function seedSessionForProperty(
  property: Property,
  step: "previewing" | "checking-out",
  searchCriteria?: SearchCriteria,
  fallbackBaseDate: Date = new Date(),
  initialPromoCode?: string | null
): BookingSessionState {
  const defaultYear = fallbackBaseDate.getFullYear();
  const parsedIn = parseDateInput(searchCriteria?.checkIn, defaultYear);
  const validCheckInSeed = parsedIn ? (searchCriteria?.checkIn?.trim() ?? "") : "";
  const nights = deriveSeedNights(searchCriteria, fallbackBaseDate);
  const seededAdults = searchCriteria?.guests.adults ?? 2;
  const seededChildren = Math.max(0, Math.floor(searchCriteria?.guests.children ?? 0));
  const seededRooms = Math.max(1, Math.floor(searchCriteria?.guests.rooms ?? 1));
  const normalizedPromo = normalizeVoucherCode(initialPromoCode);

  return {
    step,
    property,
    searchSeedKey: buildSearchSeedKey(searchCriteria),
    checkInSeed: validCheckInSeed,
    nights,
    guests: {
      adults: clampAdults(seededAdults, property.maxGuests),
      children: seededChildren,
      rooms: seededRooms,
    },
    selectedAmenityIds: [],
    selectedActivities: [],
    promoCode: normalizedPromo || undefined,
    confirmedBooking: null,
  };
}

export function createIdleBookingSession(): BookingSessionState {
  return {
    step: "idle",
    property: null,
    searchSeedKey: "",
    checkInSeed: "",
    nights: DEFAULT_NIGHTS,
    guests: {
      adults: 2,
      children: 0,
      rooms: 1,
    },
    selectedAmenityIds: [],
    selectedActivities: [],
    promoCode: undefined,
    confirmedBooking: null,
  };
}

export function openPropertySession(
  current: BookingSessionState,
  property: Property,
  searchCriteria?: SearchCriteria,
  fallbackBaseDate: Date = new Date(),
  initialPromoCode?: string | null
): BookingSessionState {
  const incomingSeedKey = buildSearchSeedKey(searchCriteria);
  const sameProperty = current.property?.id === property.id;
  const searchUnchanged = current.searchSeedKey === incomingSeedKey;
  const normalizedInitialPromo = normalizeVoucherCode(initialPromoCode);

  if (sameProperty && searchUnchanged) {
    return {
      ...current,
      step: "previewing",
      property,
      nights: clampNights(current.nights),
      guests: {
        ...current.guests,
        adults: clampAdults(current.guests.adults, property.maxGuests),
      },
      ...(normalizedInitialPromo ? { promoCode: normalizedInitialPromo } : {}),
      confirmedBooking: null,
    };
  }

  return seedSessionForProperty(
    property,
    "previewing",
    searchCriteria,
    fallbackBaseDate,
    initialPromoCode
  );
}

export function startCheckoutSession(
  current: BookingSessionState,
  property: Property,
  searchCriteria?: SearchCriteria,
  fallbackBaseDate: Date = new Date(),
  initialPromoCode?: string | null
): BookingSessionState {
  const incomingSeedKey = buildSearchSeedKey(searchCriteria);
  const sameProperty = current.property?.id === property.id;
  const preserveFromActiveFlow =
    current.step === "previewing" || current.searchSeedKey === incomingSeedKey;
  const normalizedInitialPromo = normalizeVoucherCode(initialPromoCode);

  if (sameProperty && preserveFromActiveFlow) {
    return {
      ...current,
      step: "checking-out",
      property,
      nights: clampNights(current.nights),
      guests: {
        ...current.guests,
        adults: clampAdults(current.guests.adults, property.maxGuests),
      },
      ...(normalizedInitialPromo ? { promoCode: normalizedInitialPromo } : {}),
      confirmedBooking: null,
    };
  }

  return seedSessionForProperty(
    property,
    "checking-out",
    searchCriteria,
    fallbackBaseDate,
    initialPromoCode
  );
}

export function closePreviewSession(current: BookingSessionState): BookingSessionState {
  if (current.step !== "previewing") return current;
  return {
    ...current,
    step: "idle",
  };
}

export function closeCheckoutSession(current: BookingSessionState): BookingSessionState {
  if (current.step !== "checking-out") return current;
  return {
    ...current,
    step: "idle",
  };
}

export function dismissConfirmedBooking(current: BookingSessionState): BookingSessionState {
  if (!current.confirmedBooking && current.step !== "confirmed") return current;
  return createIdleBookingSession();
}

export function updateSessionNights(
  current: BookingSessionState,
  nights: number
): BookingSessionState {
  return {
    ...current,
    nights: clampNights(nights),
  };
}

export function updateSessionAdults(
  current: BookingSessionState,
  adults: number
): BookingSessionState {
  const maxGuests = current.property?.maxGuests ?? 10;
  return {
    ...current,
    guests: {
      ...current.guests,
      adults: clampAdults(adults, maxGuests),
    },
  };
}

export function toggleSessionAmenity(
  current: BookingSessionState,
  amenityId: string
): BookingSessionState {
  if (!current.property) return current;
  const target = projectPropertyAmenities(current.property).byId.get(amenityId);
  if (!target || target.pricingType === "included") {
    return current;
  }

  const exists = current.selectedAmenityIds.includes(amenityId);
  const nextIds = exists
    ? current.selectedAmenityIds.filter((id) => id !== amenityId)
    : [...current.selectedAmenityIds, amenityId];

  return {
    ...current,
    selectedAmenityIds: nextIds,
  };
}

export function removeSessionAmenity(
  current: BookingSessionState,
  amenityId: string
): BookingSessionState {
  if (!current.selectedAmenityIds.includes(amenityId)) return current;
  return {
    ...current,
    selectedAmenityIds: current.selectedAmenityIds.filter((id) => id !== amenityId),
  };
}

export function toggleSessionActivity(
  current: BookingSessionState,
  item: SelectedBundleActivityInput
): BookingSessionState {
  const existing = current.selectedActivities ?? [];
  const exists = existing.some((entry) => entry.activityId === item.activityId);
  return {
    ...current,
    selectedActivities: exists
      ? existing.filter((entry) => entry.activityId !== item.activityId)
      : [...existing, item],
  };
}

export function removeSessionActivity(
  current: BookingSessionState,
  activityId: string
): BookingSessionState {
  const existing = current.selectedActivities ?? [];
  if (!existing.some((entry) => entry.activityId === activityId)) return current;
  return {
    ...current,
    selectedActivities: existing.filter((entry) => entry.activityId !== activityId),
  };
}

export function updateSessionCheckIn(
  current: BookingSessionState,
  checkInSeed: string
): BookingSessionState {
  const trimmed = checkInSeed.trim();
  return {
    ...current,
    checkInSeed: trimmed,
  };
}

export function updateSessionRooms(
  current: BookingSessionState,
  rooms: number
): BookingSessionState {
  const maxRooms = Math.max(1, current.property?.inventoryCount ?? 10);
  const safeRooms = Number.isFinite(rooms)
    ? Math.min(maxRooms, Math.max(1, Math.floor(rooms)))
    : 1;
  return {
    ...current,
    guests: {
      ...current.guests,
      rooms: safeRooms,
    },
  };
}

export function setSessionPromoCode(
  current: BookingSessionState,
  promoCode: string | undefined | null
): BookingSessionState {
  const normalized = normalizeVoucherCode(promoCode);
  return {
    ...current,
    promoCode: normalized || undefined,
  };
}

export interface DeriveBookingQuoteOptions {
  vouchers?: readonly PromotionVoucher[];
  now?: Date;
  isAuthenticated?: boolean;
  hasPriorSuccessfulBookings?: boolean;
  dailyOverrides?: readonly PropertyAvailabilityOverride[];
  activities?: readonly TravelActivity[];
  bookedActivityCounts?: ReadonlyMap<string, number>;
  activityItemIdPrefix?: string;
}

export function deriveBookingQuote(
  session: BookingSessionState,
  fallbackBaseDate: Date = new Date(),
  options?: DeriveBookingQuoteOptions
): BookingQuote | null {
  if (!session.property) return null;

  const property = session.property;
  const nights = clampNights(session.nights);
  const adults = clampAdults(session.guests.adults, property.maxGuests);
  const rooms = Math.max(1, Math.floor(session.guests.rooms));
  const { checkIn, checkOut } = computeStayDates(nights, session.checkInSeed, fallbackBaseDate);
  const stayDates = enumerateStayDates(checkIn, nights);
  const evalNow = options?.now ?? fallbackBaseDate;
  const availability = evaluatePropertyAvailability(
    property,
    stayDates,
    rooms,
    options?.dailyOverrides,
    [],
    evalNow
  );

  const resolvedAmenities = [...projectPropertyAmenities(property).all];
  const selectedAmenities = buildSelectedBookingAmenities(
    resolvedAmenities,
    session.selectedAmenityIds
  );

  let resolvedActivities: readonly BookedBundleActivity[] = [];
  let activitiesFee = 0;
  if (session.selectedActivities && session.selectedActivities.length > 0 && options?.activities) {
    const bundleEval = resolveSelectedBundleActivities(
      session.selectedActivities,
      options.activities,
      {
        bookedCountByKey: options.bookedActivityCounts,
        itemIdPrefix: options.activityItemIdPrefix,
      }
    );
    if (bundleEval.ok) {
      resolvedActivities = bundleEval.items;
      activitiesFee = bundleEval.activitiesFee;
    }
  }

  const pricing = calculateBookingPricing(
    {
      basePrice: property.pricePerNight,
      nightsTotal: availability.nightsTotal,
      seasonalSurcharge: availability.seasonalSurcharge,
      nightlyBreakdown: availability.nightlyBreakdown,
    },
    selectedAmenities,
    {
      promoCode: session.promoCode,
      vouchers: options?.vouchers,
      now: evalNow,
      isAuthenticated: options?.isAuthenticated,
      hasPriorSuccessfulBookings: options?.hasPriorSuccessfulBookings,
      property,
    },
    activitiesFee
  );

  return {
    property,
    nights,
    checkIn,
    checkOut,
    guests: {
      adults,
      children: Math.max(0, Math.floor(session.guests.children)),
      rooms,
    },
    resolvedAmenities,
    selectedAmenityIds: selectedAmenities.map((item) => item.id),
    selectedAmenities,
    selectedActivities: [...resolvedActivities],
    pricing,
  };
}

export function validateCheckoutGuestInput(
  input: CheckoutGuestInput
): { ok: true; value: CheckoutGuestInput } | { ok: false; error: string } {
  const fullName = input.fullName.trim();
  const phone = input.phone.trim();
  const email = input.email.trim();
  const note = input.note?.trim() || undefined;

  if (!fullName || !phone || !email) {
    return {
      ok: false,
      error: "Vui lòng điền đầy đủ họ tên, số điện thoại và email!",
    };
  }

  const normalizedPhoneDigits = phone.replace(/[\s.-]/g, "");
  if (!VN_PHONE_REGEX.test(normalizedPhoneDigits)) {
    return {
      ok: false,
      error: "Số điện thoại chưa đúng định dạng. Vui lòng kiểm tra lại!",
    };
  }

  if (!EMAIL_REGEX.test(email)) {
    return {
      ok: false,
      error: "Địa chỉ email chưa đúng định dạng. Vui lòng kiểm tra lại!",
    };
  }

  return {
    ok: true,
    value: {
      fullName,
      phone,
      email,
      note,
      paymentMethod: input.paymentMethod,
      ...(input.promoCode?.trim()
        ? { promoCode: normalizeVoucherCode(input.promoCode) }
        : {}),
    },
  };
}

export function processServerReservationIntent(
  intent: ServerReservationIntent,
  properties: readonly Property[],
  options?: {
    bookingId?: string;
    createdAt?: string;
    fallbackBaseDate?: Date;
    vouchers?: readonly PromotionVoucher[];
    userId?: string;
    isAuthenticated?: boolean;
    hasPriorSuccessfulBookings?: boolean;
    now?: Date;
    paymentExpiresInMinutes?: number;
    dailyOverrides?: readonly PropertyAvailabilityOverride[];
    existingReservations?: readonly ReservationOccupancyLike[];
    enforceAvailability?: boolean;
    activities?: readonly TravelActivity[];
    bookedActivityCounts?: ReadonlyMap<string, number>;
  }
):
  | { ok: true; booking: BookingDetails }
  | { ok: false; error: string; status: 400 | 404 | 409 | 422; code?: "CONFLICT" } {
  if (!intent || typeof intent.propertyId !== "string" || !intent.propertyId.trim()) {
    return {
      ok: false,
      error: "Thiếu mã chỗ nghỉ cần đặt phòng.",
      status: 400,
    };
  }

  const property = properties.find((item) => item.id === intent.propertyId.trim());
  if (!property) {
    return {
      ok: false,
      error: "Chỗ nghỉ không tồn tại hoặc đã ngừng nhận đặt phòng.",
      status: 404,
    };
  }

  const validPaymentMethods = new Set(["momo", "vnpay", "card", "hotel"]);
  if (!validPaymentMethods.has(intent.paymentMethod)) {
    return {
      ok: false,
      error: "Phương thức thanh toán không hợp lệ.",
      status: 400,
    };
  }

  const validation = validateCheckoutGuestInput({
    fullName: intent.guestInfo?.fullName ?? "",
    phone: intent.guestInfo?.phone ?? "",
    email: intent.guestInfo?.email ?? "",
    note: intent.guestInfo?.note,
    paymentMethod: intent.paymentMethod,
    promoCode: intent.promoCode,
  });
  if (!validation.ok) {
    return {
      ok: false,
      error: validation.error,
      status: 400,
    };
  }

  const fallbackBaseDate = options?.fallbackBaseDate ?? new Date();
  const evalNow = options?.now ?? fallbackBaseDate;
  const parsedIn = parseDateInput(intent.checkInSeed, fallbackBaseDate.getFullYear());
  const validCheckInSeed = parsedIn ? (intent.checkInSeed?.trim() ?? "") : "";
  const requestedPromoCode = normalizeVoucherCode(intent.promoCode);

  const serverSession: BookingSessionState = {
    step: "checking-out",
    property,
    searchSeedKey: "",
    checkInSeed: validCheckInSeed,
    nights: clampNights(intent.nights),
    guests: {
      adults: clampAdults(intent.guests?.adults ?? 1, property.maxGuests),
      children: Math.max(0, Math.floor(intent.guests?.children ?? 0)),
      rooms: Math.max(1, Math.floor(intent.guests?.rooms ?? 1)),
    },
    selectedAmenityIds: Array.isArray(intent.selectedAmenityIds)
      ? intent.selectedAmenityIds.filter((id): id is string => typeof id === "string")
      : [],
    selectedActivities: Array.isArray(intent.selectedActivities) ? intent.selectedActivities : [],
    promoCode: requestedPromoCode || undefined,
    confirmedBooking: null,
  };

  const bookingId =
    options?.bookingId ?? `LX-${Math.floor(100000 + Math.random() * 900000)}`;

  // Validate selected bundle activities strictly before pricing/saving
  const requestedBundleActivities = Array.isArray(intent.selectedActivities)
    ? intent.selectedActivities
    : [];
  if (requestedBundleActivities.length > 0) {
    const bundleCheck = resolveSelectedBundleActivities(
      requestedBundleActivities,
      options?.activities,
      {
        bookedCountByKey: options?.bookedActivityCounts,
        itemIdPrefix: `${bookingId.toLowerCase()}-act`,
      }
    );
    if (!bundleCheck.ok) {
      return {
        ok: false,
        error: bundleCheck.message,
        status: bundleCheck.status,
        ...(bundleCheck.code === "CONFLICT" ? { code: "CONFLICT" as const } : {}),
      };
    }
  }

  if (options?.enforceAvailability) {
    const { checkIn } = computeStayDates(serverSession.nights, validCheckInSeed, fallbackBaseDate);
    const stayDates = enumerateStayDates(checkIn, serverSession.nights);
    const availability = evaluatePropertyAvailability(
      property,
      stayDates,
      serverSession.guests.rooms,
      options.dailyOverrides ?? [],
      options.existingReservations ?? [],
      evalNow
    );
    if (!availability.available) {
      return {
        ok: false,
        error:
          availability.errorMessage ??
          "Chỗ nghỉ không còn đủ phòng trống cho các ngày đã chọn.",
        status: 409,
        code: "CONFLICT",
      };
    }
  }

  // If client explicitly supplied a promoCode, validate strictly before building quote
  if (requestedPromoCode) {
    const baseQuote = deriveBookingQuote(
      { ...serverSession, promoCode: undefined },
      fallbackBaseDate,
      {
        dailyOverrides: options?.dailyOverrides,
        now: evalNow,
        activities: options?.activities,
        bookedActivityCounts: options?.bookedActivityCounts,
        activityItemIdPrefix: `${bookingId.toLowerCase()}-act`,
      }
    );
    if (!baseQuote) {
      return {
        ok: false,
        error: "Không thể tính báo giá cho chỗ nghỉ này.",
        status: 422,
      };
    }
    const subtotal =
      baseQuote.pricing.nightsTotal +
      baseQuote.pricing.cleaningFee +
      baseQuote.pricing.amenitiesFee +
      (baseQuote.pricing.activitiesFee ?? 0);
    const voucherEval = evaluatePromotionVoucher(
      requestedPromoCode,
      subtotal,
      options?.vouchers ?? [],
      {
        now: evalNow,
        isAuthenticated: options?.isAuthenticated ?? Boolean(options?.userId),
        hasPriorSuccessfulBookings: options?.hasPriorSuccessfulBookings,
        property,
      }
    );
    if (!voucherEval.ok) {
      return {
        ok: false,
        error: voucherEval.message,
        status: 400,
      };
    }
  }

  const serverQuote = deriveBookingQuote(serverSession, fallbackBaseDate, {
    vouchers: options?.vouchers,
    now: evalNow,
    isAuthenticated: options?.isAuthenticated ?? Boolean(options?.userId),
    hasPriorSuccessfulBookings: options?.hasPriorSuccessfulBookings,
    dailyOverrides: options?.dailyOverrides,
    activities: options?.activities,
    bookedActivityCounts: options?.bookedActivityCounts,
    activityItemIdPrefix: `${bookingId.toLowerCase()}-act`,
  });
  if (!serverQuote) {
    return {
      ok: false,
      error: "Không thể tính báo giá cho chỗ nghỉ này.",
      status: 422,
    };
  }

  const createdAt = options?.createdAt ?? new Date().toISOString();
  const { fullName, phone, email, note, paymentMethod } = validation.value;

  const isOnlinePayment = paymentMethod !== "hotel";
  const initialStatus: ReservationStatus = isOnlinePayment ? "pending_payment" : "confirmed";
  const expiryMinutes = options?.paymentExpiresInMinutes ?? PAYMENT_EXPIRY_MINUTES;
  const createdAtMs = Date.parse(createdAt);
  const paymentExpiresAt = isOnlinePayment
    ? new Date((Number.isFinite(createdAtMs) ? createdAtMs : Date.now()) + expiryMinutes * 60_000).toISOString()
    : undefined;

  const booking: BookingDetails = Object.freeze({
    property: serverQuote.property,
    checkIn: serverQuote.checkIn,
    checkOut: serverQuote.checkOut,
    nights: serverQuote.nights,
    guests: Object.freeze({ ...serverQuote.guests }),
    pricing: Object.freeze({ ...serverQuote.pricing }),
    selectedAmenities: Object.freeze(
      serverQuote.selectedAmenities.map((item) => Object.freeze({ ...item }))
    ),
    selectedActivities: Object.freeze(
      (serverQuote.selectedActivities ?? []).map((item) => Object.freeze({ ...item }))
    ),
    guestInfo: Object.freeze({ fullName, phone, email, note }),
    paymentMethod,
    bookingId,
    ...(options?.userId ? { userId: options.userId } : {}),
    createdAt,
    status: initialStatus,
    ...(paymentExpiresAt ? { paymentExpiresAt } : {}),
  });

  return {
    ok: true,
    booking,
  };
}

export function normalizeContactPhone(input: string): string | null {
  const digitsOnly = input.trim().replace(/[\s.-]/g, "");
  if (!digitsOnly) return null;
  if (digitsOnly.startsWith("+84")) {
    return `0${digitsOnly.slice(3)}`;
  }
  if (digitsOnly.startsWith("84") && digitsOnly.length >= 10) {
    return `0${digitsOnly.slice(2)}`;
  }
  return digitsOnly;
}

export function matchesReservationContact(
  booking: Pick<BookingDetails, "guestInfo">,
  contact: string
): boolean {
  const trimmed = contact.trim();
  if (!trimmed) return false;

  if (trimmed.includes("@")) {
    return trimmed.toLowerCase() === booking.guestInfo.email.trim().toLowerCase();
  }

  const normalizedInput = normalizeContactPhone(trimmed);
  const normalizedStored = normalizeContactPhone(booking.guestInfo.phone);
  if (normalizedInput && normalizedStored && normalizedInput === normalizedStored) {
    return true;
  }

  return trimmed.toLowerCase() === booking.guestInfo.email.trim().toLowerCase();
}

export function canAccessReservation(
  booking: Pick<BookingDetails, "guestInfo" | "userId">,
  credentials: { contact?: string; authenticatedUserId?: string }
): boolean {
  if (
    credentials.authenticatedUserId &&
    booking.userId &&
    booking.userId === credentials.authenticatedUserId
  ) {
    return true;
  }
  if (credentials.contact && matchesReservationContact(booking, credentials.contact)) {
    return true;
  }
  return false;
}

export function evaluateReservationCancellation(
  booking: BookingDetails,
  input: { contact?: string; reason?: string },
  options?: { cancelledAt?: string; authenticatedUserId?: string }
):
  | { ok: true; booking: BookingDetails }
  | { ok: false; status: 403 | 409; code: "FORBIDDEN" | "CONFLICT"; error: string } {
  if (
    !canAccessReservation(booking, {
      contact: input.contact,
      authenticatedUserId: options?.authenticatedUserId,
    })
  ) {
    return {
      ok: false,
      status: 403,
      code: "FORBIDDEN",
      error: "Email hoặc số điện thoại không khớp với thông tin đặt phòng này.",
    };
  }

  if (booking.status === "cancelled") {
    return {
      ok: false,
      status: 409,
      code: "CONFLICT",
      error: "Đơn đặt phòng này đã được hủy trước đó.",
    };
  }

  if (booking.status === "completed") {
    return {
      ok: false,
      status: 409,
      code: "CONFLICT",
      error: "Đơn đặt phòng đã hoàn tất lưu trú, không thể hủy.",
    };
  }

  if (booking.status === "payment_failed" || booking.status === "expired") {
    return {
      ok: false,
      status: 409,
      code: "CONFLICT",
      error: "Đơn đặt phòng này đã kết thúc do thanh toán không thành công hoặc hết hạn.",
    };
  }

  // Confirmed reservations must respect property freeCancellation policy; pending_payment can always be cancelled
  if (booking.status === "confirmed" && !booking.property.freeCancellation) {
    return {
      ok: false,
      status: 409,
      code: "CONFLICT",
      error:
        "Chỗ nghỉ này không áp dụng chính sách hủy miễn phí trực tuyến. Vui lòng liên hệ hỗ trợ LuxeStay.",
    };
  }

  const cancelledAt = options?.cancelledAt ?? new Date().toISOString();
  const reason = input.reason?.trim() || undefined;

  const cancelledBooking: BookingDetails = Object.freeze({
    ...booking,
    guests: Object.freeze({ ...booking.guests }),
    pricing: Object.freeze({ ...booking.pricing }),
    selectedAmenities: Object.freeze(
      booking.selectedAmenities.map((item) => Object.freeze({ ...item }))
    ),
    guestInfo: Object.freeze({ ...booking.guestInfo }),
    status: "cancelled",
    cancelledAt,
    cancellationReason: reason,
  });

  return {
    ok: true,
    booking: cancelledBooking,
  };
}

export function evaluateReservationCompletion(
  booking: BookingDetails,
  input: { contact?: string } = {},
  options?: {
    completedAt?: string;
    authenticatedUserId?: string;
    bypassOwnershipCheck?: boolean;
  }
):
  | { ok: true; booking: BookingDetails }
  | { ok: false; status: 403 | 409; code: "FORBIDDEN" | "CONFLICT"; error: string } {
  if (
    !options?.bypassOwnershipCheck &&
    !canAccessReservation(booking, {
      contact: input.contact,
      authenticatedUserId: options?.authenticatedUserId,
    })
  ) {
    return {
      ok: false,
      status: 403,
      code: "FORBIDDEN",
      error: "Bạn không có quyền xác nhận hoàn tất lưu trú cho đơn đặt phòng này.",
    };
  }

  if (booking.status === "completed") {
    return {
      ok: false,
      status: 409,
      code: "CONFLICT",
      error: "Đơn đặt phòng này đã được hoàn tất lưu trú trước đó.",
    };
  }

  if (booking.status !== "confirmed") {
    return {
      ok: false,
      status: 409,
      code: "CONFLICT",
      error: `Chỉ có thể đánh dấu hoàn tất lưu trú cho đơn đã xác nhận (hiện tại: "${booking.status}").`,
    };
  }

  const completedAt = options?.completedAt ?? new Date().toISOString();
  const completedBooking: BookingDetails = Object.freeze({
    ...booking,
    guests: Object.freeze({ ...booking.guests }),
    pricing: Object.freeze({ ...booking.pricing }),
    selectedAmenities: Object.freeze(
      booking.selectedAmenities.map((item) => Object.freeze({ ...item }))
    ),
    guestInfo: Object.freeze({ ...booking.guestInfo }),
    status: "completed",
    completedAt,
  });

  return {
    ok: true,
    booking: completedBooking,
  };
}

export function evaluatePaymentWebhookTransition(
  booking: BookingDetails,
  outcome: PaymentOutcome
):
  | { ok: true; nextStatus: ReservationStatus; booking: BookingDetails; changed: boolean }
  | { ok: false; status: 409; code: "CONFLICT"; error: string } {
  const targetStatus: ReservationStatus =
    outcome === "succeeded"
      ? "confirmed"
      : outcome === "failed"
        ? "payment_failed"
        : "expired";

  if (booking.status === targetStatus) {
    return { ok: true, nextStatus: targetStatus, booking, changed: false };
  }

  if (booking.status !== "pending_payment") {
    return {
      ok: false,
      status: 409,
      code: "CONFLICT",
      error: `Không thể chuyển trạng thái đơn từ "${booking.status}" sang "${targetStatus}".`,
    };
  }

  const nextBooking: BookingDetails = Object.freeze({
    ...booking,
    guests: Object.freeze({ ...booking.guests }),
    pricing: Object.freeze({ ...booking.pricing }),
    selectedAmenities: Object.freeze(
      booking.selectedAmenities.map((item) => Object.freeze({ ...item }))
    ),
    guestInfo: Object.freeze({ ...booking.guestInfo }),
    status: targetStatus,
  });

  return {
    ok: true,
    nextStatus: targetStatus,
    booking: nextBooking,
    changed: true,
  };
}

function createAbortError(): Error {
  const error = new Error("Reservation submission aborted");
  error.name = "AbortError";
  return error;
}

export async function submitBookingSession(
  session: BookingSessionState,
  input: CheckoutGuestInput,
  submitter: ReservationSubmitter,
  options?: {
    signal?: AbortSignal;
    fallbackBaseDate?: Date;
    vouchers?: readonly PromotionVoucher[];
    isAuthenticated?: boolean;
    hasPriorSuccessfulBookings?: boolean;
    dailyOverrides?: readonly PropertyAvailabilityOverride[];
    activities?: readonly TravelActivity[];
  }
): Promise<
  | { ok: true; booking: BookingDetails; nextSession: BookingSessionState }
  | { ok: false; error: string }
> {
  if (options?.signal?.aborted) {
    throw createAbortError();
  }

  if (session.step !== "checking-out") {
    return {
      ok: false,
      error: "Phiên đặt phòng đã đóng. Vui lòng mở lại chỗ nghỉ để xác nhận.",
    };
  }

  const effectivePromo = normalizeVoucherCode(input.promoCode ?? session.promoCode) || undefined;
  const quote = deriveBookingQuote(
    { ...session, promoCode: effectivePromo },
    options?.fallbackBaseDate,
    {
      vouchers: options?.vouchers,
      isAuthenticated: options?.isAuthenticated,
      hasPriorSuccessfulBookings: options?.hasPriorSuccessfulBookings,
      dailyOverrides: options?.dailyOverrides,
      activities: options?.activities,
    }
  );
  if (!quote) {
    return {
      ok: false,
      error: "Không tìm thấy chỗ nghỉ đang chọn để xác nhận đặt phòng.",
    };
  }

  const validation = validateCheckoutGuestInput({
    ...input,
    promoCode: effectivePromo,
  });
  if (!validation.ok) {
    return validation;
  }

  const { fullName, phone, email, note, paymentMethod, promoCode } = validation.value;
  const selectedActivities = session.selectedActivities ?? [];
  const booking = await submitter.submit(
    {
      quote,
      guestInfo: { fullName, phone, email, note },
      paymentMethod,
      ...(promoCode ? { promoCode } : {}),
      ...(selectedActivities.length > 0 ? { selectedActivities } : {}),
    },
    { signal: options?.signal }
  );

  if (options?.signal?.aborted) {
    throw createAbortError();
  }

  const resetSession = createIdleBookingSession();
  return {
    ok: true,
    booking,
    nextSession: {
      ...resetSession,
      step: "confirmed",
      confirmedBooking: booking,
    },
  };
}
