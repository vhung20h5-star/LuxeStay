import path from "node:path";
import { fileURLToPath } from "node:url";
import { SEED_CATALOG_SNAPSHOT } from "@luxestay/domain/seed";
import { createDbClient, type LuxeStayDb } from "./client.js";
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
} from "./schema/index.js";

export async function seedDatabase(db: LuxeStayDb): Promise<void> {
  const snapshot = SEED_CATALOG_SNAPSHOT;

  await db.transaction(async (tx) => {
    await tx
      .insert(categoriesTable)
      .values(
        snapshot.categories.map((cat, idx) => ({
          id: cat.id,
          label: cat.label,
          iconName: cat.iconName,
          description: cat.description ?? null,
          sortOrder: idx,
        }))
      )
      .onConflictDoNothing();

    await tx
      .insert(destinationsTable)
      .values(
        snapshot.destinations.map((dest, idx) => ({
          id: dest.id,
          name: dest.name,
          province: dest.province,
          image: dest.image,
          propertiesCount: dest.propertiesCount,
          tag: dest.tag,
          popularFor: dest.popularFor,
          sortOrder: idx,
        }))
      )
      .onConflictDoNothing();

    await tx
      .insert(promotionsTable)
      .values(
        snapshot.promotions.vouchers.map((voucher, idx) => ({
          id: voucher.id,
          code: voucher.code,
          description: voucher.description,
          tone: voucher.tone,
          expiryLabel: snapshot.promotions.expiryLabel,
          sortOrder: idx,
        }))
      )
      .onConflictDoNothing();

    await tx
      .insert(testimonialsTable)
      .values(
        snapshot.testimonials.map((item, idx) => ({
          id: item.id,
          name: item.name,
          role: item.role,
          avatar: item.avatar,
          rating: item.rating,
          stayName: item.stayName,
          content: item.content,
          tripType: item.tripType,
          sortOrder: idx,
        }))
      )
      .onConflictDoNothing();

    await tx
      .insert(amenityCategoriesTable)
      .values(
        snapshot.amenityCategories.map((cat, idx) => ({
          id: cat.id,
          label: cat.label,
          shortLabel: cat.shortLabel,
          iconName: cat.iconName,
          description: cat.description,
          sortOrder: idx,
        }))
      )
      .onConflictDoNothing();

    await tx
      .insert(amenityFilterOptionsTable)
      .values(
        snapshot.amenityFilterOptions.map((opt, idx) => ({
          key: opt.key,
          label: opt.label,
          iconName: opt.iconName,
          sortOrder: idx,
        }))
      )
      .onConflictDoNothing();

    await tx
      .insert(amenityCatalogTable)
      .values(
        Object.values(snapshot.amenityCatalog).map((item) => ({
          id: item.id,
          category: item.category,
          name: item.name,
          shortLabel: item.shortLabel,
          iconName: item.iconName,
          description: item.description,
          image: item.image,
          hours: item.hours,
          location: item.location,
          pricingType: item.pricingType,
          price: item.price ?? null,
          priceUnit: item.priceUnit ?? null,
          notes: item.notes ?? null,
          filterKeys: item.filterKeys,
        }))
      )
      .onConflictDoNothing();

    await tx
      .insert(propertiesTable)
      .values(
        snapshot.properties.map((prop, idx) => ({
          id: prop.id,
          title: prop.title,
          subtitle: prop.subtitle,
          propertyType: prop.propertyType,
          category: prop.category,
          city: prop.location.city,
          province: prop.location.province,
          address: prop.location.address,
          distanceToCenter: prop.location.distanceToCenter,
          images: prop.images,
          pricePerNight: prop.pricePerNight,
          originalPrice: prop.originalPrice ?? null,
          rating: prop.rating,
          reviewCount: prop.reviewCount,
          maxGuests: prop.maxGuests,
          bedrooms: prop.bedrooms,
          beds: prop.beds,
          bathrooms: prop.bathrooms,
          isSuperhost: Boolean(prop.isSuperhost),
          isFeatured: Boolean(prop.isFeatured),
          isFlashDeal: Boolean(prop.isFlashDeal),
          freeCancellation: Boolean(prop.freeCancellation),
          breakfastIncluded: Boolean(prop.breakfastIncluded),
          description: prop.description,
          hostName: prop.host.name,
          hostAvatar: prop.host.avatar,
          hostJoinedDate: prop.host.joinedDate,
          hostResponseRate: prop.host.responseRate,
          hostIsSuperhost: prop.host.isSuperhost,
          sortOrder: idx,
        }))
      )
      .onConflictDoNothing();

    const amenityOverrideRows = snapshot.properties.flatMap((prop) =>
      prop.resortAmenities.map((override, idx) => ({
        propertyId: prop.id,
        amenityId: override.amenityId,
        sortOrder: idx,
        featured: override.featured ?? null,
        name: override.name ?? null,
        shortLabel: override.shortLabel ?? null,
        description: override.description ?? null,
        image: override.image ?? null,
        hours: override.hours ?? null,
        location: override.location ?? null,
        pricingType: override.pricingType ?? null,
        price: override.price ?? null,
        priceUnit: override.priceUnit ?? null,
        notes: override.notes ?? null,
      }))
    );

    if (amenityOverrideRows.length > 0) {
      await tx.insert(propertyAmenitiesTable).values(amenityOverrideRows).onConflictDoNothing();
    }

    const reviewRows = snapshot.properties.flatMap((prop) =>
      prop.reviews.map((review, idx) => ({
        id: review.id,
        propertyId: prop.id,
        authorName: review.authorName,
        authorAvatar: review.authorAvatar,
        rating: review.rating,
        date: review.date,
        comment: review.comment,
        sortOrder: idx,
      }))
    );

    if (reviewRows.length > 0) {
      await tx.insert(reviewsTable).values(reviewRows).onConflictDoNothing();
    }
  });
}

async function main() {
  const databaseUrl =
    process.env.DATABASE_URL ??
    "postgresql://postgres:postgres@localhost:5434/luxestay";

  const client = createDbClient(databaseUrl);
  try {
    console.log("[luxestay-api] Seeding PostgreSQL database from @luxestay/domain/seed...");
    await seedDatabase(client.db);
    console.log("[luxestay-api] Seed completed idempotently.");
  } finally {
    await client.close();
  }
}

const currentFilePath = path.resolve(fileURLToPath(import.meta.url));
const entryFilePath = process.argv[1] ? path.resolve(process.argv[1]) : "";
const isDirectEntry =
  process.platform === "win32"
    ? currentFilePath.toLowerCase() === entryFilePath.toLowerCase()
    : currentFilePath === entryFilePath;

if (isDirectEntry) {
  main().catch((err) => {
    console.error("[luxestay-api] Seed failed:", err);
    process.exit(1);
  });
}
