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

export interface Amenity {
  id: string;
  name: string;
  icon: string;
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

export interface BookingDraft {
  propertyId: string | null;
  nights: number;
  adults: number;
  selectedAmenityIds: string[];
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
  amenities: string[];
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
  propertyType?: string;
}

export interface FilterState {
  category: CategoryId;
  minPrice: number;
  maxPrice: number;
  propertyTypes: PropertyType[];
  minRating: number;
  amenities: AmenityFilterKey[];
  freeCancellationOnly: boolean;
  instantBookingOnly: boolean;
  sortBy: "popular" | "price-asc" | "price-desc" | "rating-desc";
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

