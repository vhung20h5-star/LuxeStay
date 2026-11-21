import { AMENITY_CATALOG, AMENITY_CATEGORIES } from "@/data/amenities";
import type {
  AmenityCategoryId,
  AmenityCategoryMeta,
  AmenityFilterKey,
  Property,
  ResolvedPropertyAmenity,
  SelectedBookingAmenity,
} from "@/types";

export type AmenityFeeFilter = "all" | "free" | "paid" | "selected";

export const CLEANING_FEE = 150000;
export const SERVICE_DISCOUNT = 100000;

export function normalizeVietnamese(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .trim();
}

export function resolvePropertyAmenities(
  property: Pick<Property, "resortAmenities">
): ResolvedPropertyAmenity[] {
  const overrides = property.resortAmenities ?? [];
  const resolved: ResolvedPropertyAmenity[] = [];

  for (const override of overrides) {
    const base = AMENITY_CATALOG[override.amenityId];
    if (!base) continue;

    const pricingType = override.pricingType ?? base.pricingType;
    const isPaid = pricingType === "paid";

    resolved.push({
      ...base,
      name: override.name ?? base.name,
      shortLabel: override.shortLabel ?? base.shortLabel,
      description: override.description ?? base.description,
      image: override.image ?? base.image,
      hours: override.hours ?? base.hours,
      location: override.location ?? base.location,
      notes: override.notes ?? base.notes,
      pricingType,
      price: isPaid ? (override.price ?? base.price) : undefined,
      priceUnit: isPaid ? (override.priceUnit ?? base.priceUnit) : undefined,
      featured: Boolean(override.featured),
    });
  }

  return resolved;
}

export function groupAmenitiesByCategory(
  amenities: ResolvedPropertyAmenity[]
): Array<{ category: AmenityCategoryMeta; items: ResolvedPropertyAmenity[] }> {
  return AMENITY_CATEGORIES.map((category) => ({
    category,
    items: amenities.filter((item) => item.category === category.id),
  })).filter((group) => group.items.length > 0);
}

export function getPropertyAmenityCategories(
  amenities: ResolvedPropertyAmenity[]
): Array<{ category: AmenityCategoryMeta; count: number }> {
  return groupAmenitiesByCategory(amenities).map(({ category, items }) => ({
    category,
    count: items.length,
  }));
}

export function getCardHighlightCategories(
  amenities: ResolvedPropertyAmenity[],
  limit = 3
): AmenityCategoryMeta[] {
  return groupAmenitiesByCategory(amenities)
    .slice(0, limit)
    .map((group) => group.category);
}

export function getFeaturedAmenities(
  amenities: ResolvedPropertyAmenity[],
  limit = 6
): ResolvedPropertyAmenity[] {
  const featured = amenities.filter((a) => a.featured);
  const rest = amenities.filter((a) => !a.featured);
  return [...featured, ...rest].slice(0, limit);
}

export function filterPropertyAmenities(
  amenities: ResolvedPropertyAmenity[],
  options: {
    query?: string;
    category?: AmenityCategoryId | "all";
    feeFilter?: AmenityFeeFilter;
    selectedIds?: string[];
  } = {}
): ResolvedPropertyAmenity[] {
  const { query = "", category = "all", feeFilter = "all", selectedIds = [] } = options;
  const normalizedQuery = normalizeVietnamese(query);
  const selectedSet = new Set(selectedIds);

  return amenities.filter((item) => {
    if (category !== "all" && item.category !== category) {
      return false;
    }

    if (feeFilter === "free" && item.pricingType === "paid") {
      return false;
    }
    if (feeFilter === "paid" && item.pricingType !== "paid") {
      return false;
    }
    if (feeFilter === "selected" && !selectedSet.has(item.id)) {
      return false;
    }

    if (normalizedQuery.length > 0) {
      const haystack = normalizeVietnamese(
        `${item.name} ${item.shortLabel} ${item.description} ${item.location} ${item.notes ?? ""}`
      );
      if (!haystack.includes(normalizedQuery)) {
        return false;
      }
    }

    return true;
  });
}

export function propertyHasAmenityFilters(
  property: Pick<Property, "resortAmenities">,
  requiredFilters: AmenityFilterKey[]
): boolean {
  if (requiredFilters.length === 0) return true;

  const resolved = resolvePropertyAmenities(property);
  const availableKeys = new Set<AmenityFilterKey>();
  for (const item of resolved) {
    for (const key of item.filterKeys) {
      availableKeys.add(key);
    }
  }

  return requiredFilters.every((key) => availableKeys.has(key));
}

export function buildSelectedBookingAmenities(
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

export function calculateBookingPricing(
  pricePerNight: number,
  nights: number,
  selectedAmenities: SelectedBookingAmenity[] = []
): {
  basePrice: number;
  nightsTotal: number;
  cleaningFee: number;
  serviceFee: number;
  amenitiesFee: number;
  discount: number;
  total: number;
} {
  const safeNights = Math.max(1, Math.floor(nights));
  const nightsTotal = pricePerNight * safeNights;
  const amenitiesFee = selectedAmenities.reduce(
    (sum, item) => sum + (item.pricingType === "paid" ? item.price : 0),
    0
  );
  const total = Math.max(0, nightsTotal + CLEANING_FEE + amenitiesFee - SERVICE_DISCOUNT);

  return {
    basePrice: pricePerNight,
    nightsTotal,
    cleaningFee: CLEANING_FEE,
    serviceFee: 0,
    amenitiesFee,
    discount: SERVICE_DISCOUNT,
    total,
  };
}

export interface AmenitiesModalFilterState {
  activeCategory: AmenityCategoryId | "all";
  searchQuery: string;
  feeFilter: AmenityFeeFilter;
  activeAmenityId: string | null;
  mobileShowDetail: boolean;
}

export type AmenitiesModalAction =
  | { type: "SET_CATEGORY"; category: AmenityCategoryId | "all" }
  | { type: "SET_SEARCH"; query: string }
  | { type: "SET_FEE_FILTER"; feeFilter: AmenityFeeFilter }
  | { type: "SELECT_AMENITY"; amenityId: string }
  | { type: "BACK_TO_LIST" }
  | { type: "RESET_FILTERS" };

export function createAmenitiesModalState(init: {
  initialAmenityId?: string | null;
  initialCategory?: AmenityCategoryId | "all";
  fallbackAmenityId?: string | null;
}): AmenitiesModalFilterState {
  return {
    activeCategory: init.initialCategory ?? "all",
    searchQuery: "",
    feeFilter: "all",
    activeAmenityId: init.initialAmenityId ?? init.fallbackAmenityId ?? null,
    mobileShowDetail: Boolean(init.initialAmenityId),
  };
}

export function reduceAmenitiesModalState(
  state: AmenitiesModalFilterState,
  action: AmenitiesModalAction
): AmenitiesModalFilterState {
  switch (action.type) {
    case "SET_CATEGORY":
      return { ...state, activeCategory: action.category, mobileShowDetail: false };
    case "SET_SEARCH":
      return { ...state, searchQuery: action.query, mobileShowDetail: false };
    case "SET_FEE_FILTER":
      return { ...state, feeFilter: action.feeFilter, mobileShowDetail: false };
    case "SELECT_AMENITY":
      return { ...state, activeAmenityId: action.amenityId, mobileShowDetail: true };
    case "BACK_TO_LIST":
      return { ...state, mobileShowDetail: false };
    case "RESET_FILTERS":
      return {
        ...state,
        activeCategory: "all",
        searchQuery: "",
        feeFilter: "all",
        mobileShowDetail: false,
      };
  }
}
