import type {
  AmenityCatalogItem,
  AmenityCategoryGroup,
  AmenityCategoryId,
  AmenityCategoryMeta,
  AmenityCategorySummary,
  AmenityExplorerAction,
  AmenityExplorerState,
  AmenityExplorerView,
  AmenityFeeFilterOption,
  AmenityFilterKey,
  AmenityPricingDescriptor,
  Property,
  PropertyAmenityOverride,
  PropertyAmenityProjection,
  ResolvedPropertyAmenity,
  SelectedAmenityDisplay,
  SelectedBookingAmenity,
} from "@luxestay/contracts";
import { AMENITY_CATALOG, AMENITY_CATEGORIES } from "./seed/amenities.js";
import { formatVND, normalizeVietnamese } from "./utils.js";

const CARD_HIGHLIGHT_LIMIT = 3;
const FEATURED_AMENITY_LIMIT = 6;
const EMPTY_OVERRIDES: readonly PropertyAmenityOverride[] = Object.freeze([]);
const INCLUDED_NOTICE =
  "Đã bao gồm sẵn trong kỳ nghỉ — bạn có thể sử dụng tự do không cần đăng ký thêm.";

const CATEGORY_LABEL_MAP = new Map<AmenityCategoryId, string>(
  AMENITY_CATEGORIES.map((category) => [category.id, category.label])
);

const PROJECTION_CACHE = new WeakMap<
  readonly PropertyAmenityOverride[],
  PropertyAmenityProjection
>();

export interface AmenityProjectionTaxonomy {
  catalog?: Readonly<Record<string, AmenityCatalogItem>>;
  categories?: readonly AmenityCategoryMeta[];
}

function sanitizePositiveFee(price: number | undefined): number {
  return typeof price === "number" && Number.isFinite(price) && price > 0 ? price : 0;
}

function groupResolvedAmenities(
  amenities: readonly ResolvedPropertyAmenity[],
  freezeItems = false,
  categories: readonly AmenityCategoryMeta[] = AMENITY_CATEGORIES
): AmenityCategoryGroup[] {
  const grouped = new Map<AmenityCategoryId, ResolvedPropertyAmenity[]>();
  for (const item of amenities) {
    const list = grouped.get(item.category);
    if (list) {
      list.push(item);
    } else {
      grouped.set(item.category, [item]);
    }
  }

  const result: AmenityCategoryGroup[] = [];
  for (const category of categories) {
    const items = grouped.get(category.id);
    if (items && items.length > 0) {
      const group: AmenityCategoryGroup = {
        category,
        items: freezeItems ? Object.freeze(items) : items,
      };
      result.push(freezeItems ? Object.freeze(group) : group);
    }
  }
  return result;
}

function buildPropertyAmenityProjection(
  overrides: readonly PropertyAmenityOverride[],
  catalog: Readonly<Record<string, AmenityCatalogItem>> = AMENITY_CATALOG,
  amenityCategories: readonly AmenityCategoryMeta[] = AMENITY_CATEGORIES
): PropertyAmenityProjection {
  const all: ResolvedPropertyAmenity[] = [];
  const byId = new Map<string, ResolvedPropertyAmenity>();
  const filterKeys = new Set<AmenityFilterKey>();

  for (const override of overrides) {
    const base = catalog[override.amenityId];
    if (!base || byId.has(base.id)) continue;

    const pricingType = override.pricingType ?? base.pricingType;
    const isPaid = pricingType === "paid";

    const item: ResolvedPropertyAmenity = Object.freeze({
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

    all.push(item);
    byId.set(item.id, item);
    for (const key of item.filterKeys) {
      filterKeys.add(key);
    }
  }

  const groups = Object.freeze(groupResolvedAmenities(all, true, amenityCategories));
  const categories: readonly AmenityCategorySummary[] = Object.freeze(
    groups.map(({ category, items }) => Object.freeze({ category, count: items.length }))
  );
  const cardHighlights: readonly AmenityCategoryMeta[] = Object.freeze(
    groups.slice(0, CARD_HIGHLIGHT_LIMIT).map((group) => group.category)
  );

  const featuredItems = all.filter((item) => item.featured);
  const nonFeaturedItems = all.filter((item) => !item.featured);
  const featured = Object.freeze(
    [...featuredItems, ...nonFeaturedItems].slice(0, FEATURED_AMENITY_LIMIT)
  );

  return Object.freeze({
    all: Object.freeze(all),
    totalCount: all.length,
    byId,
    groups,
    categories,
    cardHighlights,
    featured,
    filterKeys,
  });
}

export function projectPropertyAmenities(
  property: Pick<Property, "resortAmenities">,
  taxonomy?: AmenityProjectionTaxonomy
): PropertyAmenityProjection {
  const overrides = property.resortAmenities ?? EMPTY_OVERRIDES;
  if (taxonomy?.catalog || taxonomy?.categories) {
    return buildPropertyAmenityProjection(
      overrides,
      taxonomy.catalog ?? AMENITY_CATALOG,
      taxonomy.categories ?? AMENITY_CATEGORIES
    );
  }

  const cached = PROJECTION_CACHE.get(overrides);
  if (cached) {
    return cached;
  }

  const projection = buildPropertyAmenityProjection(overrides);
  PROJECTION_CACHE.set(overrides, projection);
  return projection;
}

export function propertyHasAmenityFilters(
  property: Pick<Property, "resortAmenities">,
  requiredFilters: AmenityFilterKey[],
  taxonomy?: AmenityProjectionTaxonomy
): boolean {
  if (requiredFilters.length === 0) return true;
  const { filterKeys } = projectPropertyAmenities(property, taxonomy);
  return requiredFilters.every((key) => filterKeys.has(key));
}

export function getAmenityCategoryLabel(categoryId: AmenityCategoryId): string {
  return CATEGORY_LABEL_MAP.get(categoryId) ?? "Tiện ích";
}

export function createAmenityExplorerState(init: {
  projection: PropertyAmenityProjection;
  initialAmenityId?: string | null;
  initialCategory?: AmenityCategoryId | "all";
}): AmenityExplorerState {
  const { projection, initialAmenityId = null, initialCategory = "all" } = init;
  const hasInitialCategory =
    initialCategory === "all" ||
    projection.categories.some((entry) => entry.category.id === initialCategory);
  const resolvedCategory: AmenityCategoryId | "all" = hasInitialCategory ? initialCategory : "all";

  const initialAmenity = initialAmenityId ? projection.byId.get(initialAmenityId) : undefined;
  const isInitialAmenityVisible = Boolean(
    initialAmenity &&
    (resolvedCategory === "all" || initialAmenity.category === resolvedCategory)
  );

  const categoryFirstId =
    resolvedCategory === "all"
      ? (projection.all[0]?.id ?? null)
      : (projection.groups.find((group) => group.category.id === resolvedCategory)?.items[0]?.id ??
        projection.all[0]?.id ??
        null);

  return {
    activeCategory: resolvedCategory,
    searchQuery: "",
    feeFilter: "all",
    activeAmenityId: isInitialAmenityVisible ? initialAmenity!.id : categoryFirstId,
    mobileShowDetail: isInitialAmenityVisible,
  };
}

export function reduceAmenityExplorerState(
  state: AmenityExplorerState,
  action: AmenityExplorerAction
): AmenityExplorerState {
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

export function deriveAmenityExplorerView(
  projection: PropertyAmenityProjection,
  state: AmenityExplorerState,
  selectedAmenities: SelectedBookingAmenity[]
): AmenityExplorerView {
  const selectedAmenityIds = new Set<string>();
  let selectedTotalFee = 0;

  for (const item of selectedAmenities) {
    if (!projection.byId.has(item.id) || selectedAmenityIds.has(item.id)) continue;
    selectedAmenityIds.add(item.id);
    if (item.pricingType === "paid") {
      selectedTotalFee += sanitizePositiveFee(item.price);
    }
  }

  const selectedCount = selectedAmenityIds.size;
  const normalizedQuery = normalizeVietnamese(state.searchQuery);

  const filteredItems = projection.all.filter((item) => {
    if (state.activeCategory !== "all" && item.category !== state.activeCategory) {
      return false;
    }

    if (state.feeFilter === "free" && item.pricingType === "paid") {
      return false;
    }
    if (state.feeFilter === "paid" && item.pricingType !== "paid") {
      return false;
    }
    if (state.feeFilter === "selected" && !selectedAmenityIds.has(item.id)) {
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

  const groupedItems = groupResolvedAmenities(filteredItems);
  const matchedActiveAmenity =
    filteredItems.find((item) => item.id === state.activeAmenityId) ?? null;
  const effectiveActiveAmenity = matchedActiveAmenity ?? filteredItems[0] ?? null;
  const activeCategoryLabel = effectiveActiveAmenity
    ? getAmenityCategoryLabel(effectiveActiveAmenity.category)
    : "";
  const mobileShowDetail = state.mobileShowDetail && matchedActiveAmenity !== null;

  const feeFilterOptions: AmenityFeeFilterOption[] = [
    { id: "all", label: "Tất cả" },
    { id: "free", label: "Miễn phí" },
    { id: "paid", label: "Có phụ phí" },
    { id: "selected", label: `Đã chọn (${selectedCount})` },
  ];

  return {
    totalCount: projection.totalCount,
    availableCategories: projection.categories,
    feeFilterOptions,
    filteredItems,
    groupedItems,
    effectiveActiveAmenity,
    activeCategoryLabel,
    mobileShowDetail,
    selectedAmenityIds,
    selectedCount,
    selectedTotalFee,
    isEmpty: filteredItems.length === 0,
  };
}

export function describeAmenityPricing(
  amenity: Pick<ResolvedPropertyAmenity, "pricingType" | "price" | "priceUnit">
): AmenityPricingDescriptor {
  if (amenity.pricingType === "paid") {
    const safePrice = sanitizePositiveFee(amenity.price);
    const formattedPrice = safePrice > 0 ? formatVND(safePrice) : "0đ";
    const compactBadge = safePrice > 0 ? `+${formattedPrice}` : "0đ";
    return {
      tone: "paid",
      isSelectable: true,
      compactBadge,
      heroBadge: compactBadge,
      detailPrice: amenity.priceUnit
        ? `${formattedPrice} / ${amenity.priceUnit}`
        : formattedPrice,
      detailStatus: "Dịch vụ chọn thêm (cộng vào đơn)",
      includedNotice: "",
      selectActionLabel: `Yêu cầu thêm khi đặt phòng (${compactBadge})`,
      selectedActionLabel: `Đã thêm vào đặt phòng (${compactBadge}) — Bấm để gỡ`,
    };
  }

  if (amenity.pricingType === "free-reservation") {
    return {
      tone: "free-reservation",
      isSelectable: true,
      compactBadge: "Miễn phí • Đặt trước",
      heroBadge: "Miễn phí • Cần đặt trước",
      detailPrice: "Miễn phí (0đ)",
      detailStatus: "Khuyến nghị đăng ký trước",
      includedNotice: "",
      selectActionLabel: "Đăng ký sử dụng miễn phí khi đặt phòng",
      selectedActionLabel: "Đã đăng ký vào chuyến đi (Miễn phí) — Bấm để hủy",
    };
  }

  return {
    tone: "included",
    isSelectable: false,
    compactBadge: "Miễn phí",
    heroBadge: "Miễn phí",
    detailPrice: "Miễn phí • Bao gồm sẵn",
    detailStatus: "Sử dụng tự do trong kỳ nghỉ",
    includedNotice: INCLUDED_NOTICE,
    selectActionLabel: "",
    selectedActionLabel: "",
  };
}

export function describeSelectedAmenity(
  item: Pick<SelectedBookingAmenity, "pricingType" | "price" | "priceUnit">
): SelectedAmenityDisplay {
  if (item.pricingType === "paid") {
    const safePrice = sanitizePositiveFee(item.price);
    const fee = safePrice > 0 ? `+${formatVND(safePrice)}` : "0đ";
    return {
      tone: "paid",
      subtitle: item.priceUnit ?? "Gói dịch vụ theo kỳ nghỉ",
      compactFee: fee,
      checkoutFee: fee,
      confirmedFee: fee,
    };
  }

  return {
    tone: "free-reservation",
    subtitle: "Miễn phí • Đăng ký giữ chỗ trước",
    compactFee: "0đ • Đặt trước",
    checkoutFee: "0đ",
    confirmedFee: "Miễn phí • Đã đăng ký",
  };
}

export function formatAmenitiesFeeSummary(
  totalFee: number,
  style: "plain" | "parenthesized" = "plain"
): string {
  const safeFee = sanitizePositiveFee(totalFee);
  if (style === "parenthesized") {
    return safeFee > 0 ? `(+${formatVND(safeFee)})` : "(Miễn phí 0đ)";
  }
  return safeFee > 0 ? `+${formatVND(safeFee)}` : "Miễn phí";
}
