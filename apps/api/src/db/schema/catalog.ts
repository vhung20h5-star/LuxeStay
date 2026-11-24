import {
  boolean,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  real,
  text,
} from "drizzle-orm/pg-core";
import type {
  AmenityCategoryId,
  AmenityFilterKey,
  AmenityPricingType,
  CategoryId,
  PropertyType,
} from "@luxestay/contracts";

export const categoriesTable = pgTable("categories", {
  id: text("id").$type<CategoryId>().primaryKey(),
  label: text("label").notNull(),
  iconName: text("icon_name").notNull(),
  description: text("description"),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const destinationsTable = pgTable("destinations", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  province: text("province").notNull(),
  image: text("image").notNull(),
  propertiesCount: integer("properties_count").notNull().default(0),
  tag: text("tag").notNull(),
  popularFor: text("popular_for").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const promotionsTable = pgTable("promotions", {
  id: text("id").primaryKey(),
  code: text("code").notNull().unique(),
  description: text("description").notNull(),
  tone: text("tone").$type<"emerald" | "amber">().notNull(),
  expiryLabel: text("expiry_label").notNull(),
  discountType: text("discount_type").$type<"fixed" | "percent">().notNull().default("fixed"),
  discountValue: integer("discount_value").notNull().default(0),
  minOrderTotal: integer("min_order_total").notNull().default(0),
  maxDiscount: integer("max_discount"),
  expiresAt: text("expires_at").notNull().default("2026-11-30T23:59:59.000Z"),
  isActive: boolean("is_active").notNull().default(true),
  memberOnly: boolean("member_only").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const testimonialsTable = pgTable("testimonials", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  role: text("role").notNull(),
  avatar: text("avatar").notNull(),
  rating: real("rating").notNull(),
  stayName: text("stay_name").notNull(),
  content: text("content").notNull(),
  tripType: text("trip_type").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const amenityCategoriesTable = pgTable("amenity_categories", {
  id: text("id").$type<AmenityCategoryId>().primaryKey(),
  label: text("label").notNull(),
  shortLabel: text("short_label").notNull(),
  iconName: text("icon_name").notNull(),
  description: text("description").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const amenityFilterOptionsTable = pgTable("amenity_filter_options", {
  key: text("key").$type<AmenityFilterKey>().primaryKey(),
  label: text("label").notNull(),
  iconName: text("icon_name").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const amenityCatalogTable = pgTable("amenity_catalog", {
  id: text("id").primaryKey(),
  category: text("category")
    .$type<AmenityCategoryId>()
    .notNull()
    .references(() => amenityCategoriesTable.id),
  name: text("name").notNull(),
  shortLabel: text("short_label").notNull(),
  iconName: text("icon_name").notNull(),
  description: text("description").notNull(),
  image: text("image").notNull(),
  hours: text("hours").notNull(),
  location: text("location").notNull(),
  pricingType: text("pricing_type").$type<AmenityPricingType>().notNull(),
  price: integer("price"),
  priceUnit: text("price_unit"),
  notes: text("notes"),
  filterKeys: jsonb("filter_keys").$type<AmenityFilterKey[]>().notNull(),
});

export const propertiesTable = pgTable("properties", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  subtitle: text("subtitle").notNull(),
  propertyType: text("property_type").$type<PropertyType>().notNull(),
  category: text("category").$type<CategoryId>().notNull(),
  city: text("city").notNull(),
  province: text("province").notNull(),
  address: text("address").notNull(),
  distanceToCenter: text("distance_to_center").notNull(),
  images: jsonb("images").$type<string[]>().notNull(),
  pricePerNight: integer("price_per_night").notNull(),
  originalPrice: integer("original_price"),
  rating: real("rating").notNull(),
  reviewCount: integer("review_count").notNull().default(0),
  maxGuests: integer("max_guests").notNull(),
  bedrooms: integer("bedrooms").notNull(),
  beds: integer("beds").notNull(),
  bathrooms: integer("bathrooms").notNull(),
  isSuperhost: boolean("is_superhost").notNull().default(false),
  isFeatured: boolean("is_featured").notNull().default(false),
  isFlashDeal: boolean("is_flash_deal").notNull().default(false),
  freeCancellation: boolean("free_cancellation").notNull().default(false),
  breakfastIncluded: boolean("breakfast_included").notNull().default(false),
  description: text("description").notNull(),
  hostName: text("host_name").notNull(),
  hostAvatar: text("host_avatar").notNull(),
  hostJoinedDate: text("host_joined_date").notNull(),
  hostResponseRate: text("host_response_rate").notNull(),
  hostIsSuperhost: boolean("host_is_superhost").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const propertyAmenitiesTable = pgTable(
  "property_amenities",
  {
    propertyId: text("property_id")
      .notNull()
      .references(() => propertiesTable.id, { onDelete: "cascade" }),
    amenityId: text("amenity_id")
      .notNull()
      .references(() => amenityCatalogTable.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(0),
    featured: boolean("featured"),
    name: text("name"),
    shortLabel: text("short_label"),
    description: text("description"),
    image: text("image"),
    hours: text("hours"),
    location: text("location"),
    pricingType: text("pricing_type").$type<AmenityPricingType>(),
    price: integer("price"),
    priceUnit: text("price_unit"),
    notes: text("notes"),
  },
  (table) => [primaryKey({ columns: [table.propertyId, table.amenityId] })]
);

export const reviewsTable = pgTable("reviews", {
  id: text("id").primaryKey(),
  propertyId: text("property_id")
    .notNull()
    .references(() => propertiesTable.id, { onDelete: "cascade" }),
  authorName: text("author_name").notNull(),
  authorAvatar: text("author_avatar").notNull(),
  rating: real("rating").notNull(),
  date: text("date").notNull(),
  comment: text("comment").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});
