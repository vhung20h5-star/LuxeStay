import {
  ActivityHubSectionSchema,
  ActivitySortOptionSchema,
  ActivitySubcategorySchema,
  ActivityTimeSlotPeriodSchema,
  ServiceBookingIntentSchema,
  type ActivitiesQueryParams,
  type ActivityBooking,
  type ActivityCategory,
  type ActivityHubSection,
  type ActivitySlot,
  type ActivitySubcategory,
  type AuthUser,
  type BookedBundleActivity,
  type BookingDetails,
  type ErrorCode,
  type PromotionVoucher,
  type SelectedBundleActivityInput,
  type ServiceBookingIntent,
  type TravelActivity,
} from "@luxestay/contracts";
import { normalizeVietnamese } from "./utils.js";
import { evaluatePromotionVoucher, normalizeVoucherCode } from "./vouchers.js";

export interface ActivitySubcategoryDefinition {
  readonly id: ActivitySubcategory;
  readonly section: ActivityHubSection;
  readonly labelVi: string;
  readonly labelEn: string;
}

export const ACTIVITY_HUB_SECTION_ORDER: readonly ActivityHubSection[] = Object.freeze([
  "attractions",
  "tours",
  "essentials",
  "entertainment",
]);

export const ACTIVITY_SUBCATEGORY_DEFINITIONS: readonly ActivitySubcategoryDefinition[] =
  Object.freeze([
    {
      id: "theme-park",
      section: "attractions",
      labelVi: "Công viên giải trí & Cáp treo",
      labelEn: "Theme Parks & Cable Cars",
    },
    {
      id: "heritage-culture",
      section: "attractions",
      labelVi: "Di sản & Văn hóa",
      labelEn: "Heritage & Culture",
    },
    {
      id: "island-sea",
      section: "tours",
      labelVi: "Tour đảo & Biển",
      labelEn: "Island & Sea Tours",
    },
    {
      id: "mountain-nature",
      section: "tours",
      labelVi: "Săn mây & Thiên nhiên",
      labelEn: "Mountains & Nature",
    },
    {
      id: "local-workshop",
      section: "tours",
      labelVi: "Trải nghiệm bản địa",
      labelEn: "Local Experiences",
    },
    {
      id: "airport-transfer",
      section: "essentials",
      labelVi: "Đưa đón sân bay & Limousine",
      labelEn: "Airport Transfers & Limo",
    },
    {
      id: "sim-wifi",
      section: "essentials",
      labelVi: "SIM, eSIM 4G & WiFi",
      labelEn: "eSIM, 4G SIM & WiFi",
    },
    {
      id: "fast-track",
      section: "essentials",
      labelVi: "Fast-Track & Phòng chờ",
      labelEn: "Fast-Track & Lounges",
    },
    {
      id: "live-show",
      section: "entertainment",
      labelVi: "Show diễn & Nghệ thuật",
      labelEn: "Live Shows & Performances",
    },
    {
      id: "spa-wellness",
      section: "entertainment",
      labelVi: "Spa, Tắm bùn & Thảo mộc",
      labelEn: "Spa, Mud Bath & Wellness",
    },
    {
      id: "dining-cruise",
      section: "entertainment",
      labelVi: "Ẩm thực & Du thuyền tối",
      labelEn: "Dining & Night Cruises",
    },
  ]);

const SUBCATEGORY_TO_SECTION_MAP = new Map<ActivitySubcategory, ActivityHubSection>(
  ACTIVITY_SUBCATEGORY_DEFINITIONS.map((def) => [def.id, def.section])
);

export function resolveHubSectionForSubcategory(
  subcategory: ActivitySubcategory
): ActivityHubSection {
  return SUBCATEGORY_TO_SECTION_MAP.get(subcategory) ?? "tours";
}

export function getSubcategoriesForSection(
  section: ActivityHubSection | "explore"
): readonly ActivitySubcategoryDefinition[] {
  if (section === "explore") {
    return ACTIVITY_SUBCATEGORY_DEFINITIONS;
  }
  return Object.freeze(ACTIVITY_SUBCATEGORY_DEFINITIONS.filter((def) => def.section === section));
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidIsoDateString(value: string): boolean {
  if (!ISO_DATE_RE.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(y, m - 1, d));
  return (
    parsed.getUTCFullYear() === y &&
    parsed.getUTCMonth() === m - 1 &&
    parsed.getUTCDate() === d
  );
}

function normalizeEmailForContact(value: string): string {
  return value.trim().toLowerCase();
}

function normalizePhoneForContact(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("84") && digits.length >= 10) {
    return `0${digits.slice(2)}`;
  }
  return digits;
}

export function matchesActivityBookingContact(
  booking: Pick<ActivityBooking, "guestInfo">,
  contact: string | undefined
): boolean {
  const trimmed = contact?.trim() ?? "";
  if (!trimmed) return false;
  if (trimmed.includes("@")) {
    return normalizeEmailForContact(booking.guestInfo.email) === normalizeEmailForContact(trimmed);
  }
  const normInput = normalizePhoneForContact(trimmed);
  const normStored = normalizePhoneForContact(booking.guestInfo.phone);
  return normInput.length >= 8 && normInput === normStored;
}

export function canAccessActivityBooking(
  booking: Pick<ActivityBooking, "userId" | "guestInfo">,
  credentials: { authUser?: AuthUser | null; contact?: string }
): boolean {
  const actor = credentials.authUser ?? null;
  if (actor) {
    if (actor.role === "admin") return true;
    if (booking.userId && booking.userId === actor.id) return true;
    if (normalizeEmailForContact(booking.guestInfo.email) === normalizeEmailForContact(actor.email)) {
      return true;
    }
  }
  return matchesActivityBookingContact(booking, credentials.contact);
}

export function normalizeActivitySlug(slug: string): string {
  return slug.trim().toLowerCase();
}

export function getActivityCategories(
  activities: readonly TravelActivity[]
): readonly ActivityCategory[] {
  const order: ActivityCategory[] = ["transfer", "tour", "experience", "wellness", "culinary"];
  const present = new Set(activities.filter((a) => a.isActive).map((a) => a.category));
  return Object.freeze(order.filter((cat) => present.has(cat)));
}

export function getActivitySections(
  activities: readonly TravelActivity[]
): readonly ActivityHubSection[] {
  const present = new Set(activities.filter((a) => a.isActive).map((a) => a.hubSection));
  return Object.freeze(ACTIVITY_HUB_SECTION_ORDER.filter((sec) => present.has(sec)));
}

export function getActivitySubcategories(
  activities: readonly TravelActivity[],
  section?: ActivityHubSection | "explore"
): readonly ActivitySubcategory[] {
  const allowedDefs = section && section !== "explore" ? getSubcategoriesForSection(section) : ACTIVITY_SUBCATEGORY_DEFINITIONS;
  const present = new Set(
    activities
      .filter((a) => a.isActive && (!section || section === "explore" || a.hubSection === section))
      .map((a) => a.subcategory)
  );
  return Object.freeze(allowedDefs.map((d) => d.id).filter((sub) => present.has(sub)));
}

export function getActivityCities(activities: readonly TravelActivity[]): readonly string[] {
  const seen = new Map<string, string>();
  for (const item of activities) {
    if (!item.isActive) continue;
    const key = normalizeVietnamese(item.destinationCity);
    if (!seen.has(key)) {
      seen.set(key, item.destinationCity);
    }
  }
  return Object.freeze([...seen.values()]);
}

export function parseActivitiesQueryFromSearchParams(
  params: URLSearchParams | Record<string, string | string[] | undefined>
): ActivitiesQueryParams {
  const read = (key: string): string | undefined => {
    if (params instanceof URLSearchParams) {
      const val = params.get(key)?.trim();
      return val || undefined;
    }
    const raw = params[key];
    const single = Array.isArray(raw) ? raw[0] : raw;
    const trimmed = single?.trim();
    return trimmed || undefined;
  };

  const rawSection = read("section");
  const sectionParsed =
    rawSection === "explore"
      ? "explore"
      : ActivityHubSectionSchema.safeParse(rawSection).success
        ? (rawSection as ActivityHubSection)
        : undefined;

  const rawSub = read("sub") ?? read("subcategory");
  const subParsed =
    rawSub === "all"
      ? "all"
      : ActivitySubcategorySchema.safeParse(rawSub).success
        ? (rawSub as ActivitySubcategory)
        : undefined;

  // Keep section coherent when subcategory is explicitly supplied without a matching section
  const resolvedSection: ActivityHubSection | "explore" | undefined =
    subParsed && subParsed !== "all"
      ? sectionParsed && sectionParsed !== "explore"
        ? sectionParsed
        : resolveHubSectionForSubcategory(subParsed)
      : sectionParsed;

  const rawPeriod = read("period");
  const periodParsed =
    rawPeriod === "all"
      ? "all"
      : ActivityTimeSlotPeriodSchema.safeParse(rawPeriod).success
        ? (rawPeriod as ActivitiesQueryParams["period"])
        : undefined;

  const rawSort = read("sort") ?? read("sortBy");
  const sortParsed = ActivitySortOptionSchema.safeParse(rawSort).success
    ? (rawSort as ActivitiesQueryParams["sortBy"])
    : undefined;

  const city = read("city");
  const search = read("q") ?? read("search");

  return {
    ...(resolvedSection ? { section: resolvedSection } : {}),
    ...(subParsed ? { subcategory: subParsed } : {}),
    ...(city ? { city } : {}),
    ...(search ? { search } : {}),
    ...(periodParsed ? { period: periodParsed } : {}),
    ...(sortParsed ? { sortBy: sortParsed } : {}),
  };
}

export function serializeActivitiesQueryToSearchParams(
  query: ActivitiesQueryParams
): URLSearchParams {
  const params = new URLSearchParams();
  if (query.section && query.section !== "explore") {
    params.set("section", query.section);
  }
  if (query.subcategory && query.subcategory !== "all") {
    params.set("sub", query.subcategory);
  }
  if (query.city?.trim()) {
    params.set("city", query.city.trim());
  }
  if (query.period && query.period !== "all") {
    params.set("period", query.period);
  }
  if (query.search?.trim()) {
    params.set("q", query.search.trim());
  }
  if (query.sortBy && query.sortBy !== "popular") {
    params.set("sort", query.sortBy);
  }
  return params;
}

export function filterActivities(
  activities: readonly TravelActivity[],
  query: ActivitiesQueryParams = {}
): readonly TravelActivity[] {
  const cityNorm = query.city?.trim() ? normalizeVietnamese(query.city.trim()) : "";
  const searchNorm = query.search?.trim() ? normalizeVietnamese(query.search.trim()) : "";
  const category = query.category && query.category !== "all" ? query.category : undefined;
  const section = query.section && query.section !== "explore" ? query.section : undefined;
  const subcategory =
    query.subcategory && query.subcategory !== "all" ? query.subcategory : undefined;
  const period = query.period && query.period !== "all" ? query.period : undefined;
  const maxPrice =
    query.maxPrice !== undefined && Number.isFinite(query.maxPrice) ? query.maxPrice : undefined;

  const filtered = activities.filter((item) => {
    if (!item.isActive) return false;
    if (category && item.category !== category) return false;
    if (section && item.hubSection !== section) return false;
    if (subcategory && item.subcategory !== subcategory) return false;
    if (maxPrice !== undefined && item.pricePerUnit > maxPrice) return false;
    if (period && !item.slots.some((slot) => slot.period === period)) return false;

    if (cityNorm) {
      const cityHaystack = normalizeVietnamese(
        [
          item.destinationCity,
          item.province,
          item.transferDetails?.routeFrom ?? "",
          item.transferDetails?.routeTo ?? "",
        ].join(" ")
      );
      if (!cityHaystack.includes(cityNorm)) return false;
    }

    if (searchNorm) {
      const haystack = normalizeVietnamese(
        [
          item.title,
          item.subtitle,
          item.destinationCity,
          item.province,
          item.meetingPoint,
          item.transferDetails?.routeFrom ?? "",
          item.transferDetails?.routeTo ?? "",
          item.attractionDetails?.venueAddress ?? "",
          item.essentialDetails?.deliveryMethod ?? "",
          ...item.highlights,
        ].join(" ")
      );
      if (!haystack.includes(searchNorm)) return false;
    }

    return true;
  });

  const sortBy = query.sortBy ?? "popular";
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "price-asc") {
      return a.pricePerUnit - b.pricePerUnit || b.rating - a.rating;
    }
    if (sortBy === "price-desc") {
      return b.pricePerUnit - a.pricePerUnit || b.rating - a.rating;
    }
    if (sortBy === "rating") {
      return b.rating - a.rating || b.reviewCount - a.reviewCount;
    }
    const featDiff = Number(b.isFeatured) - Number(a.isFeatured);
    if (featDiff !== 0) return featDiff;
    return b.reviewCount - a.reviewCount || b.rating - a.rating;
  });

  return Object.freeze(sorted);
}

export function findRecommendedActivitiesForCity(
  activities: readonly TravelActivity[],
  city: string,
  limit = 3
): readonly TravelActivity[] {
  const cityNorm = normalizeVietnamese(city.trim());
  if (!cityNorm) return Object.freeze([]);
  const safeLimit = Math.max(1, limit);

  const matched = activities.filter((item) => {
    if (!item.isActive) return false;
    const exactCity = normalizeVietnamese(item.destinationCity) === cityNorm;
    const transferRouteMatch = Boolean(
      item.transferDetails &&
        normalizeVietnamese(
          `${item.transferDetails.routeFrom} ${item.transferDetails.routeTo}`
        ).includes(cityNorm)
    );
    return exactCity || transferRouteMatch;
  });

  const byScore = (a: TravelActivity, b: TravelActivity) =>
    Number(b.isFeatured) - Number(a.isFeatured) ||
    b.rating - a.rating ||
    b.reviewCount - a.reviewCount;

  const transfers = matched.filter((a) => a.category === "transfer").sort(byScore);
  const experiences = matched.filter((a) => a.category !== "transfer").sort((a, b) => {
    const aPriority = a.hubSection === "attractions" || a.hubSection === "tours" ? 1 : 0;
    const bPriority = b.hubSection === "attractions" || b.hubSection === "tours" ? 1 : 0;
    if (aPriority !== bPriority) return bPriority - aPriority;
    return byScore(a, b);
  });

  // Smart bundle mix: 1 Airport Transfer + up to (limit - 1) top Attractions/Tours in the same city
  const picked: TravelActivity[] = [];
  if (transfers.length > 0) {
    picked.push(transfers[0]);
  }
  for (const exp of experiences) {
    if (picked.length >= safeLimit) break;
    picked.push(exp);
  }
  // Backfill from remaining transfers if the city had fewer non-transfer options
  for (let i = 1; i < transfers.length && picked.length < safeLimit; i += 1) {
    picked.push(transfers[i]);
  }

  return Object.freeze(picked);
}

export interface ActivitySlotAvailabilityResult {
  available: boolean;
  slot?: ActivitySlot;
  remainingCapacity: number;
  errorCode?: ErrorCode;
  errorMessage?: string;
}

export function evaluateActivitySlotAvailability(
  activity: TravelActivity,
  slotId: string,
  dateIso: string,
  quantity: number,
  alreadyBookedQuantity = 0
): ActivitySlotAvailabilityResult {
  if (!isValidIsoDateString(dateIso)) {
    return {
      available: false,
      remainingCapacity: 0,
      errorCode: "VALIDATION_ERROR",
      errorMessage: "Ngày khởi hành dịch vụ không hợp lệ.",
    };
  }

  const slot = activity.slots.find((s) => s.id === slotId.trim());
  if (!slot) {
    return {
      available: false,
      remainingCapacity: 0,
      errorCode: "VALIDATION_ERROR",
      errorMessage: "Khung giờ dịch vụ không tồn tại cho hoạt động này.",
    };
  }

  const safeQty = Math.floor(quantity);
  if (!Number.isFinite(safeQty) || safeQty < 1) {
    return {
      available: false,
      slot,
      remainingCapacity: Math.max(0, slot.maxCapacity - Math.max(0, alreadyBookedQuantity)),
      errorCode: "VALIDATION_ERROR",
      errorMessage: "Số lượng đặt tối thiểu là 1.",
    };
  }

  const remaining = Math.max(0, slot.maxCapacity - Math.max(0, alreadyBookedQuantity));
  if (remaining < safeQty) {
    return {
      available: false,
      slot,
      remainingCapacity: remaining,
      errorCode: "CONFLICT",
      errorMessage:
        remaining === 0
          ? `Khung giờ "${slot.label}" ngày ${dateIso} đã hết chỗ. Vui lòng chọn khung giờ hoặc ngày khác.`
          : `Khung giờ "${slot.label}" ngày ${dateIso} chỉ còn ${remaining} suất trống.`,
    };
  }

  return {
    available: true,
    slot,
    remainingCapacity: remaining,
  };
}

export function filterActivityEligibleVouchers(
  vouchers: readonly PromotionVoucher[],
  now: Date = new Date()
): readonly PromotionVoucher[] {
  return Object.freeze(
    vouchers.filter((v) => {
      if (v.isActive === false) return false;
      const exp = Date.parse(v.expiresAt);
      if (Number.isFinite(exp) && now.getTime() > exp) return false;
      const hasStayOnlyTypes = Boolean(v.applicablePropertyTypes && v.applicablePropertyTypes.length > 0);
      const hasStayOnlyCats = Boolean(v.applicableCategories && v.applicableCategories.length > 0);
      return !hasStayOnlyTypes && !hasStayOnlyCats;
    })
  );
}

export interface ActivityPricingEvaluation {
  unitPrice: number;
  subtotal: number;
  discount: number;
  appliedPromoCode?: string;
  promoError?: string;
  total: number;
}

export function calculateActivityPricing(
  activity: TravelActivity,
  slot: ActivitySlot,
  quantity: number,
  promo?: {
    promoCode?: string;
    vouchers?: readonly PromotionVoucher[];
    now?: Date;
    isAuthenticated?: boolean;
    hasPriorSuccessfulBookings?: boolean;
  }
): ActivityPricingEvaluation {
  const unitPrice = Math.max(0, activity.pricePerUnit + (slot.priceModifier ?? 0));
  const safeQuantity = Math.max(1, Math.floor(quantity));
  const subtotal = unitPrice * safeQuantity;

  let discount = 0;
  let appliedPromoCode: string | undefined;
  let promoError: string | undefined;

  const normalizedPromo = normalizeVoucherCode(promo?.promoCode);
  if (normalizedPromo) {
    const allVouchers = promo?.vouchers ?? [];
    const matchedVoucher = allVouchers.find((v) => v.code.toUpperCase() === normalizedPromo);
    const isStayRestricted = Boolean(
      matchedVoucher &&
        ((matchedVoucher.applicablePropertyTypes && matchedVoucher.applicablePropertyTypes.length > 0) ||
          (matchedVoucher.applicableCategories && matchedVoucher.applicableCategories.length > 0))
    );

    if (isStayRestricted) {
      promoError = `Mã "${normalizedPromo}" chỉ áp dụng cho đặt chỗ lưu trú hoặc gói combo kèm lưu trú.`;
    } else {
      const evaluation = evaluatePromotionVoucher(normalizedPromo, subtotal, allVouchers, {
        now: promo?.now,
        isAuthenticated: promo?.isAuthenticated,
        hasPriorSuccessfulBookings: promo?.hasPriorSuccessfulBookings,
      });
      if (evaluation.ok) {
        discount = evaluation.discount;
        appliedPromoCode = evaluation.code;
      } else {
        promoError = evaluation.message;
      }
    }
  }

  const total = Math.max(0, subtotal - discount);
  return {
    unitPrice,
    subtotal,
    discount,
    ...(appliedPromoCode ? { appliedPromoCode } : {}),
    ...(promoError ? { promoError } : {}),
    total,
  };
}

export type StandaloneActivityBookingResult =
  | { ok: true; booking: ActivityBooking }
  | { ok: false; status: 400 | 404 | 409 | 422; code: ErrorCode; message: string };

export function processStandaloneActivityBooking(
  rawIntent: ServiceBookingIntent,
  activities: readonly TravelActivity[],
  options: {
    bookingId: string;
    createdAt?: string;
    now?: Date;
    bookedQuantityForSlot?: number;
    vouchers?: readonly PromotionVoucher[];
    userId?: string;
    isAuthenticated?: boolean;
    hasPriorSuccessfulBookings?: boolean;
  }
): StandaloneActivityBookingResult {
  const parsed = ServiceBookingIntentSchema.safeParse(rawIntent);
  if (!parsed.success) {
    return {
      ok: false,
      status: 400,
      code: "VALIDATION_ERROR",
      message: parsed.error.issues[0]?.message ?? "Dữ liệu đặt dịch vụ không hợp lệ.",
    };
  }

  const intent = parsed.data;
  const activity = activities.find((a) => a.id === intent.activityId && a.isActive);
  if (!activity) {
    return {
      ok: false,
      status: 404,
      code: "NOT_FOUND",
      message: "Không tìm thấy hoạt động hoặc dịch vụ đưa đón được yêu cầu.",
    };
  }

  const slotEval = evaluateActivitySlotAvailability(
    activity,
    intent.slotId,
    intent.dateIso,
    intent.quantity,
    options.bookedQuantityForSlot ?? 0
  );
  if (!slotEval.available || !slotEval.slot) {
    const status = slotEval.errorCode === "CONFLICT" ? 409 : 400;
    return {
      ok: false,
      status,
      code: slotEval.errorCode ?? "VALIDATION_ERROR",
      message: slotEval.errorMessage ?? "Khung giờ không khả dụng.",
    };
  }

  const evalNow = options.now ?? new Date();
  const pricing = calculateActivityPricing(activity, slotEval.slot, intent.quantity, {
    promoCode: intent.promoCode,
    vouchers: options.vouchers,
    now: evalNow,
    isAuthenticated: options.isAuthenticated ?? Boolean(options.userId),
    hasPriorSuccessfulBookings: options.hasPriorSuccessfulBookings,
  });

  if (intent.promoCode && pricing.promoError) {
    return {
      ok: false,
      status: 422,
      code: "UNPROCESSABLE_ENTITY",
      message: pricing.promoError,
    };
  }

  const booking: ActivityBooking = Object.freeze({
    bookingId: options.bookingId.trim().toUpperCase(),
    activityId: activity.id,
    activitySlug: activity.slug,
    activityTitle: activity.title,
    activityCategory: activity.category,
    activityImage: activity.images[0],
    destinationCity: activity.destinationCity,
    slotId: slotEval.slot.id,
    slotLabel: slotEval.slot.label,
    dateIso: intent.dateIso,
    quantity: intent.quantity,
    unitLabel: activity.unitLabel,
    unitPrice: pricing.unitPrice,
    subtotal: pricing.subtotal,
    discount: pricing.discount,
    ...(pricing.appliedPromoCode ? { appliedPromoCode: pricing.appliedPromoCode } : {}),
    total: pricing.total,
    guestInfo: Object.freeze({
      fullName: intent.guestInfo.fullName,
      email: intent.guestInfo.email,
      phone: intent.guestInfo.phone,
      ...(intent.guestInfo.note ? { note: intent.guestInfo.note } : {}),
    }),
    paymentMethod: intent.paymentMethod,
    ...(options.userId ? { userId: options.userId } : {}),
    ...(intent.linkedReservationId ? { linkedReservationId: intent.linkedReservationId } : {}),
    freeCancellation: activity.freeCancellation,
    status: "confirmed",
    createdAt: options.createdAt ?? evalNow.toISOString(),
  });

  return { ok: true, booking };
}

export type ActivityCancellationResult =
  | { ok: true; booking: ActivityBooking }
  | { ok: false; status: 403 | 409 | 422; code: ErrorCode; message: string };

export function evaluateActivityBookingCancellation(
  booking: ActivityBooking,
  input: {
    authUser?: AuthUser | null;
    contact?: string;
    reason?: string;
    cancelledAt?: string;
  }
): ActivityCancellationResult {
  if (!canAccessActivityBooking(booking, { authUser: input.authUser, contact: input.contact })) {
    return {
      ok: false,
      status: 403,
      code: "FORBIDDEN",
      message: "Email hoặc số điện thoại không khớp với chủ đơn đặt dịch vụ này.",
    };
  }

  if (booking.status === "cancelled") {
    return {
      ok: false,
      status: 409,
      code: "CONFLICT",
      message: "Đơn đặt dịch vụ này đã được hủy trước đó.",
    };
  }

  if (!booking.freeCancellation) {
    return {
      ok: false,
      status: 422,
      code: "UNPROCESSABLE_ENTITY",
      message: "Dịch vụ này không hỗ trợ hủy miễn phí trực tuyến.",
    };
  }

  const trimmedReason = input.reason?.trim() || undefined;
  return {
    ok: true,
    booking: Object.freeze({
      ...booking,
      status: "cancelled",
      cancelledAt: input.cancelledAt ?? new Date().toISOString(),
      ...(trimmedReason ? { cancellationReason: trimmedReason } : {}),
    }),
  };
}

export type BundleActivityResolutionResult =
  | { ok: true; items: readonly BookedBundleActivity[]; activitiesFee: number }
  | { ok: false; status: 400 | 404 | 409; code: ErrorCode; message: string };

export function resolveSelectedBundleActivities(
  inputs: readonly SelectedBundleActivityInput[] | undefined,
  activities: readonly TravelActivity[] | undefined,
  options?: {
    bookedCountByKey?: ReadonlyMap<string, number>;
    itemIdPrefix?: string;
  }
): BundleActivityResolutionResult {
  if (!inputs || inputs.length === 0) {
    return { ok: true, items: Object.freeze([]), activitiesFee: 0 };
  }

  const catalog = activities ?? [];
  const items: BookedBundleActivity[] = [];
  let activitiesFee = 0;
  const localAccumulated = new Map<string, number>();

  for (let i = 0; i < inputs.length; i += 1) {
    const input = inputs[i];
    const activity = catalog.find((a) => a.id === input.activityId && a.isActive);
    if (!activity) {
      return {
        ok: false,
        status: 404,
        code: "NOT_FOUND",
        message: `Không tìm thấy dịch vụ đi kèm (${input.activityId}).`,
      };
    }

    const slotKey = `${activity.id}::${input.slotId}::${input.dateIso}`;
    const existingCount =
      (options?.bookedCountByKey?.get(slotKey) ?? 0) + (localAccumulated.get(slotKey) ?? 0);

    const slotEval = evaluateActivitySlotAvailability(
      activity,
      input.slotId,
      input.dateIso,
      input.quantity,
      existingCount
    );
    if (!slotEval.available || !slotEval.slot) {
      return {
        ok: false,
        status: slotEval.errorCode === "CONFLICT" ? 409 : 400,
        code: slotEval.errorCode ?? "VALIDATION_ERROR",
        message: slotEval.errorMessage ?? "Suất dịch vụ đi kèm không khả dụng.",
      };
    }

    localAccumulated.set(slotKey, (localAccumulated.get(slotKey) ?? 0) + input.quantity);
    const unitPrice = Math.max(0, activity.pricePerUnit + (slotEval.slot.priceModifier ?? 0));
    const totalPrice = unitPrice * input.quantity;
    activitiesFee += totalPrice;

    const prefix = options?.itemIdPrefix ?? "actitem";
    items.push(
      Object.freeze({
        id: `${prefix}-${i + 1}`,
        activityId: activity.id,
        activitySlug: activity.slug,
        activityTitle: activity.title,
        activityCategory: activity.category,
        slotId: slotEval.slot.id,
        slotLabel: slotEval.slot.label,
        dateIso: input.dateIso,
        quantity: input.quantity,
        unitLabel: activity.unitLabel,
        unitPrice,
        totalPrice,
        status: "confirmed",
      })
    );
  }

  return {
    ok: true,
    items: Object.freeze(items),
    activitiesFee,
  };
}

export type BundleActivityItemCancellationResult =
  | { ok: true; booking: BookingDetails; cancelledItem: BookedBundleActivity }
  | { ok: false; status: 403 | 404 | 409 | 422; code: ErrorCode; message: string };

export function evaluateReservationActivityItemCancellation(
  booking: BookingDetails,
  itemId: string,
  options: {
    authUser?: AuthUser | null;
    contact?: string;
    reason?: string;
    cancelledAt?: string;
    vouchers?: readonly PromotionVoucher[];
    now?: Date;
  }
): BundleActivityItemCancellationResult {
  const actor = options.authUser ?? null;
  if (!canAccessActivityBooking(booking, { authUser: actor, contact: options.contact })) {
    return {
      ok: false,
      status: 403,
      code: "FORBIDDEN",
      message: "Bạn không có quyền chỉnh sửa dịch vụ đi kèm trên đơn đặt phòng này.",
    };
  }

  if (booking.status === "cancelled" || booking.status === "completed") {
    return {
      ok: false,
      status: 409,
      code: "CONFLICT",
      message: "Không thể hủy dịch vụ đi kèm trên đơn đặt phòng đã hủy hoặc đã hoàn tất.",
    };
  }

  const normalizedId = itemId.trim();
  const currentItems = booking.selectedActivities ?? [];
  const targetIndex = currentItems.findIndex((item) => item.id === normalizedId);
  if (targetIndex === -1) {
    return {
      ok: false,
      status: 404,
      code: "NOT_FOUND",
      message: "Không tìm thấy dịch vụ đi kèm trong đơn đặt phòng này.",
    };
  }

  const targetItem = currentItems[targetIndex];
  if (targetItem.status === "cancelled") {
    return {
      ok: false,
      status: 409,
      code: "CONFLICT",
      message: "Dịch vụ đi kèm này đã được hủy trước đó.",
    };
  }

  const cancelledAt = options.cancelledAt ?? new Date().toISOString();
  const trimmedReason = options.reason?.trim() || undefined;
  const cancelledItem: BookedBundleActivity = Object.freeze({
    ...targetItem,
    status: "cancelled",
    cancelledAt,
    ...(trimmedReason ? { cancellationReason: trimmedReason } : {}),
  });

  const nextItems = Object.freeze(
    currentItems.map((item, idx) => (idx === targetIndex ? cancelledItem : item))
  );

  const nextActivitiesFee = nextItems.reduce(
    (sum, item) => sum + (item.status === "confirmed" ? item.totalPrice : 0),
    0
  );
  const nextSubtotal =
    booking.pricing.nightsTotal +
    booking.pricing.cleaningFee +
    booking.pricing.amenitiesFee +
    nextActivitiesFee;

  let nextDiscount = booking.pricing.discount;
  let nextAppliedPromoCode = booking.pricing.appliedPromoCode;

  if (booking.pricing.appliedPromoCode && options.vouchers && options.vouchers.length > 0) {
    const evalPromo = evaluatePromotionVoucher(
      booking.pricing.appliedPromoCode,
      nextSubtotal,
      options.vouchers,
      {
        now: options.now,
        isAuthenticated: Boolean(booking.userId || actor),
        property: booking.property,
      }
    );
    if (evalPromo.ok) {
      nextDiscount = evalPromo.discount;
      nextAppliedPromoCode = evalPromo.code;
    } else {
      nextDiscount = 0;
      nextAppliedPromoCode = undefined;
    }
  } else {
    nextDiscount = Math.min(nextSubtotal, Math.max(0, nextDiscount));
  }

  const nextTotal = Math.max(0, nextSubtotal - nextDiscount);

  const updatedBooking: BookingDetails = Object.freeze({
    ...booking,
    selectedActivities: nextItems,
    pricing: Object.freeze({
      ...booking.pricing,
      activitiesFee: nextActivitiesFee,
      discount: nextDiscount,
      ...(nextAppliedPromoCode ? { appliedPromoCode: nextAppliedPromoCode } : { appliedPromoCode: undefined }),
      total: nextTotal,
    }),
  });

  return {
    ok: true,
    booking: updatedBooking,
    cancelledItem,
  };
}
