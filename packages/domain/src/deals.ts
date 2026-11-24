import type {
  BookingDetails,
  CategoryId,
  PromotionCampaign,
  PromotionVoucher,
  Property,
  PropertyType,
  VoucherAudience,
} from "@luxestay/contracts";
import { PROPERTY_TYPE_LABELS } from "./catalogQuery.js";
import { CATEGORIES } from "./seed/categories.js";
import { formatVND, normalizeVietnamese } from "./utils.js";
import { normalizeVoucherCode } from "./vouchers.js";

const CATEGORY_LABEL_MAP = new Map<CategoryId, string>(
  CATEGORIES.map((category) => [category.id, category.label])
);

function formatIsoDateUTC(isoDate: string): string {
  const parsedMs = Date.parse(isoDate);
  if (!Number.isFinite(parsedMs)) return isoDate;
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(parsedMs));
}

function isVoucherActiveAndUnexpired(
  voucher: PromotionVoucher,
  now: Date
): boolean {
  if (voucher.isActive === false) return false;
  const expiresAtMs = Date.parse(voucher.expiresAt);
  if (Number.isFinite(expiresAtMs) && now.getTime() > expiresAtMs) {
    return false;
  }
  return true;
}

/** Returns true iff campaign endsAt is a valid date strictly before `now`. */
export function isCampaignExpired(
  campaign: PromotionCampaign,
  now: Date = new Date()
): boolean {
  const endsAtMs = Date.parse(campaign.endsAt);
  return Number.isFinite(endsAtMs) && now.getTime() > endsAtMs;
}

/** Returns true when campaign is active, past startsAt (if valid), and not expired. */
export function isCampaignActive(
  campaign: PromotionCampaign,
  now: Date = new Date()
): boolean {
  if (campaign.isActive !== true) return false;
  const startsAtMs = Date.parse(campaign.startsAt);
  if (Number.isFinite(startsAtMs) && now.getTime() < startsAtMs) {
    return false;
  }
  return !isCampaignExpired(campaign, now);
}

/** Splits active campaigns into hero (first active hero or null), carousel, and allActive. */
export function partitionCampaigns(
  campaigns: readonly PromotionCampaign[],
  now: Date = new Date()
): {
  hero: PromotionCampaign | null;
  carousel: PromotionCampaign[];
  allActive: PromotionCampaign[];
} {
  const allActive = campaigns.filter((campaign) => isCampaignActive(campaign, now));
  const hero = allActive.find((campaign) => campaign.placement === "hero") ?? null;
  const carousel = allActive.filter((campaign) => campaign.placement === "carousel");
  return { hero, carousel, allActive };
}

/** Filters active, unexpired vouchers by target audience segment. */
export function filterVouchersByAudience(
  vouchers: readonly PromotionVoucher[],
  audience: VoucherAudience,
  now: Date = new Date()
): PromotionVoucher[] {
  const activeVouchers = vouchers.filter((voucher) =>
    isVoucherActiveAndUnexpired(voucher, now)
  );
  if (audience === "all") return activeVouchers;
  if (audience === "new-user") {
    return activeVouchers.filter(
      (voucher) => voucher.audience === "new-user" || voucher.newUserOnly === true
    );
  }
  return activeVouchers.filter(
    (voucher) => voucher.audience === "member" || voucher.memberOnly === true
  );
}

/** Maps a campaign's voucherCodes to matching vouchers in campaign order, deduplicated. */
export function resolveCampaignVouchers(
  campaign: PromotionCampaign,
  vouchers: readonly PromotionVoucher[]
): PromotionVoucher[] {
  const voucherByCode = new Map<string, PromotionVoucher>();
  for (const voucher of vouchers) {
    const normalized = normalizeVoucherCode(voucher.code);
    if (normalized && !voucherByCode.has(normalized)) {
      voucherByCode.set(normalized, voucher);
    }
  }

  const resolved: PromotionVoucher[] = [];
  const seen = new Set<string>();
  for (const rawCode of campaign.voucherCodes) {
    const normalized = normalizeVoucherCode(rawCode);
    if (!normalized || seen.has(normalized)) continue;
    const match = voucherByCode.get(normalized);
    if (match) {
      seen.add(normalized);
      resolved.push(match);
    }
  }
  return resolved;
}

/** Checks whether a voucher's propertyType and category restrictions allow the given property. */
export function isVoucherEligibleForProperty(
  voucher: PromotionVoucher,
  property: Pick<Property, "propertyType" | "category">
): boolean {
  const allowedTypes = voucher.applicablePropertyTypes;
  if (allowedTypes && allowedTypes.length > 0 && !allowedTypes.includes(property.propertyType)) {
    return false;
  }
  const allowedCategories = voucher.applicableCategories;
  if (
    allowedCategories &&
    allowedCategories.length > 0 &&
    !allowedCategories.includes(property.category)
  ) {
    return false;
  }
  return true;
}

/** Returns preferredVoucher if eligible for property, else first eligible campaign voucher, else preferredVoucher. */
export function resolveEligibleVoucherForProperty(
  preferredVoucher: PromotionVoucher | null,
  campaignVouchers: readonly PromotionVoucher[],
  property: Pick<Property, "propertyType" | "category">
): PromotionVoucher | null {
  if (preferredVoucher && isVoucherEligibleForProperty(preferredVoucher, property)) {
    return preferredVoucher;
  }
  const fallback = campaignVouchers.find((voucher) =>
    isVoucherEligibleForProperty(voucher, property)
  );
  return fallback ?? preferredVoucher;
}

/** Matches catalog properties against all specified campaign targetFilter criteria (AND-ed). */
export function matchPropertiesForCampaign(
  properties: readonly Property[],
  campaign: PromotionCampaign
): Property[] {
  const filter = campaign.targetFilter;
  const normalizedDestinations = (filter.destinations ?? [])
    .map((dest) => normalizeVietnamese(dest))
    .filter(Boolean);
  const categories = filter.categories ?? [];
  const propertyTypes = filter.propertyTypes ?? [];

  return properties.filter((property) => {
    if (filter.flashDealOnly === true && property.isFlashDeal !== true) {
      return false;
    }

    if (normalizedDestinations.length > 0) {
      const city = normalizeVietnamese(property.location.city);
      const province = normalizeVietnamese(property.location.province);
      const matchesDestination = normalizedDestinations.some(
        (dest) => city.includes(dest) || province.includes(dest)
      );
      if (!matchesDestination) return false;
    }

    if (categories.length > 0 && !categories.includes(property.category)) {
      return false;
    }

    if (propertyTypes.length > 0 && !propertyTypes.includes(property.propertyType)) {
      return false;
    }

    return true;
  });
}

/** Maps voucher propertyType/category restrictions to Vietnamese display labels. */
export function resolveVoucherScopeLabels(
  voucher: Pick<PromotionVoucher, "applicablePropertyTypes" | "applicableCategories">
): {
  propertyTypeLabels: string[];
  categoryLabels: string[];
} {
  const propertyTypeLabels = (voucher.applicablePropertyTypes ?? []).map(
    (type: PropertyType) => PROPERTY_TYPE_LABELS[type] ?? type
  );
  const categoryLabels = (voucher.applicableCategories ?? []).map(
    (categoryId: CategoryId) => CATEGORY_LABEL_MAP.get(categoryId) ?? categoryId
  );
  return { propertyTypeLabels, categoryLabels };
}

/** Returns explicit voucher terms or derives readable Vietnamese conditions from voucher metadata. */
export function buildVoucherTermsList(voucher: PromotionVoucher): string[] {
  if (voucher.terms && voucher.terms.length > 0) {
    return [...voucher.terms];
  }

  const terms: string[] = [];
  if (voucher.discountType === "percent") {
    const capText =
      voucher.maxDiscount !== undefined
        ? `, tối đa ${formatVND(voucher.maxDiscount)}`
        : "";
    terms.push(`Giảm ${voucher.discountValue}% tổng giá trị đơn đặt phòng${capText}.`);
  } else if (voucher.discountValue > 0) {
    terms.push(`Giảm trực tiếp ${formatVND(voucher.discountValue)} trên tổng đơn.`);
  }

  if ((voucher.minOrderTotal ?? 0) > 0) {
    terms.push(`Áp dụng cho đơn đặt phòng từ ${formatVND(voucher.minOrderTotal)} trở lên.`);
  } else {
    terms.push("Không yêu cầu giá trị đơn đặt phòng tối thiểu.");
  }

  const { propertyTypeLabels, categoryLabels } = resolveVoucherScopeLabels(voucher);
  if (propertyTypeLabels.length > 0) {
    terms.push(`Áp dụng cho loại hình chỗ nghỉ: ${propertyTypeLabels.join(", ")}.`);
  }
  if (categoryLabels.length > 0) {
    terms.push(`Áp dụng cho danh mục chỗ nghỉ: ${categoryLabels.join(", ")}.`);
  }

  if (voucher.newUserOnly) {
    terms.push("Chỉ áp dụng cho đơn đặt phòng đầu tiên trên LuxeStay.");
  }
  if (voucher.memberOnly) {
    terms.push("Chỉ áp dụng cho thành viên đã đăng nhập tài khoản LuxeStay.");
  }
  if (voucher.expiresAt) {
    terms.push(`Hạn sử dụng đến hết ngày ${formatIsoDateUTC(voucher.expiresAt)}.`);
  }

  return terms;
}

/** Returns true iff any reservation has status "confirmed" or "completed". */
export function hasPriorSuccessfulBookings(
  reservations: readonly Pick<BookingDetails, "status">[]
): boolean {
  return reservations.some(
    (reservation) =>
      reservation.status === "confirmed" || reservation.status === "completed"
  );
}
