import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  AMENITY_CATALOG,
  AMENITY_FILTER_OPTIONS,
  DESTINATIONS,
  PROMOTION_CAMPAIGNS,
  PROPERTIES,
  RETIRED_SEED_CAMPAIGN_IMAGES,
  RETIRED_SEED_DESTINATION_IMAGES,
  RETIRED_SEED_PROPERTY_IMAGES,
} from "../dist/seed/index.js";
import {
  createDefaultCatalogQuery,
  executeCatalogQuery,
  projectPropertyAmenities,
  propertyHasAmenityFilters,
} from "../dist/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB_PUBLIC_DIR = path.resolve(__dirname, "../../../apps/web/public");

const ALLOWED_IMAGE_PATTERN =
  /^(https:\/\/images\.unsplash\.com\/photo-[a-zA-Z0-9-]+|https:\/\/images\.pexels\.com\/photos\/\d+\/pexels-photo-\d+|\/images\/(stays|destinations)\/[a-z0-9-]+\.(jpg|jpeg|webp|png))/;

function normalizeMediaKey(src: string): string {
  const withoutQuery = src.split("?")[0] ?? src;
  const pexelsMatch = withoutQuery.match(/^https:\/\/images\.pexels\.com\/photos\/(\d+)\//);
  if (pexelsMatch) return `pexels:${pexelsMatch[1]}`;
  return withoutQuery;
}

function assertValidSeedImageSource(ownerLabel: string, src: string): void {
  assert.ok(
    ALLOWED_IMAGE_PATTERN.test(src),
    `${ownerLabel} has unsupported image source: ${src}`
  );
  if (src.startsWith("/images/")) {
    const filePath = path.join(WEB_PUBLIC_DIR, src.replace(/^\//, ""));
    assert.ok(
      fs.existsSync(filePath),
      `${ownerLabel} references missing local image asset: ${filePath}`
    );
  }
}

test("all 42 properties have valid, duplicate-free resortAmenities, no legacy amenities array, and >= 4 featured items", () => {
  assert.equal(PROPERTIES.length, 42);
  assert.equal(new Set(PROPERTIES.map((p) => p.id)).size, 42);

  const reviewIds = PROPERTIES.flatMap((p) => p.reviews.map((r) => r.id));
  assert.equal(new Set(reviewIds).size, reviewIds.length, "Duplicate review ID detected in seed");

  const typeCounts = new Map<string, number>();
  const categoryCounts = new Map<string, number>();
  const globalMediaUsage = new Map<string, string>();

  for (const prop of PROPERTIES) {
    typeCounts.set(prop.propertyType, (typeCounts.get(prop.propertyType) ?? 0) + 1);
    categoryCounts.set(prop.category, (categoryCounts.get(prop.category) ?? 0) + 1);
    assert.ok(prop.images.length >= 3, `${prop.id} should have at least 3 images`);
    prop.images.forEach((img, idx) => {
      const slot = `${prop.id}[${idx}]`;
      assertValidSeedImageSource(slot, img);
      const key = normalizeMediaKey(img);
      const prevOwner = globalMediaUsage.get(key);
      assert.equal(
        prevOwner,
        undefined,
        `Duplicate image detected: ${slot} reuses ${key} already assigned to ${prevOwner}`
      );
      globalMediaUsage.set(key, slot);
    });
  }

  for (const dest of DESTINATIONS) {
    const slot = `destination:${dest.id}`;
    assertValidSeedImageSource(slot, dest.image);
    const key = normalizeMediaKey(dest.image);
    const prevOwner = globalMediaUsage.get(key);
    assert.equal(
      prevOwner,
      undefined,
      `Duplicate image detected: ${slot} reuses ${key} already assigned to ${prevOwner}`
    );
    globalMediaUsage.set(key, slot);
  }

  for (const camp of PROMOTION_CAMPAIGNS) {
    const slot = `campaign:${camp.slug}`;
    assertValidSeedImageSource(slot, camp.image);
    const key = normalizeMediaKey(camp.image);
    const prevOwner = globalMediaUsage.get(key);
    assert.equal(
      prevOwner,
      undefined,
      `Duplicate image detected: ${slot} reuses ${key} already assigned to ${prevOwner}`
    );
    globalMediaUsage.set(key, slot);
  }

  const totalSlots =
    PROPERTIES.reduce((sum, p) => sum + p.images.length, 0) +
    DESTINATIONS.length +
    PROMOTION_CAMPAIGNS.length;
  assert.equal(
    globalMediaUsage.size,
    totalSlots,
    `Expected 100% unique images (${totalSlots}), got ${globalMediaUsage.size}`
  );

  const propIds = new Set(PROPERTIES.map((p) => p.id));
  const destIds = new Set(DESTINATIONS.map((d) => d.id));
  const campIds = new Set(PROMOTION_CAMPAIGNS.map((c) => c.id));
  for (const id of Object.keys(RETIRED_SEED_PROPERTY_IMAGES)) {
    assert.ok(propIds.has(id), `Unknown property ID in RETIRED_SEED_PROPERTY_IMAGES: ${id}`);
  }
  for (const id of Object.keys(RETIRED_SEED_DESTINATION_IMAGES)) {
    assert.ok(destIds.has(id), `Unknown destination ID in RETIRED_SEED_DESTINATION_IMAGES: ${id}`);
  }
  for (const id of Object.keys(RETIRED_SEED_CAMPAIGN_IMAGES)) {
    assert.ok(campIds.has(id), `Unknown campaign ID in RETIRED_SEED_CAMPAIGN_IMAGES: ${id}`);
  }

  for (const requiredType of ["homestay", "hotel", "villa", "resort", "glamping"]) {
    assert.ok(
      (typeCounts.get(requiredType) ?? 0) >= 6,
      `Expected >= 6 properties of type ${requiredType}, got ${typeCounts.get(requiredType) ?? 0}`
    );
  }
  for (const requiredCategory of [
    "mountain-view",
    "beachfront",
    "vintage-homestay",
    "infinity-pool",
    "ecolodge",
    "pine-forest",
    "city-center",
    "luxury-resort",
  ]) {
    assert.ok(
      (categoryCounts.get(requiredCategory) ?? 0) >= 3,
      `Expected >= 3 properties in category ${requiredCategory}, got ${categoryCounts.get(requiredCategory) ?? 0}`
    );
  }

  const defaultQuery = executeCatalogQuery(PROPERTIES, createDefaultCatalogQuery());
  assert.equal(defaultQuery.items[0]?.id, "stay-08");

  for (const prop of PROPERTIES) {
    assert.equal("amenities" in prop, false, `${prop.id} must not carry legacy amenities array`);
    assert.ok(
      prop.resortAmenities && prop.resortAmenities.length >= 10,
      `${prop.id} has too few amenities`
    );

    const ids = prop.resortAmenities.map((a) => a.amenityId);
    assert.equal(new Set(ids).size, ids.length, `Duplicate amenityId in ${prop.id}`);

    for (const entry of prop.resortAmenities) {
      assert.ok(
        AMENITY_CATALOG[entry.amenityId],
        `Unknown amenityId "${entry.amenityId}" in ${prop.id}`
      );
    }

    const projection = projectPropertyAmenities(prop);
    const resolved = projection.all;
    const featured = resolved.filter((a) => a.featured);
    assert.ok(featured.length >= 4, `${prop.id} needs >= 4 featured amenities`);

    const selectable = resolved.filter(
      (a) => a.pricingType === "paid" || a.pricingType === "free-reservation"
    );
    assert.ok(selectable.length >= 2, `${prop.id} needs >= 2 selectable add-on/reservation items`);

    const groups = projection.groups;
    if (
      prop.propertyType === "resort" ||
      prop.propertyType === "hotel" ||
      prop.propertyType === "villa"
    ) {
      assert.ok(
        resolved.length >= 14,
        `${prop.id} (${prop.propertyType}) needs >= 14 amenities, got ${resolved.length}`
      );
      assert.ok(
        groups.length >= 6,
        `${prop.id} (${prop.propertyType}) needs >= 6 categories, got ${groups.length}`
      );
    } else {
      assert.ok(
        groups.length >= 4,
        `${prop.id} (${prop.propertyType}) needs >= 4 categories, got ${groups.length}`
      );
    }
  }
});

test("Hanoi Old Quarter homestay (stay-09) authentically omits pool-beach category", () => {
  const stay09 = PROPERTIES.find((p) => p.id === "stay-09");
  assert.ok(stay09);
  const { groups } = projectPropertyAmenities(stay09);
  assert.equal(
    groups.some((g) => g.category.id === "pool-beach"),
    false
  );
});

test("every homepage AMENITY_FILTER_OPTIONS key matches at least 1 property", () => {
  for (const opt of AMENITY_FILTER_OPTIONS) {
    const matches = PROPERTIES.filter((p) => propertyHasAmenityFilters(p, [opt.key]));
    assert.ok(matches.length >= 1, `Filter option "${opt.key}" matched 0 properties`);
  }
});

test("every property displaying a pool-beach highlight chip actually matches pool or beach filters", () => {
  for (const prop of PROPERTIES) {
    const { cardHighlights } = projectPropertyAmenities(prop);
    const showsPoolBeach = cardHighlights.some((c) => c.id === "pool-beach");
    if (showsPoolBeach) {
      const hasPoolOrBeach =
        propertyHasAmenityFilters(prop, ["pool"]) || propertyHasAmenityFilters(prop, ["beach"]);
      assert.equal(
        hasPoolOrBeach,
        true,
        `${prop.id} displays pool-beach highlight chip without offering a pool or beach`
      );
    }
  }
});

test("overridden property amenities do not inherit contradictory location, hours, or heating copy", () => {
  const stay03 = PROPERTIES.find((p) => p.id === "stay-03")!;
  const stay07 = PROPERTIES.find((p) => p.id === "stay-07")!;
  const stay12 = PROPERTIES.find((p) => p.id === "stay-12")!;

  const stay03Projection = projectPropertyAmenities(stay03);
  const stay07Projection = projectPropertyAmenities(stay07);
  const stay12Projection = projectPropertyAmenities(stay12);

  const s03Lounge = stay03Projection.byId.get("sky-lounge-bar")!;
  assert.equal(s03Lounge.location.toLowerCase().includes("ven biển"), false);

  const s03Heater = stay03Projection.byId.get("wood-fireplace")!;
  assert.equal((s03Heater.notes ?? "").toLowerCase().includes("nhóm lửa"), false);

  const s07Loungers = stay07Projection.byId.get("sun-loungers")!;
  assert.equal(s07Loungers.location.toLowerCase().includes("bãi cát"), false);

  const s12Shuttle = stay12Projection.byId.get("airport-shuttle")!;
  assert.equal(s12Shuttle.hours.toLowerCase().includes("giờ bay"), false);

  const s12Heater = stay12Projection.byId.get("wood-fireplace")!;
  assert.equal((s12Heater.notes ?? "").toLowerCase().includes("nhóm lửa"), false);
});
