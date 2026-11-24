import test from "node:test";
import assert from "node:assert/strict";
import { DESTINATIONS } from "../dist/seed/index.js";
import { PROPERTIES } from "../dist/seed/index.js";
import {
  DEFAULT_MIN_PRICE,
  DEFAULT_MAX_PRICE,
  PRICE_SLIDER_MIN,
  PRICE_SLIDER_STEP,
  PRICE_RANGE_PRESETS,
  QUICK_SEARCH_TRENDS,
  QUICK_DATE_PRESETS,
  getQuickDatePresets,
  filterDestinations,
  resolveFavoriteProperties,
  formatSearchDateRange,
  createDefaultCatalogQuery,
  setQueryDestination,
  setQueryDates,
  adjustQueryGuests,
  setQueryCategory,
  setQueryPropertyTypeTab,
  toggleQueryPropertyType,
  setQueryPriceRange,
  setQueryMinRating,
  toggleQueryAmenity,
  setQueryFreeCancellation,
  setQuerySortBy,
  applyQuickSearchTrend,
  removeActiveFilterChip,
  executeCatalogQuery,
  serializeCatalogQueryToSearchParams,
  parseCatalogQueryFromSearchParams,
} from "../dist/index.js";

test("destination filtering supports Vietnamese diacritic-insensitive matching across city, province, address, and title", () => {
  const base = createDefaultCatalogQuery();

  const daLat = executeCatalogQuery(PROPERTIES, setQueryDestination(base, "da lat"));
  assert.ok(daLat.items.length >= 3);
  assert.ok(daLat.items.every((p) => p.location.city === "Đà Lạt"));

  const phuQuoc = executeCatalogQuery(PROPERTIES, setQueryDestination(base, "PHU QUOC"));
  assert.equal(phuQuoc.items.length, 2);
  assert.ok(phuQuoc.items.every((p) => p.location.city === "Phú Quốc"));

  const daNang = executeCatalogQuery(PROPERTIES, setQueryDestination(base, "da nang"));
  assert.equal(daNang.items.length, 1);
  assert.equal(daNang.items[0].location.city, "Đà Nẵng");
});

test("every QUICK_SEARCH_TRENDS entry matches >= 1 property and switching trends clears conflicting filters", () => {
  assert.ok(QUICK_SEARCH_TRENDS.length >= 5);

  let state = createDefaultCatalogQuery();
  for (const trend of QUICK_SEARCH_TRENDS) {
    state = applyQuickSearchTrend(state, trend);
    const res = executeCatalogQuery(PROPERTIES, state);
    assert.ok(
      res.items.length >= 1,
      `Trend "${trend.label}" matched 0 properties after switching from previous trend`
    );
  }

  // Specifically test Đà Lạt săn mây -> Phú Quốc resort (must not keep mountain-view category!)
  const t1 = QUICK_SEARCH_TRENDS.find((t) => t.id === "dalat-clouds")!;
  const t2 = QUICK_SEARCH_TRENDS.find((t) => t.id === "phuquoc-resort")!;
  let q = applyQuickSearchTrend(createDefaultCatalogQuery(), t1);
  assert.equal(q.filters.category, "mountain-view");
  q = applyQuickSearchTrend(q, t2);
  assert.equal(q.search.destination, "Phú Quốc");
  assert.equal(q.filters.category, "all");
  assert.deepEqual(q.filters.propertyTypes, ["resort"]);
  assert.ok(executeCatalogQuery(PROPERTIES, q).items.length >= 1);
});

test("minPrice and maxPrice filtering enforces both bounds, clamps safely, and every price preset matches properties", () => {
  for (const preset of PRICE_RANGE_PRESETS) {
    const q = setQueryPriceRange(createDefaultCatalogQuery(), preset.minPrice, preset.maxPrice);
    const res = executeCatalogQuery(PROPERTIES, q);
    assert.ok(res.items.length >= 1, `Price preset "${preset.label}" matched 0 properties`);
    for (const p of res.items) {
      assert.ok(
        p.pricePerNight >= preset.minPrice && p.pricePerNight <= preset.maxPrice,
        `${p.id} price ${p.pricePerNight} outside ${preset.minPrice}..${preset.maxPrice}`
      );
    }
  }

  // Dragging maxPrice below current minPrice pulls minPrice down safely so min <= max always holds
  const highBand = setQueryPriceRange(createDefaultCatalogQuery(), 5000000, DEFAULT_MAX_PRICE);
  const lowered = setQueryPriceRange(highBand, highBand.filters.minPrice, 2000000);
  assert.equal(lowered.filters.minPrice, 0);
  assert.equal(lowered.filters.maxPrice, 2000000);
});

test("sortBy orders results deterministically and full reset restores sortBy and propertyType tab", () => {
  const asc = executeCatalogQuery(
    PROPERTIES,
    setQuerySortBy(createDefaultCatalogQuery(), "price-asc")
  );
  for (let i = 1; i < asc.items.length; i++) {
    assert.ok(asc.items[i - 1].pricePerNight <= asc.items[i].pricePerNight);
  }

  const desc = executeCatalogQuery(
    PROPERTIES,
    setQuerySortBy(createDefaultCatalogQuery(), "price-desc")
  );
  for (let i = 1; i < desc.items.length; i++) {
    assert.ok(desc.items[i - 1].pricePerNight >= desc.items[i].pricePerNight);
  }

  const byRating = executeCatalogQuery(
    PROPERTIES,
    setQuerySortBy(createDefaultCatalogQuery(), "rating-desc")
  );
  for (let i = 1; i < byRating.items.length; i++) {
    assert.ok(byRating.items[i - 1].rating >= byRating.items[i].rating);
  }

  // Multi-select property types sets activePropertyTypeTab to "all"; single select mirrors tab
  let q = setQueryPropertyTypeTab(createDefaultCatalogQuery(), "resort");
  assert.equal(executeCatalogQuery(PROPERTIES, q).activePropertyTypeTab, "resort");
  q = toggleQueryPropertyType(q, "villa");
  assert.equal(executeCatalogQuery(PROPERTIES, q).activePropertyTypeTab, "all");

  // Full reset restores sortBy to "popular" and tab to "all"
  const fresh = createDefaultCatalogQuery();
  assert.equal(fresh.filters.sortBy, "popular");
  assert.equal(fresh.filters.minPrice, DEFAULT_MIN_PRICE);
  assert.equal(fresh.filters.maxPrice, DEFAULT_MAX_PRICE);
});

test("activeFilterCount and removeActiveFilterChip round-trip cleanly across all filter criteria", () => {
  let q = createDefaultCatalogQuery();
  q = setQueryDestination(q, "Phú Quốc");
  q = setQueryCategory(q, "infinity-pool");
  q = setQueryPriceRange(q, 1000000, 5000000);
  q = toggleQueryPropertyType(q, "resort");
  q = toggleQueryPropertyType(q, "villa");
  q = setQueryMinRating(q, 4.8);
  q = toggleQueryAmenity(q, "pool");
  q = toggleQueryAmenity(q, "beach");
  q = setQueryFreeCancellation(q, true);

  const res = executeCatalogQuery(PROPERTIES, q);
  // FilterModal count: 2 propertyTypes + 1 rating + 2 amenities + 1 freeCancel + 1 price = 7
  assert.equal(res.activeFilterCount, 7);
  // Chips include destination + category + the 7 modal filters = 9 chips
  assert.equal(res.activeChips.length, 9);

  // Removing every chip one by one brings state cleanly back to 0 chips & 0 filter count
  let current = q;
  for (const chip of res.activeChips) {
    current = removeActiveFilterChip(current, chip);
  }
  const afterClear = executeCatalogQuery(PROPERTIES, current);
  assert.equal(afterClear.activeChips.length, 0);
  assert.equal(afterClear.activeFilterCount, 0);
  assert.equal(afterClear.items.length, PROPERTIES.length);
});

test("adjustQueryGuests and setQueryDates enforce safe bounds and filter capacity", () => {
  let q = createDefaultCatalogQuery();
  q = adjustQueryGuests(q, "adults", -5);
  assert.equal(q.search.guests.adults, 1);
  q = adjustQueryGuests(q, "children", -3);
  assert.equal(q.search.guests.children, 0);
  q = adjustQueryGuests(q, "rooms", -2);
  assert.equal(q.search.guests.rooms, 1);

  q = adjustQueryGuests(q, "adults", 4); // 5 adults -> only properties with maxGuests >= 5 (stay-02: 6)
  const bigGroup = executeCatalogQuery(PROPERTIES, q);
  assert.equal(bigGroup.items.length, 1);
  assert.equal(bigGroup.items[0].id, "stay-02");

  const withDates = setQueryDates(q, { checkIn: "25/12", checkOut: "28/12" });
  assert.equal(withDates.search.checkIn, "25/12");
  assert.equal(withDates.search.checkOut, "28/12");
});

test("price slider grid aligns exactly with DEFAULT_MAX_PRICE and every PRICE_RANGE_PRESETS maxPrice", () => {
  assert.equal((DEFAULT_MAX_PRICE - PRICE_SLIDER_MIN) % PRICE_SLIDER_STEP, 0);
  for (const preset of PRICE_RANGE_PRESETS) {
    assert.equal(
      (preset.maxPrice - PRICE_SLIDER_MIN) % PRICE_SLIDER_STEP,
      0,
      `Preset "${preset.label}" maxPrice ${preset.maxPrice} is off-grid for min=${PRICE_SLIDER_MIN}, step=${PRICE_SLIDER_STEP}`
    );
  }
});

test("QUICK_DATE_PRESETS use ISO dates and setQueryDates clears stale non-ISO or backwards checkOut", () => {
  assert.ok(QUICK_DATE_PRESETS.length >= 4);
  for (const p of QUICK_DATE_PRESETS) {
    assert.match(p.checkIn, /^\d{4}-\d{2}-\d{2}$/);
    assert.match(p.checkOut, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(p.checkOut > p.checkIn);
  }

  // Legacy DD/MM checkOut is cleared when switching checkIn to ISO
  let q = setQueryDates(createDefaultCatalogQuery(), { checkIn: "14/11", checkOut: "15/11" });
  q = setQueryDates(q, { checkIn: "2026-12-20" });
  assert.equal(q.search.checkIn, "2026-12-20");
  assert.equal(q.search.checkOut, "");

  // Backwards ISO checkOut (<= checkIn) is cleared when checkIn moves past checkOut
  q = setQueryDates(createDefaultCatalogQuery(), {
    checkIn: "2026-12-10",
    checkOut: "2026-12-15",
  });
  q = setQueryDates(q, { checkIn: "2026-12-18" });
  assert.equal(q.search.checkIn, "2026-12-18");
  assert.equal(q.search.checkOut, "");

  assert.equal(formatSearchDateRange("2026-12-25", "2026-12-28"), "25/12/2026 - 28/12/2026");
  assert.equal(formatSearchDateRange("2026-12-25", ""), "Từ 25/12/2026");
});

test("getQuickDatePresets computes dynamic ISO ranges relative to baseDate and filterDestinations / resolveFavoriteProperties isolate UI queries", () => {
  const presets = getQuickDatePresets(new Date(2027, 4, 10)); // Mon 10/05/2027
  assert.equal(presets.length, 4);
  assert.equal(presets[0].checkIn, "2027-05-15");
  assert.equal(presets[0].checkOut, "2027-05-16");
  assert.equal(presets[3].checkIn, "2027-12-25");
  assert.equal(presets[3].checkOut, "2027-12-28");

  // filterDestinations matches diacritic-insensitively on name, province, and popularFor
  const matched = filterDestinations(DESTINATIONS, "lam dong");
  assert.equal(matched.length, 1);
  assert.equal(matched[0].id, "da-lat");
  assert.equal(filterDestinations(DESTINATIONS, "   ").length, DESTINATIONS.length);

  // resolveFavoriteProperties returns matching properties without UI importing PROPERTIES directly
  const saved = resolveFavoriteProperties(PROPERTIES, ["stay-02", "unknown-id", "stay-01"]);
  assert.deepEqual(
    saved.map((p) => p.id),
    ["stay-01", "stay-02"]
  );
  assert.deepEqual(resolveFavoriteProperties(PROPERTIES, []), []);
});

test("serializeCatalogQueryToSearchParams and parseCatalogQueryFromSearchParams round-trip cleanly and sanitize invalid URL params", () => {
  // Default query serializes to completely clean empty search params
  assert.equal(serializeCatalogQueryToSearchParams(createDefaultCatalogQuery()).toString(), "");

  let query = createDefaultCatalogQuery();
  query = setQueryDestination(query, "Phú Quốc");
  query = setQueryDates(query, { checkIn: "2026-12-20", checkOut: "2026-12-23" });
  query = adjustQueryGuests(query, "adults", 2);
  query = adjustQueryGuests(query, "children", 1);
  query = adjustQueryGuests(query, "rooms", 1);
  query = setQueryCategory(query, "beachfront");
  query = setQueryPriceRange(query, 1000000, 5000000);
  query = toggleQueryPropertyType(query, "resort");
  query = toggleQueryPropertyType(query, "villa");
  query = setQueryMinRating(query, 4.8);
  query = toggleQueryAmenity(query, "pool");
  query = toggleQueryAmenity(query, "beach");
  query = setQueryFreeCancellation(query, true);
  query = setQuerySortBy(query, "price-asc");

  const serialized = serializeCatalogQueryToSearchParams(query);
  const restored = parseCatalogQueryFromSearchParams(serialized.toString());
  assert.deepEqual(restored, query);

  // Malformed/hostile URL params fall back safely without throwing
  const sanitized = parseCatalogQueryFromSearchParams(
    "?category=invalid&types=resort,bogus,resort&amenities=pool,fake&minPrice=abc&maxPrice=999999999&rating=99&adults=-5&sort=unknown&freeCancel=true"
  );
  assert.equal(sanitized.filters.category, "all");
  assert.deepEqual(sanitized.filters.propertyTypes, ["resort"]);
  assert.deepEqual(sanitized.filters.amenities, ["pool"]);
  assert.equal(sanitized.filters.minPrice, DEFAULT_MIN_PRICE);
  assert.equal(sanitized.filters.maxPrice, DEFAULT_MAX_PRICE);
  assert.equal(sanitized.filters.minRating, 5);
  assert.equal(sanitized.search.guests.adults, 1);
  assert.equal(sanitized.filters.sortBy, "popular");
  assert.equal(sanitized.filters.freeCancellationOnly, true);
});
