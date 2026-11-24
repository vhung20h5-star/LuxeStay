import { asc, eq } from "drizzle-orm";
import type {
  AmenityCatalogItem,
  CatalogSnapshot,
  Property,
  PropertyAmenityOverride,
  PropertyReview,
} from "@luxestay/contracts";
import type { LuxeStayDb } from "../../db/client.js";
import {
  amenityCatalogTable,
  amenityCategoriesTable,
  amenityFilterOptionsTable,
  categoriesTable,
  destinationsTable,
  promotionsTable,
  propertiesTable,
  propertyAmenitiesTable,
  reviewsTable,
  testimonialsTable,
} from "../../db/schema/index.js";
import type { ApiCatalogRepository } from "./repository.js";

export type PropertyRow = typeof propertiesTable.$inferSelect;
export type PropertyAmenityRow = typeof propertyAmenitiesTable.$inferSelect;
export type ReviewRow = typeof reviewsTable.$inferSelect;
export type AmenityCatalogRow = typeof amenityCatalogTable.$inferSelect;

export function mapPropertyAmenityRow(row: PropertyAmenityRow): PropertyAmenityOverride {
  const override: PropertyAmenityOverride = {
    amenityId: row.amenityId,
  };
  if (row.featured !== null) override.featured = row.featured;
  if (row.name !== null) override.name = row.name;
  if (row.shortLabel !== null) override.shortLabel = row.shortLabel;
  if (row.description !== null) override.description = row.description;
  if (row.image !== null) override.image = row.image;
  if (row.hours !== null) override.hours = row.hours;
  if (row.location !== null) override.location = row.location;
  if (row.pricingType !== null) override.pricingType = row.pricingType;
  if (row.price !== null) override.price = row.price;
  if (row.priceUnit !== null) override.priceUnit = row.priceUnit;
  if (row.notes !== null) override.notes = row.notes;
  return override;
}

export function mapPropertyRowToDomain(
  row: PropertyRow,
  amenityRows: readonly PropertyAmenityRow[],
  reviewRows: readonly ReviewRow[]
): Property {
  const reviews: PropertyReview[] = reviewRows.map((rev) => ({
    id: rev.id,
    authorName: rev.authorName,
    authorAvatar: rev.authorAvatar,
    rating: rev.rating,
    date: rev.date,
    comment: rev.comment,
  }));

  return {
    id: row.id,
    title: row.title,
    subtitle: row.subtitle,
    propertyType: row.propertyType,
    category: row.category,
    location: {
      city: row.city,
      province: row.province,
      address: row.address,
      distanceToCenter: row.distanceToCenter,
    },
    images: row.images,
    pricePerNight: row.pricePerNight,
    originalPrice: row.originalPrice ?? undefined,
    rating: row.rating,
    reviewCount: row.reviewCount,
    maxGuests: row.maxGuests,
    bedrooms: row.bedrooms,
    beds: row.beds,
    bathrooms: row.bathrooms,
    resortAmenities: amenityRows.map(mapPropertyAmenityRow),
    isSuperhost: row.isSuperhost,
    isFeatured: row.isFeatured,
    isFlashDeal: row.isFlashDeal,
    freeCancellation: row.freeCancellation,
    breakfastIncluded: row.breakfastIncluded,
    description: row.description,
    host: {
      name: row.hostName,
      avatar: row.hostAvatar,
      joinedDate: row.hostJoinedDate,
      responseRate: row.hostResponseRate,
      isSuperhost: row.hostIsSuperhost,
    },
    reviews,
  };
}

export function mapAmenityCatalogRowToDomain(row: AmenityCatalogRow): AmenityCatalogItem {
  return {
    id: row.id,
    category: row.category,
    name: row.name,
    shortLabel: row.shortLabel,
    iconName: row.iconName,
    description: row.description,
    image: row.image,
    hours: row.hours,
    location: row.location,
    pricingType: row.pricingType,
    price: row.price ?? undefined,
    priceUnit: row.priceUnit ?? undefined,
    notes: row.notes ?? undefined,
    filterKeys: row.filterKeys,
  };
}

export function createPostgresCatalogRepository(db: LuxeStayDb): ApiCatalogRepository {
  return {
    async getSnapshot(): Promise<CatalogSnapshot> {
      const [
        categoryRows,
        destinationRows,
        promotionRows,
        testimonialRows,
        amenityCategoryRows,
        amenityFilterRows,
        amenityCatalogRows,
        propertyRows,
        propertyAmenityRows,
        reviewRows,
      ] = await Promise.all([
        db.select().from(categoriesTable).orderBy(asc(categoriesTable.sortOrder)),
        db.select().from(destinationsTable).orderBy(asc(destinationsTable.sortOrder)),
        db.select().from(promotionsTable).orderBy(asc(promotionsTable.sortOrder)),
        db.select().from(testimonialsTable).orderBy(asc(testimonialsTable.sortOrder)),
        db.select().from(amenityCategoriesTable).orderBy(asc(amenityCategoriesTable.sortOrder)),
        db
          .select()
          .from(amenityFilterOptionsTable)
          .orderBy(asc(amenityFilterOptionsTable.sortOrder)),
        db.select().from(amenityCatalogTable),
        db.select().from(propertiesTable).orderBy(asc(propertiesTable.sortOrder)),
        db
          .select()
          .from(propertyAmenitiesTable)
          .orderBy(asc(propertyAmenitiesTable.sortOrder)),
        db.select().from(reviewsTable).orderBy(asc(reviewsTable.sortOrder)),
      ]);

      const amenitiesByProperty = new Map<string, PropertyAmenityRow[]>();
      for (const row of propertyAmenityRows) {
        const list = amenitiesByProperty.get(row.propertyId);
        if (list) list.push(row);
        else amenitiesByProperty.set(row.propertyId, [row]);
      }

      const reviewsByProperty = new Map<string, ReviewRow[]>();
      for (const row of reviewRows) {
        const list = reviewsByProperty.get(row.propertyId);
        if (list) list.push(row);
        else reviewsByProperty.set(row.propertyId, [row]);
      }

      const amenityCatalog: Record<string, AmenityCatalogItem> = {};
      for (const row of amenityCatalogRows) {
        amenityCatalog[row.id] = mapAmenityCatalogRowToDomain(row);
      }

      return {
        properties: propertyRows.map((row) =>
          mapPropertyRowToDomain(
            row,
            amenitiesByProperty.get(row.id) ?? [],
            reviewsByProperty.get(row.id) ?? []
          )
        ),
        categories: categoryRows.map((row) => ({
          id: row.id,
          label: row.label,
          iconName: row.iconName,
          description: row.description ?? undefined,
        })),
        destinations: destinationRows.map((row) => ({
          id: row.id,
          name: row.name,
          province: row.province,
          image: row.image,
          propertiesCount: row.propertiesCount,
          tag: row.tag,
          popularFor: row.popularFor,
        })),
        amenityCategories: amenityCategoryRows.map((row) => ({
          id: row.id,
          label: row.label,
          shortLabel: row.shortLabel,
          iconName: row.iconName,
          description: row.description,
        })),
        amenityFilterOptions: amenityFilterRows.map((row) => ({
          key: row.key,
          label: row.label,
          iconName: row.iconName,
        })),
        amenityCatalog,
        promotions: {
          expiryLabel: promotionRows[0]?.expiryLabel ?? "",
          vouchers: promotionRows.map((row) => ({
            id: row.id,
            code: row.code,
            description: row.description,
            tone: row.tone,
          })),
        },
        testimonials: testimonialRows.map((row) => ({
          id: row.id,
          name: row.name,
          role: row.role,
          avatar: row.avatar,
          rating: row.rating,
          stayName: row.stayName,
          content: row.content,
          tripType: row.tripType,
        })),
      };
    },

    async getPropertyById(id: string): Promise<Property | null> {
      const normalized = id.trim();
      if (!normalized) return null;

      const rows = await db
        .select()
        .from(propertiesTable)
        .where(eq(propertiesTable.id, normalized))
        .limit(1);

      const propRow = rows[0];
      if (!propRow) return null;

      const [amenityRows, reviewRows] = await Promise.all([
        db
          .select()
          .from(propertyAmenitiesTable)
          .where(eq(propertyAmenitiesTable.propertyId, normalized))
          .orderBy(asc(propertyAmenitiesTable.sortOrder)),
        db
          .select()
          .from(reviewsTable)
          .where(eq(reviewsTable.propertyId, normalized))
          .orderBy(asc(reviewsTable.sortOrder)),
      ]);

      return mapPropertyRowToDomain(propRow, amenityRows, reviewRows);
    },
  };
}
