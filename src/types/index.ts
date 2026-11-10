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
  amenities: string[];
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
    discount: number;
    total: number;
  };
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

