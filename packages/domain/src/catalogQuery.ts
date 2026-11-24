import type {
  ActiveFilterChip,
  AmenityFilterKey,
  AmenityFilterOption,
  CatalogQueryResult,
  Category,
  CategoryId,
  Destination,
  PriceRangePreset,
  Property,
  PropertyType,
  QuickSearchTrend,
  SortOption,
  StayCatalogQueryState,
} from "@luxestay/contracts";
import { propertyHasAmenityFilters } from "./amenities.js";
import { AMENITY_FILTER_OPTIONS } from "./seed/amenities.js";
import { CATEGORIES } from "./seed/categories.js";
import { formatVND, normalizeVietnamese } from "./utils.js";

export const DEFAULT_MIN_PRICE = 0;
export const DEFAULT_MAX_PRICE = 10000000;
export const PRICE_SLIDER_MIN = 500000;
export const PRICE_SLIDER_STEP = 250000;

export interface QuickDatePreset {
  id: string;
  label: string;
  displayRange: string;
  checkIn: string;  // YYYY-MM-DD
  checkOut: string; // YYYY-MM-DD
}

export interface CatalogQueryOptions {
  categories?: readonly Category[];
  amenityFilterOptions?: readonly AmenityFilterOption[];
}

function addLocalDays(base: Date, days: number): Date {
  return new Date(base.getFullYear(), base.getMonth(), base.getDate() + days);
}

function toISODateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toShortDayMonth(date: Date): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}`;
}

export function getQuickDatePresets(baseDate: Date = new Date()): QuickDatePreset[] {
  const anchor = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());
  const dayOfWeek = anchor.getDay(); // 0 = Sun .. 6 = Sat
  const daysUntilSaturday = (6 - dayOfWeek + 7) % 7 || 7;

  const weekendIn = addLocalDays(anchor, daysUntilSaturday);
  const weekendOut = addLocalDays(weekendIn, 1);

  const nextFriday = addLocalDays(weekendIn, 6);
  const nextSunday = addLocalDays(nextFriday, 2);

  const midweekIn = addLocalDays(weekendIn, 4);
  const midweekOut = addLocalDays(midweekIn, 2);

  const yearEndYear =
    anchor.getMonth() === 11 && anchor.getDate() > 25
      ? anchor.getFullYear() + 1
      : anchor.getFullYear();
  const yearEndIn = new Date(yearEndYear, 11, 25);
  const yearEndOut = new Date(yearEndYear, 11, 28);

  return [
    {
      id: "weekend",
      label: "Cuối tuần này (T7 - CN)",
      displayRange: `${toShortDayMonth(weekendIn)} → ${toShortDayMonth(weekendOut)}`,
      checkIn: toISODateString(weekendIn),
      checkOut: toISODateString(weekendOut),
    },
    {
      id: "3d2n",
      label: "3 ngày 2 đêm (T6 - CN)",
      displayRange: `${toShortDayMonth(nextFriday)} → ${toShortDayMonth(nextSunday)}`,
      checkIn: toISODateString(nextFriday),
      checkOut: toISODateString(nextSunday),
    },
    {
      id: "midweek",
      label: "Giữa tuần thư giãn",
      displayRange: `${toShortDayMonth(midweekIn)} → ${toShortDayMonth(midweekOut)}`,
      checkIn: toISODateString(midweekIn),
      checkOut: toISODateString(midweekOut),
    },
    {
      id: "yearend",
      label: "Kỳ nghỉ cuối năm",
      displayRange: `${toShortDayMonth(yearEndIn)} → ${toShortDayMonth(yearEndOut)}`,
      checkIn: toISODateString(yearEndIn),
      checkOut: toISODateString(yearEndOut),
    },
  ];
}

export const QUICK_DATE_PRESETS: QuickDatePreset[] = getQuickDatePresets(new Date(2026, 10, 12));

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function formatDateLabel(dateStr: string): string {
  const trimmed = dateStr.trim();
  if (!trimmed) return "";
  if (ISO_DATE_RE.test(trimmed)) {
    const [year, month, day] = trimmed.split("-");
    return `${day}/${month}/${year}`;
  }
  return trimmed;
}

export function formatSearchDateRange(checkIn: string, checkOut: string): string {
  const inLabel = formatDateLabel(checkIn);
  const outLabel = formatDateLabel(checkOut);
  if (inLabel && outLabel) return `${inLabel} - ${outLabel}`;
  if (inLabel) return `Từ ${inLabel}`;
  if (outLabel) return `Đến ${outLabel}`;
  return "";
}

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  homestay: "Homestay",
  hotel: "Khách sạn",
  villa: "Villa biệt thự",
  resort: "Resort 5 Sao",
  glamping: "Glamping",
};

export const PROPERTY_TYPE_OPTIONS: ReadonlyArray<{
  id: PropertyType;
  label: string;
  desc: string;
}> = Object.freeze([
  { id: "homestay", label: "Homestay", desc: "Ấm cúng, gần gũi và mộc mạc" },
  { id: "hotel", label: "Khách sạn", desc: "Tiện nghi, dịch vụ lễ tân 24/7" },
  { id: "villa", label: "Villa biệt thự", desc: "Sang trọng, hồ bơi riêng biệt" },
  { id: "resort", label: "Resort 5 Sao", desc: "Nghỉ dưỡng thượng lưu ven biển/núi" },
  { id: "glamping", label: "Glamping", desc: "Cắm trại cao cấp giữa thiên nhiên" },
]);

export const PRICE_RANGE_PRESETS: PriceRangePreset[] = [
  { id: "all", label: "Mọi mức giá", minPrice: DEFAULT_MIN_PRICE, maxPrice: DEFAULT_MAX_PRICE },
  { id: "under-1m", label: "Dưới 1 triệu", minPrice: 0, maxPrice: 1000000 },
  { id: "1m-2.5m", label: "1 – 2.5 triệu", minPrice: 1000000, maxPrice: 2500000 },
  { id: "2.5m-5m", label: "2.5 – 5 triệu", minPrice: 2500000, maxPrice: 5000000 },
  { id: "over-5m", label: "Trên 5 triệu", minPrice: 5000000, maxPrice: DEFAULT_MAX_PRICE },
];

export const QUICK_SEARCH_TRENDS: QuickSearchTrend[] = [
  {
    id: "dalat-clouds",
    label: "Đà Lạt săn mây",
    destination: "Đà Lạt",
    category: "mountain-view",
  },
  {
    id: "phuquoc-resort",
    label: "Phú Quốc resort",
    destination: "Phú Quốc",
    propertyType: "resort",
  },
  {
    id: "sapa-mountain",
    label: "Sa Pa view núi",
    destination: "Sa Pa",
    category: "mountain-view",
  },
  {
    id: "danang-beach",
    label: "Đà Nẵng gần biển",
    destination: "Đà Nẵng",
  },
  {
    id: "hoian-oldtown",
    label: "Hội An phố cổ",
    destination: "Hội An",
  },
];

export function createDefaultCatalogQuery(): StayCatalogQueryState {
  return {
    search: {
      destination: "",
      checkIn: "",
      checkOut: "",
      guests: {
        adults: 2,
        children: 0,
        rooms: 1,
      },
    },
    filters: {
      category: "all",
      minPrice: DEFAULT_MIN_PRICE,
      maxPrice: DEFAULT_MAX_PRICE,
      propertyTypes: [],
      minRating: 0,
      amenities: [],
      freeCancellationOnly: false,
      sortBy: "popular",
    },
  };
}

export function setQueryDestination(
  state: StayCatalogQueryState,
  destination: string
): StayCatalogQueryState {
  return {
    ...state,
    search: {
      ...state.search,
      destination,
    },
  };
}

export function setQueryDates(
  state: StayCatalogQueryState,
  dates: { checkIn?: string; checkOut?: string }
): StayCatalogQueryState {
  let nextCheckIn = dates.checkIn !== undefined ? dates.checkIn.trim() : state.search.checkIn;
  let nextCheckOut = dates.checkOut !== undefined ? dates.checkOut.trim() : state.search.checkOut;

  if (dates.checkIn !== undefined && dates.checkOut === undefined && ISO_DATE_RE.test(nextCheckIn)) {
    if (nextCheckOut && (!ISO_DATE_RE.test(nextCheckOut) || nextCheckOut <= nextCheckIn)) {
      nextCheckOut = "";
    }
  } else if (
    dates.checkOut !== undefined &&
    dates.checkIn === undefined &&
    ISO_DATE_RE.test(nextCheckOut)
  ) {
    if (nextCheckIn && (!ISO_DATE_RE.test(nextCheckIn) || nextCheckIn >= nextCheckOut)) {
      nextCheckIn = "";
    }
  }

  return {
    ...state,
    search: {
      ...state.search,
      checkIn: nextCheckIn,
      checkOut: nextCheckOut,
    },
  };
}

export function adjustQueryGuests(
  state: StayCatalogQueryState,
  field: "adults" | "children" | "rooms",
  delta: number
): StayCatalogQueryState {
  const safeDelta = Number.isFinite(delta) ? Math.trunc(delta) : 0;
  const min = field === "children" ? 0 : 1;
  const next = Math.max(min, state.search.guests[field] + safeDelta);

  return {
    ...state,
    search: {
      ...state.search,
      guests: {
        ...state.search.guests,
        [field]: next,
      },
    },
  };
}

export function setQueryCategory(
  state: StayCatalogQueryState,
  category: CategoryId
): StayCatalogQueryState {
  return {
    ...state,
    filters: {
      ...state.filters,
      category,
    },
  };
}

export function setQueryPropertyTypeTab(
  state: StayCatalogQueryState,
  tab: PropertyType | "all"
): StayCatalogQueryState {
  return {
    ...state,
    filters: {
      ...state.filters,
      propertyTypes: tab === "all" ? [] : [tab],
    },
  };
}

export function toggleQueryPropertyType(
  state: StayCatalogQueryState,
  type: PropertyType
): StayCatalogQueryState {
  const exists = state.filters.propertyTypes.includes(type);
  return {
    ...state,
    filters: {
      ...state.filters,
      propertyTypes: exists
        ? state.filters.propertyTypes.filter((t) => t !== type)
        : [...state.filters.propertyTypes, type],
    },
  };
}

export function setQueryPriceRange(
  state: StayCatalogQueryState,
  minPrice: number,
  maxPrice: number
): StayCatalogQueryState {
  const clampedMax = Number.isFinite(maxPrice)
    ? Math.min(DEFAULT_MAX_PRICE, Math.max(0, Math.floor(maxPrice)))
    : DEFAULT_MAX_PRICE;
  let clampedMin = Number.isFinite(minPrice)
    ? Math.min(DEFAULT_MAX_PRICE, Math.max(0, Math.floor(minPrice)))
    : DEFAULT_MIN_PRICE;

  if (clampedMin > clampedMax) {
    clampedMin = DEFAULT_MIN_PRICE;
  }

  return {
    ...state,
    filters: {
      ...state.filters,
      minPrice: clampedMin,
      maxPrice: clampedMax,
    },
  };
}

export function setQueryMinRating(
  state: StayCatalogQueryState,
  minRating: number
): StayCatalogQueryState {
  const safeRating = Number.isFinite(minRating) ? Math.min(5, Math.max(0, minRating)) : 0;
  return {
    ...state,
    filters: {
      ...state.filters,
      minRating: safeRating,
    },
  };
}

export function toggleQueryAmenity(
  state: StayCatalogQueryState,
  amenity: AmenityFilterKey
): StayCatalogQueryState {
  const exists = state.filters.amenities.includes(amenity);
  return {
    ...state,
    filters: {
      ...state.filters,
      amenities: exists
        ? state.filters.amenities.filter((a) => a !== amenity)
        : [...state.filters.amenities, amenity],
    },
  };
}

export function setQueryFreeCancellation(
  state: StayCatalogQueryState,
  enabled: boolean
): StayCatalogQueryState {
  return {
    ...state,
    filters: {
      ...state.filters,
      freeCancellationOnly: enabled,
    },
  };
}

export function setQuerySortBy(
  state: StayCatalogQueryState,
  sortBy: SortOption
): StayCatalogQueryState {
  return {
    ...state,
    filters: {
      ...state.filters,
      sortBy,
    },
  };
}

export function applyQuickSearchTrend(
  state: StayCatalogQueryState,
  trend: QuickSearchTrend
): StayCatalogQueryState {
  return {
    ...state,
    search: {
      ...state.search,
      destination: trend.destination,
    },
    filters: {
      ...state.filters,
      category: trend.category ?? "all",
      propertyTypes: trend.propertyType ? [trend.propertyType] : [],
    },
  };
}

export function removeActiveFilterChip(
  state: StayCatalogQueryState,
  chip: ActiveFilterChip
): StayCatalogQueryState {
  switch (chip.kind) {
    case "destination":
      return setQueryDestination(state, "");
    case "category":
      return setQueryCategory(state, "all");
    case "price":
      return setQueryPriceRange(state, DEFAULT_MIN_PRICE, DEFAULT_MAX_PRICE);
    case "propertyType":
      return chip.value
        ? {
            ...state,
            filters: {
              ...state.filters,
              propertyTypes: state.filters.propertyTypes.filter((t) => t !== chip.value),
            },
          }
        : state;
    case "rating":
      return setQueryMinRating(state, 0);
    case "amenity":
      return chip.value
        ? {
            ...state,
            filters: {
              ...state.filters,
              amenities: state.filters.amenities.filter((a) => a !== chip.value),
            },
          }
        : state;
    case "freeCancellation":
      return setQueryFreeCancellation(state, false);
  }
}

function buildPriceChipLabel(minPrice: number, maxPrice: number): string {
  const matchedPreset = PRICE_RANGE_PRESETS.find(
    (p) => p.minPrice === minPrice && p.maxPrice === maxPrice && p.id !== "all"
  );
  if (matchedPreset) return `Giá: ${matchedPreset.label}`;
  if (minPrice > DEFAULT_MIN_PRICE && maxPrice < DEFAULT_MAX_PRICE) {
    return `${formatVND(minPrice)} – ${formatVND(maxPrice)}`;
  }
  if (minPrice > DEFAULT_MIN_PRICE) {
    return `Từ ${formatVND(minPrice)}`;
  }
  return `Tối đa ${formatVND(maxPrice)}`;
}

function buildActiveChips(
  query: StayCatalogQueryState,
  categories: readonly Category[] = CATEGORIES,
  amenityFilterOptions: readonly AmenityFilterOption[] = AMENITY_FILTER_OPTIONS
): ActiveFilterChip[] {
  const chips: ActiveFilterChip[] = [];
  const { search, filters } = query;

  if (search.destination.trim()) {
    chips.push({
      id: "destination",
      kind: "destination",
      label: `Điểm đến: ${search.destination.trim()}`,
    });
  }

  if (filters.category !== "all") {
    const cat = categories.find((c) => c.id === filters.category);
    chips.push({
      id: `category:${filters.category}`,
      kind: "category",
      label: cat ? cat.label : filters.category,
    });
  }

  if (filters.minPrice > DEFAULT_MIN_PRICE || filters.maxPrice < DEFAULT_MAX_PRICE) {
    chips.push({
      id: "price",
      kind: "price",
      label: buildPriceChipLabel(filters.minPrice, filters.maxPrice),
    });
  }

  for (const type of filters.propertyTypes) {
    chips.push({
      id: `propertyType:${type}`,
      kind: "propertyType",
      label: PROPERTY_TYPE_LABELS[type] ?? type,
      value: type,
    });
  }

  if (filters.minRating > 0) {
    chips.push({
      id: "rating",
      kind: "rating",
      label: `★ ${filters.minRating}+`,
    });
  }

  for (const amenityKey of filters.amenities) {
    const opt = amenityFilterOptions.find((o) => o.key === amenityKey);
    chips.push({
      id: `amenity:${amenityKey}`,
      kind: "amenity",
      label: opt ? opt.label : amenityKey,
      value: amenityKey,
    });
  }

  if (filters.freeCancellationOnly) {
    chips.push({
      id: "freeCancellation",
      kind: "freeCancellation",
      label: "Hủy miễn phí",
    });
  }

  return chips;
}

function countModalFilters(query: StayCatalogQueryState): number {
  const { filters } = query;
  let count = 0;
  if (filters.propertyTypes.length > 0) count += filters.propertyTypes.length;
  if (filters.minRating > 0) count += 1;
  if (filters.amenities.length > 0) count += filters.amenities.length;
  if (filters.freeCancellationOnly) count += 1;
  if (filters.minPrice > DEFAULT_MIN_PRICE || filters.maxPrice < DEFAULT_MAX_PRICE) count += 1;
  return count;
}

export function executeCatalogQuery(
  properties: readonly Property[],
  query: StayCatalogQueryState,
  options?: CatalogQueryOptions
): CatalogQueryResult {
  const { search, filters } = query;
  const normalizedDest = normalizeVietnamese(search.destination);
  const totalGuests = Math.max(1, search.guests.adults + search.guests.children);

  const items = properties
    .filter((prop) => {
      if (filters.category !== "all" && prop.category !== filters.category) {
        return false;
      }

      if (normalizedDest.length > 0) {
        const haystack = normalizeVietnamese(
          `${prop.location.city} ${prop.location.province} ${prop.location.address} ${prop.title} ${prop.subtitle}`
        );
        if (!haystack.includes(normalizedDest)) {
          return false;
        }
      }

      if (prop.maxGuests < totalGuests) {
        return false;
      }

      if (
        filters.propertyTypes.length > 0 &&
        !filters.propertyTypes.includes(prop.propertyType)
      ) {
        return false;
      }

      if (prop.pricePerNight < filters.minPrice || prop.pricePerNight > filters.maxPrice) {
        return false;
      }

      if (filters.minRating > 0 && prop.rating < filters.minRating) {
        return false;
      }

      if (filters.freeCancellationOnly && !prop.freeCancellation) {
        return false;
      }

      if (!propertyHasAmenityFilters(prop, filters.amenities)) {
        return false;
      }

      return true;
    })
    .sort((a, b) => {
      if (filters.sortBy === "price-asc") {
        return a.pricePerNight - b.pricePerNight || b.rating - a.rating;
      }
      if (filters.sortBy === "price-desc") {
        return b.pricePerNight - a.pricePerNight || b.rating - a.rating;
      }
      if (filters.sortBy === "rating-desc") {
        return b.rating - a.rating || b.reviewCount - a.reviewCount;
      }
      return (
        (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0) ||
        b.rating - a.rating ||
        b.reviewCount - a.reviewCount
      );
    });

  const activePropertyTypeTab: PropertyType | "all" =
    filters.propertyTypes.length === 1 ? filters.propertyTypes[0] : "all";

  return {
    items,
    totalCount: items.length,
    activeFilterCount: countModalFilters(query),
    activeChips: buildActiveChips(query, options?.categories, options?.amenityFilterOptions),
    activePropertyTypeTab,
  };
}

export function filterDestinations(
  destinations: readonly Destination[],
  query: string
): Destination[] {
  const normalizedQuery = normalizeVietnamese(query);
  if (!normalizedQuery) return [...destinations];

  return destinations.filter((dest) => {
    const haystack = normalizeVietnamese(`${dest.name} ${dest.province} ${dest.popularFor}`);
    return haystack.includes(normalizedQuery);
  });
}

export function resolveFavoriteProperties(
  properties: readonly Property[],
  favoriteIds: readonly string[]
): Property[] {
  if (favoriteIds.length === 0) return [];
  const favoriteSet = new Set(favoriteIds);
  return properties.filter((property) => favoriteSet.has(property.id));
}
