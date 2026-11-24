import { z } from "zod";
import {
  ActiveFilterChipKindSchema,
  AmenityCategoryIdSchema,
  AmenityFeeFilterSchema,
  AmenityFilterKeySchema,
  AmenityPricingTypeSchema,
  CategoryIdSchema,
  PropertyTypeSchema,
  SortOptionSchema,
  type ActiveFilterChipKind,
  type AmenityCategoryId,
  type AmenityFeeFilter,
  type AmenityFilterKey,
  type AmenityPricingType,
  type CategoryId,
  type PropertyType,
  type SortOption,
} from "./common.js";

export const CategorySchema = z.object({
  id: CategoryIdSchema,
  label: z.string().min(1),
  iconName: z.string().min(1),
  description: z.string().optional(),
});

export type Category = z.infer<typeof CategorySchema>;

export const AmenityCategoryMetaSchema = z.object({
  id: AmenityCategoryIdSchema,
  label: z.string().min(1),
  shortLabel: z.string().min(1),
  iconName: z.string().min(1),
  description: z.string().min(1),
});

export type AmenityCategoryMeta = z.infer<typeof AmenityCategoryMetaSchema>;

export const AmenityFilterOptionSchema = z.object({
  key: AmenityFilterKeySchema,
  label: z.string().min(1),
  iconName: z.string().min(1),
});

export type AmenityFilterOption = z.infer<typeof AmenityFilterOptionSchema>;

export const AmenityCatalogItemSchema = z.object({
  id: z.string().min(1),
  category: AmenityCategoryIdSchema,
  name: z.string().min(1),
  shortLabel: z.string().min(1),
  iconName: z.string().min(1),
  description: z.string().min(1),
  image: z.string().min(1),
  hours: z.string().min(1),
  location: z.string().min(1),
  pricingType: AmenityPricingTypeSchema,
  price: z.number().nonnegative().optional(),
  priceUnit: z.string().optional(),
  notes: z.string().optional(),
  filterKeys: z.array(AmenityFilterKeySchema),
});

export type AmenityCatalogItem = z.infer<typeof AmenityCatalogItemSchema>;

export const PropertyAmenityOverrideSchema = z.object({
  amenityId: z.string().min(1),
  featured: z.boolean().optional(),
  name: z.string().optional(),
  shortLabel: z.string().optional(),
  description: z.string().optional(),
  image: z.string().optional(),
  hours: z.string().optional(),
  location: z.string().optional(),
  pricingType: AmenityPricingTypeSchema.optional(),
  price: z.number().nonnegative().optional(),
  priceUnit: z.string().optional(),
  notes: z.string().optional(),
});

export type PropertyAmenityOverride = z.infer<typeof PropertyAmenityOverrideSchema>;

export const ResolvedPropertyAmenitySchema = AmenityCatalogItemSchema.extend({
  featured: z.boolean(),
});

export type ResolvedPropertyAmenity = z.infer<typeof ResolvedPropertyAmenitySchema>;

export const PropertyReviewSchema = z.object({
  id: z.string().min(1),
  authorName: z.string().min(1),
  authorAvatar: z.string().min(1),
  rating: z.number().min(0).max(5),
  date: z.string().min(1),
  comment: z.string().min(1),
});

export type PropertyReview = z.infer<typeof PropertyReviewSchema>;

export const PropertySchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  subtitle: z.string().min(1),
  propertyType: PropertyTypeSchema,
  category: CategoryIdSchema,
  location: z.object({
    city: z.string().min(1),
    province: z.string().min(1),
    address: z.string().min(1),
    distanceToCenter: z.string().min(1),
  }),
  images: z.array(z.string().min(1)).min(1),
  pricePerNight: z.number().nonnegative(),
  originalPrice: z.number().nonnegative().optional(),
  rating: z.number().min(0).max(5),
  reviewCount: z.number().int().nonnegative(),
  maxGuests: z.number().int().positive(),
  bedrooms: z.number().int().nonnegative(),
  beds: z.number().int().nonnegative(),
  bathrooms: z.number().int().nonnegative(),
  resortAmenities: z.array(PropertyAmenityOverrideSchema),
  isSuperhost: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  isFlashDeal: z.boolean().optional(),
  freeCancellation: z.boolean().optional(),
  breakfastIncluded: z.boolean().optional(),
  description: z.string().min(1),
  host: z.object({
    name: z.string().min(1),
    avatar: z.string().min(1),
    joinedDate: z.string().min(1),
    responseRate: z.string().min(1),
    isSuperhost: z.boolean(),
  }),
  reviews: z.array(PropertyReviewSchema),
});

export type Property = z.infer<typeof PropertySchema>;

export const DestinationSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  province: z.string().min(1),
  image: z.string().min(1),
  propertiesCount: z.number().int().nonnegative(),
  tag: z.string().min(1),
  popularFor: z.string().min(1),
});

export type Destination = z.infer<typeof DestinationSchema>;

export const TestimonialItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  role: z.string().min(1),
  avatar: z.string().min(1),
  rating: z.number().min(0).max(5),
  stayName: z.string().min(1),
  content: z.string().min(1),
  tripType: z.string().min(1),
});

export type TestimonialItem = z.infer<typeof TestimonialItemSchema>;

export const PromotionVoucherSchema = z.object({
  id: z.string().min(1),
  code: z.string().min(1),
  description: z.string().min(1),
  tone: z.enum(["emerald", "amber"]),
});

export type PromotionVoucher = z.infer<typeof PromotionVoucherSchema>;

export const PromotionsBundleSchema = z.object({
  expiryLabel: z.string().min(1),
  vouchers: z.array(PromotionVoucherSchema).readonly(),
});

export type PromotionsBundle = z.infer<typeof PromotionsBundleSchema>;

export const CatalogSnapshotSchema = z.object({
  properties: z.array(PropertySchema).readonly(),
  categories: z.array(CategorySchema).readonly(),
  destinations: z.array(DestinationSchema).readonly(),
  amenityCategories: z.array(AmenityCategoryMetaSchema).readonly(),
  amenityFilterOptions: z.array(AmenityFilterOptionSchema).readonly(),
  amenityCatalog: z.record(z.string(), AmenityCatalogItemSchema),
  promotions: PromotionsBundleSchema,
  testimonials: z.array(TestimonialItemSchema).readonly(),
});

export type CatalogSnapshot = z.infer<typeof CatalogSnapshotSchema>;

// ============================================
// Domain Query & Projection Models
// ============================================

export interface AmenityCategoryGroup {
  category: AmenityCategoryMeta;
  items: readonly ResolvedPropertyAmenity[];
}

export interface AmenityCategorySummary {
  category: AmenityCategoryMeta;
  count: number;
}

export interface PropertyAmenityProjection {
  all: readonly ResolvedPropertyAmenity[];
  totalCount: number;
  byId: ReadonlyMap<string, ResolvedPropertyAmenity>;
  groups: readonly AmenityCategoryGroup[];
  categories: readonly AmenityCategorySummary[];
  cardHighlights: readonly AmenityCategoryMeta[];
  featured: readonly ResolvedPropertyAmenity[];
  filterKeys: ReadonlySet<AmenityFilterKey>;
}

export interface AmenityExplorerState {
  activeCategory: AmenityCategoryId | "all";
  searchQuery: string;
  feeFilter: AmenityFeeFilter;
  activeAmenityId: string | null;
  mobileShowDetail: boolean;
}

export type AmenityExplorerAction =
  | { type: "SET_CATEGORY"; category: AmenityCategoryId | "all" }
  | { type: "SET_SEARCH"; query: string }
  | { type: "SET_FEE_FILTER"; feeFilter: AmenityFeeFilter }
  | { type: "SELECT_AMENITY"; amenityId: string }
  | { type: "BACK_TO_LIST" }
  | { type: "RESET_FILTERS" };

export interface AmenityFeeFilterOption {
  id: AmenityFeeFilter;
  label: string;
}

export interface AmenityExplorerView {
  totalCount: number;
  availableCategories: readonly AmenityCategorySummary[];
  feeFilterOptions: AmenityFeeFilterOption[];
  filteredItems: ResolvedPropertyAmenity[];
  groupedItems: AmenityCategoryGroup[];
  effectiveActiveAmenity: ResolvedPropertyAmenity | null;
  activeCategoryLabel: string;
  mobileShowDetail: boolean;
  selectedAmenityIds: ReadonlySet<string>;
  selectedCount: number;
  selectedTotalFee: number;
  isEmpty: boolean;
}

export type AmenityPricingTone = AmenityPricingType;

export interface AmenityPricingDescriptor {
  tone: AmenityPricingTone;
  isSelectable: boolean;
  compactBadge: string;
  heroBadge: string;
  detailPrice: string;
  detailStatus: string;
  includedNotice: string;
  selectActionLabel: string;
  selectedActionLabel: string;
}

export interface SelectedAmenityDisplay {
  tone: "free-reservation" | "paid";
  subtitle: string;
  compactFee: string;
  checkoutFee: string;
  confirmedFee: string;
}

export interface SearchCriteria {
  destination: string;
  checkIn: string;
  checkOut: string;
  guests: {
    adults: number;
    children: number;
    rooms: number;
  };
}

export interface FilterState {
  category: CategoryId;
  minPrice: number;
  maxPrice: number;
  propertyTypes: PropertyType[];
  minRating: number;
  amenities: AmenityFilterKey[];
  freeCancellationOnly: boolean;
  sortBy: SortOption;
}

export interface PriceRangePreset {
  id: string;
  label: string;
  minPrice: number;
  maxPrice: number;
}

export interface QuickSearchTrend {
  id: string;
  label: string;
  destination: string;
  category?: CategoryId;
  propertyType?: PropertyType;
}

export interface StayCatalogQueryState {
  search: SearchCriteria;
  filters: FilterState;
}

export interface ActiveFilterChip {
  id: string;
  kind: ActiveFilterChipKind;
  label: string;
  value?: string;
}

export interface CatalogQueryResult {
  items: Property[];
  totalCount: number;
  activeFilterCount: number;
  activeChips: ActiveFilterChip[];
  activePropertyTypeTab: PropertyType | "all";
}

export { ActiveFilterChipKindSchema, AmenityFeeFilterSchema, SortOptionSchema };
