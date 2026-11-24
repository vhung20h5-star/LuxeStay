import test from "node:test";
import assert from "node:assert/strict";
import {
  AMENITY_CATEGORIES,
  AMENITY_FILTER_OPTIONS,
  AMENITY_CATALOG,
} from "../dist/seed/index.js";

test("defines all 7 standardized categories in priority order", () => {
  assert.deepEqual(
    AMENITY_CATEGORIES.map((c) => c.id),
    [
      "pool-beach",
      "sports-recreation",
      "dining",
      "hotel-spa",
      "transport",
      "room-family",
      "security-general",
    ]
  );
});

test("defines all 9 standardized homepage filter options", () => {
  assert.equal(AMENITY_FILTER_OPTIONS.length, 9);
  const uniqueKeys = new Set(AMENITY_FILTER_OPTIONS.map((o) => o.key));
  assert.equal(uniqueKeys.size, 9);
});

test("every catalog amenity has valid category, Unsplash image, filterKeys, and pricing metadata", () => {
  const categoryIds = new Set(AMENITY_CATEGORIES.map((c) => c.id));
  const filterKeys = new Set(AMENITY_FILTER_OPTIONS.map((o) => o.key));
  const items = Object.values(AMENITY_CATALOG);

  assert.ok(items.length >= 38, `Expected >= 38 catalog items, got ${items.length}`);

  for (const [key, item] of Object.entries(AMENITY_CATALOG)) {
    assert.equal(item.id, key);
    assert.ok(categoryIds.has(item.category), `Invalid category on ${key}`);
    assert.ok(
      item.image.startsWith("https://images.unsplash.com/"),
      `Image must use images.unsplash.com on ${key}`
    );
    assert.ok(
      item.hours.length > 0 && item.location.length > 0 && item.description.length > 15,
      `Missing metadata on ${key}`
    );
    for (const fk of item.filterKeys) {
      assert.ok(filterKeys.has(fk), `Unknown filterKey ${fk} on ${key}`);
    }
    if (item.pricingType === "paid") {
      assert.ok(
        typeof item.price === "number" && item.price > 0,
        `Paid item ${key} needs positive price`
      );
      assert.ok(item.priceUnit && item.priceUnit.length > 0, `Paid item ${key} needs priceUnit`);
    }
  }
});
