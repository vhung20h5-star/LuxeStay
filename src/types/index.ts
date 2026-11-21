export type PropertyType = "hotel" | "homestay" | "villa" | "resort" | "glamping";

export type CategoryId =
  | "all"
  | "mountain-view"
  | "beachfront"
  | "vintage-homestay"
  | "infinity-pool"
  | "ecolodge"
  | "city-center"
  | "pine-forest"
  | "luxury-resort";

export interface Category {
  id: CategoryId;
  label: string;
  iconName: string;
  description?: string;
}

export type AmenityCategoryId =
  | "pool-beach"
  | "sports-recreation"
  | "dining"
  | "hotel-spa"
  | "transport"
  | "room-family"
  | "security-general";

export type AmenityPricingType = "included" | "free-reservation" | "paid";

export type AmenityFilterKey =
  | "pool"
  | "beach"
  | "sports-gym"
  | "dining"
  | "spa-wellness"
  | "transport-shuttle"
  | "bbq-campfire"
  | "bath-fireplace"
  | "family-pet";

export interface AmenityCategoryMeta {
  id: AmenityCategoryId;
  label: string;
  shortLabel: string;
  iconName: string;
  description: string;
}

export interface AmenityFilterOption {
  key: AmenityFilterKey;
  label: string;
  iconName: string;
}

export interface AmenityCatalogItem {
  id: string;
  category: AmenityCategoryId;
  name: string;
  shortLabel: string;
  iconName: string;
  description: string;
  image: string;
  hours: string;
  location: string;
  pricingType: AmenityPricingType;
  price?: number;
  priceUnit?: string;
  notes?: string;
  filterKeys: AmenityFilterKey[];
}

export interface PropertyAmenityOverride {
  amenityId: string;
  featured?: boolean;
  name?: string;
  shortLabel?: string;
  description?: string;
  image?: string;
  hours?: string;
  location?: string;
  pricingType?: AmenityPricingType;
  price?: number;
  priceUnit?: string;
  notes?: string;
}

export interface ResolvedPropertyAmenity extends AmenityCatalogItem {
  featured: boolean;
}

export interface SelectedBookingAmenity {
  id: string;
  name: string;
  category: AmenityCategoryId;
  pricingType: "free-reservation" | "paid";
  price: number;
  priceUnit?: string;
}

export type AmenityFeeFilter = "all" | "free" | "paid" | "selected";

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

export type BookingSessionStep = "idle" | "previewing" | "checking-out" | "confirmed";

export interface BookingSessionState {
  step: BookingSessionStep;
  property: Property | null;
  searchSeedKey: string;
  checkInSeed: string;
  nights: number;
  guests: {
    adults: number;
    children: number;
    rooms: number;
  };
  selectedAmenityIds: string[];
  confirmedBooking: BookingDetails | null;
}

export interface BookingQuote {
  property: Property;
  nights: number;
  checkIn: string;
  checkOut: string;
  guests: {
    adults: number;
    children: number;
    rooms: number;
  };
  resolvedAmenities: ResolvedPropertyAmenity[];
  selectedAmenityIds: string[];
  selectedAmenities: SelectedBookingAmenity[];
  pricing: {
    basePrice: number;
    nightsTotal: number;
    cleaningFee: number;
    serviceFee: number;
    amenitiesFee: number;
    discount: number;
    total: number;
  };
}

export interface CheckoutGuestInput {
  fullName: string;
  phone: string;
  email: string;
  note?: string;
  paymentMethod: "momo" | "vnpay" | "card" | "hotel";
}

export interface ReservationSubmissionRequest {
  quote: BookingQuote;
  guestInfo: {
    fullName: string;
    phone: string;
    email: string;
    note?: string;
  };
  paymentMethod: "momo" | "vnpay" | "card" | "hotel";
}

export interface ReservationSubmitter {
  submit(
    request: ReservationSubmissionRequest,
    options?: { signal?: AbortSignal }
  ): Promise<BookingDetails>;
}

export interface PropertyReview {
  id: string;
  authorName: string;
  authorAvatar: string;
  rating: number;
  date: string;
  comment: string;
}

export interface Property {
  id: string;
  title: string;
  subtitle: string;
  propertyType: PropertyType;
  category: CategoryId;
  location: {
    city: string;
    province: string;
    address: string;
    distanceToCenter: string;
  };
  images: string[];
  pricePerNight: number;
  originalPrice?: number;
  rating: number;
  reviewCount: number;
  maxGuests: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  resortAmenities: PropertyAmenityOverride[];
  isSuperhost?: boolean;
  isFeatured?: boolean;
  isFlashDeal?: boolean;
  freeCancellation?: boolean;
  breakfastIncluded?: boolean;
  description: string;
  host: {
    name: string;
    avatar: string;
    joinedDate: string;
    responseRate: string;
    isSuperhost: boolean;
  };
  reviews: PropertyReview[];
}

export interface Destination {
  id: string;
  name: string;
  province: string;
  image: string;
  propertiesCount: number;
  tag: string;
  popularFor: string;
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

export type SortOption = "popular" | "price-asc" | "price-desc" | "rating-desc";

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

export type ActiveFilterChipKind =
  | "destination"
  | "category"
  | "price"
  | "propertyType"
  | "rating"
  | "amenity"
  | "freeCancellation";

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

export interface BookingDetails {
  property: Property;
  checkIn: string;
  checkOut: string;
  nights: number;
  guests: {
    adults: number;
    children: number;
    rooms: number;
  };
  pricing: {
    basePrice: number;
    nightsTotal: number;
    cleaningFee: number;
    serviceFee: number;
    amenitiesFee: number;
    discount: number;
    total: number;
  };
  selectedAmenities: SelectedBookingAmenity[];
  guestInfo: {
    fullName: string;
    email: string;
    phone: string;
    note?: string;
  };
  paymentMethod: "momo" | "vnpay" | "card" | "hotel";
  bookingId?: string;
  createdAt?: string;
}

