import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeVietnamese,
  resolvePropertyAmenities,
  groupAmenitiesByCategory,
  getPropertyAmenityCategories,
  getCardHighlightCategories,
  getFeaturedAmenities,
  filterPropertyAmenities,
  propertyHasAmenityFilters,
  createAmenitiesModalState,
  reduceAmenitiesModalState,
} from "@/lib/amenities";

test("normalizeVietnamese folds accents, đ/Đ, and case", () => {
  assert.equal(normalizeVietnamese("Đưa Đón Sân Bay"), "dua don san bay");
  assert.equal(normalizeVietnamese("Hồ bơi vô cực"), "ho boi vo cuc");
  assert.equal(normalizeVietnamese("  SPA & Thư Giãn  "), "spa & thu gian");
});

test("resolvePropertyAmenities strips inherited price when overriding paid -> free-reservation or included", () => {
  const resolved = resolvePropertyAmenities({
    resortAmenities: [
      { amenityId: "airport-shuttle", pricingType: "free-reservation", featured: true },
      { amenityId: "herbal-spa", pricingType: "included" },
      { amenityId: "unknown-amenity-id" },
    ],
  });
  assert.equal(resolved.length, 2);
  assert.equal(resolved[0].pricingType, "free-reservation");
  assert.equal(resolved[0].price, undefined);
  assert.equal(resolved[0].priceUnit, undefined);
  assert.equal(resolved[0].featured, true);
  assert.equal(resolved[1].pricingType, "included");
  assert.equal(resolved[1].price, undefined);
  assert.equal(resolved[1].priceUnit, undefined);
});

test("groupAmenitiesByCategory hides categories with zero items and preserves priority order", () => {
  const resolved = resolvePropertyAmenities({
    resortAmenities: [
      { amenityId: "high-speed-wifi" },
      { amenityId: "infinity-pool" },
    ],
  });
  const groups = groupAmenitiesByCategory(resolved);
  assert.deepEqual(
    groups.map((g) => g.category.id),
    ["pool-beach", "room-family"]
  );
  const counts = getPropertyAmenityCategories(resolved);
  assert.deepEqual(
    counts.map((c) => [c.category.id, c.count]),
    [
      ["pool-beach", 1],
      ["room-family", 1],
    ]
  );
});

test("getCardHighlightCategories returns at most 3 categories in resort priority order", () => {
  const resolved = resolvePropertyAmenities({
    resortAmenities: [
      { amenityId: "security-24h" },
      { amenityId: "high-speed-wifi" },
      { amenityId: "airport-shuttle" },
      { amenityId: "buffet-breakfast" },
      { amenityId: "infinity-pool" },
    ],
  });
  const top = getCardHighlightCategories(resolved);
  assert.deepEqual(
    top.map((c) => c.id),
    ["pool-beach", "dining", "transport"]
  );
});

test("getFeaturedAmenities prioritizes featured items then falls back to remaining", () => {
  const resolved = resolvePropertyAmenities({
    resortAmenities: [
      { amenityId: "security-24h" },
      { amenityId: "infinity-pool", featured: true },
      { amenityId: "high-speed-wifi" },
      { amenityId: "buffet-breakfast", featured: true },
    ],
  });
  const featured = getFeaturedAmenities(resolved, 3);
  assert.deepEqual(
    featured.map((a) => a.id),
    ["infinity-pool", "buffet-breakfast", "security-24h"]
  );
});

test("filterPropertyAmenities supports diacritic-insensitive query, feeFilter free (included + free-reservation), paid, and selected", () => {
  const resolved = resolvePropertyAmenities({
    resortAmenities: [
      { amenityId: "infinity-pool", pricingType: "included" },
      { amenityId: "airport-shuttle", pricingType: "free-reservation" },
      { amenityId: "herbal-spa", pricingType: "paid", price: 550000, priceUnit: "suất" },
    ],
  });
  assert.equal(filterPropertyAmenities(resolved, { query: "ho boi" }).length, 1);
  assert.equal(filterPropertyAmenities(resolved, { query: "DUA DON" }).length, 1);
  assert.equal(filterPropertyAmenities(resolved, { feeFilter: "free" }).length, 2);
  assert.equal(filterPropertyAmenities(resolved, { feeFilter: "paid" }).length, 1);
  assert.equal(
    filterPropertyAmenities(resolved, { feeFilter: "selected", selectedIds: ["herbal-spa"] }).length,
    1
  );
  assert.equal(filterPropertyAmenities(resolved, { category: "transport" }).length, 1);
});

test("propertyHasAmenityFilters uses AND semantics across filterKeys", () => {
  const prop = {
    resortAmenities: [
      { amenityId: "infinity-pool" },
      { amenityId: "airport-shuttle" },
    ],
  };
  assert.equal(propertyHasAmenityFilters(prop, []), true);
  assert.equal(propertyHasAmenityFilters(prop, ["pool", "transport-shuttle"]), true);
  assert.equal(propertyHasAmenityFilters(prop, ["pool", "spa-wellness"]), false);
});

test("reduceAmenitiesModalState returns mobile view to list on search, fee filter, category, and reset", () => {
  const openedOnDetail = createAmenitiesModalState({
    initialAmenityId: "herbal-spa",
    initialCategory: "all",
    fallbackAmenityId: "infinity-pool",
  });
  assert.equal(openedOnDetail.mobileShowDetail, true);

  const afterSearch = reduceAmenitiesModalState(openedOnDetail, {
    type: "SET_SEARCH",
    query: "spa",
  });
  assert.equal(afterSearch.searchQuery, "spa");
  assert.equal(afterSearch.mobileShowDetail, false);

  const afterSelect = reduceAmenitiesModalState(afterSearch, {
    type: "SELECT_AMENITY",
    amenityId: "herbal-spa",
  });
  assert.equal(afterSelect.mobileShowDetail, true);

  const afterFeeFilter = reduceAmenitiesModalState(afterSelect, {
    type: "SET_FEE_FILTER",
    feeFilter: "paid",
  });
  assert.equal(afterFeeFilter.feeFilter, "paid");
  assert.equal(afterFeeFilter.mobileShowDetail, false);

  const backOnDetail = reduceAmenitiesModalState(afterFeeFilter, {
    type: "SELECT_AMENITY",
    amenityId: "herbal-spa",
  });
  const afterReset = reduceAmenitiesModalState(backOnDetail, { type: "RESET_FILTERS" });
  assert.equal(afterReset.searchQuery, "");
  assert.equal(afterReset.activeCategory, "all");
  assert.equal(afterReset.feeFilter, "all");
  assert.equal(afterReset.mobileShowDetail, false);
});
