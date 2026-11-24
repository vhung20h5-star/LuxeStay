import test from "node:test";
import assert from "node:assert/strict";
import { normalizeVietnamese } from "../dist/index.js";
import {
  projectPropertyAmenities,
  propertyHasAmenityFilters,
  getAmenityCategoryLabel,
  createAmenityExplorerState,
  reduceAmenityExplorerState,
  deriveAmenityExplorerView,
  describeAmenityPricing,
  describeSelectedAmenity,
  formatAmenitiesFeeSummary,
} from "../dist/index.js";
import type { PropertyAmenityOverride, SelectedBookingAmenity } from "@luxestay/contracts";

test("normalizeVietnamese (from @/lib/utils) folds accents, đ/Đ, and case", () => {
  assert.equal(normalizeVietnamese("Đưa Đón Sân Bay"), "dua don san bay");
  assert.equal(normalizeVietnamese("Hồ bơi vô cực"), "ho boi vo cuc");
  assert.equal(normalizeVietnamese("  SPA & Thư Giãn  "), "spa & thu gian");
});

test("projectPropertyAmenities merges overrides, strips inherited price on downgrade, and ignores unknown IDs", () => {
  const projection = projectPropertyAmenities({
    resortAmenities: [
      { amenityId: "airport-shuttle", pricingType: "free-reservation", featured: true },
      { amenityId: "herbal-spa", pricingType: "included" },
      { amenityId: "unknown-amenity-id" },
    ],
  });

  assert.equal(projection.totalCount, 2);
  assert.equal(projection.all.length, 2);

  const shuttle = projection.byId.get("airport-shuttle");
  assert.ok(shuttle);
  assert.equal(shuttle.pricingType, "free-reservation");
  assert.equal(shuttle.price, undefined);
  assert.equal(shuttle.priceUnit, undefined);
  assert.equal(shuttle.featured, true);

  const spa = projection.byId.get("herbal-spa");
  assert.ok(spa);
  assert.equal(spa.pricingType, "included");
  assert.equal(spa.price, undefined);
  assert.equal(spa.priceUnit, undefined);
  assert.equal(projection.byId.get("unknown-amenity-id"), undefined);
});

test("projectPropertyAmenities deduplicates duplicate amenityIds, handles undefined overrides, and freezes cached projection", () => {
  const projection = projectPropertyAmenities({
    resortAmenities: [
      { amenityId: "herbal-spa", price: 500000, priceUnit: "suất" },
      { amenityId: "herbal-spa", price: 900000, priceUnit: "suất VIP" },
      { amenityId: "infinity-pool" },
    ],
  });

  assert.equal(projection.totalCount, 2);
  assert.equal(projection.all.length, 2);
  assert.equal(projection.byId.size, 2);
  assert.equal(projection.byId.get("herbal-spa")?.price, 500000);
  assert.equal(Object.isFrozen(projection), true);
  assert.equal(Object.isFrozen(projection.all), true);

  const emptyProjection = projectPropertyAmenities({
    resortAmenities: undefined as unknown as PropertyAmenityOverride[],
  });
  assert.equal(emptyProjection.totalCount, 0);
  assert.equal(emptyProjection.all.length, 0);
});

test("projectPropertyAmenities preserves priority category order, hides empty groups, caps cardHighlights at 3 and featured at 6", () => {
  const projection = projectPropertyAmenities({
    resortAmenities: [
      { amenityId: "security-24h" },
      { amenityId: "high-speed-wifi" },
      { amenityId: "airport-shuttle", featured: true },
      { amenityId: "buffet-breakfast", featured: true },
      { amenityId: "infinity-pool", featured: true },
      { amenityId: "herbal-spa" },
      { amenityId: "gym-fitness" },
    ],
  });

  assert.deepEqual(
    projection.groups.map((g) => g.category.id),
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
  assert.deepEqual(
    projection.categories.map((c) => [c.category.id, c.count]),
    [
      ["pool-beach", 1],
      ["sports-recreation", 1],
      ["dining", 1],
      ["hotel-spa", 1],
      ["transport", 1],
      ["room-family", 1],
      ["security-general", 1],
    ]
  );
  assert.deepEqual(
    projection.cardHighlights.map((c) => c.id),
    ["pool-beach", "sports-recreation", "dining"]
  );
  assert.equal(projection.featured.length, 6);
  assert.deepEqual(
    projection.featured.slice(0, 3).map((a) => a.id),
    ["airport-shuttle", "buffet-breakfast", "infinity-pool"]
  );
  assert.equal(projection.featured[3].id, "security-24h");
});

test("projectPropertyAmenities caches by resortAmenities array reference and recomputes for new arrays", () => {
  const sharedOverrides: PropertyAmenityOverride[] = [
    { amenityId: "infinity-pool", featured: true },
    { amenityId: "airport-shuttle" },
  ];

  const first = projectPropertyAmenities({ resortAmenities: sharedOverrides });
  const clonedWrapper = projectPropertyAmenities({ resortAmenities: sharedOverrides });
  assert.equal(first, clonedWrapper);

  const fresh = projectPropertyAmenities({
    resortAmenities: [{ amenityId: "infinity-pool", featured: true }],
  });
  assert.notEqual(first, fresh);
  assert.equal(fresh.totalCount, 1);
});

test("propertyHasAmenityFilters uses cached filterKeys with AND semantics", () => {
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

test("getAmenityCategoryLabel returns canonical Vietnamese label", () => {
  assert.equal(getAmenityCategoryLabel("pool-beach"), "Hồ bơi & Bãi biển");
  assert.equal(getAmenityCategoryLabel("transport"), "Đưa đón & Di chuyển");
});

test("createAmenityExplorerState validates initialAmenityId and initialCategory against projection", () => {
  const projection = projectPropertyAmenities({
    resortAmenities: [
      { amenityId: "infinity-pool", pricingType: "included" },
      { amenityId: "buffet-breakfast", pricingType: "included" },
      { amenityId: "herbal-spa", pricingType: "paid", price: 550000, priceUnit: "suất" },
    ],
  });

  const validOpen = createAmenityExplorerState({
    projection,
    initialAmenityId: "herbal-spa",
    initialCategory: "hotel-spa",
  });
  assert.equal(validOpen.activeAmenityId, "herbal-spa");
  assert.equal(validOpen.activeCategory, "hotel-spa");
  assert.equal(validOpen.mobileShowDetail, true);

  const mismatchedPair = createAmenityExplorerState({
    projection,
    initialAmenityId: "herbal-spa",
    initialCategory: "dining",
  });
  assert.equal(mismatchedPair.activeCategory, "dining");
  assert.equal(mismatchedPair.mobileShowDetail, false);
  const mismatchedView = deriveAmenityExplorerView(projection, mismatchedPair, []);
  assert.equal(mismatchedView.effectiveActiveAmenity?.id, "buffet-breakfast");

  const invalidOpen = createAmenityExplorerState({
    projection,
    initialAmenityId: "non-existent-id",
    initialCategory: "transport",
  });
  assert.equal(invalidOpen.activeAmenityId, "infinity-pool");
  assert.equal(invalidOpen.activeCategory, "all");
  assert.equal(invalidOpen.mobileShowDetail, false);

  const emptyProjection = projectPropertyAmenities({ resortAmenities: [] });
  const emptyState = createAmenityExplorerState({ projection: emptyProjection });
  assert.equal(emptyState.activeAmenityId, null);
  assert.equal(emptyState.mobileShowDetail, false);

  // Opening on a category pill anchors activeAmenityId inside that category so switching to "all" does not jump
  const categoryOpen = createAmenityExplorerState({
    projection,
    initialCategory: "dining",
    initialAmenityId: null,
  });
  assert.equal(categoryOpen.activeCategory, "dining");
  assert.equal(categoryOpen.activeAmenityId, "buffet-breakfast");
  assert.equal(categoryOpen.mobileShowDetail, false);
  const backToAll = reduceAmenityExplorerState(categoryOpen, {
    type: "SET_CATEGORY",
    category: "all",
  });
  const backToAllView = deriveAmenityExplorerView(projection, backToAll, []);
  assert.equal(backToAllView.effectiveActiveAmenity?.id, "buffet-breakfast");
});

test("reduceAmenityExplorerState and deriveAmenityExplorerView manage filtering, fallback, mobile transitions, and selected summary", () => {
  const projection = projectPropertyAmenities({
    resortAmenities: [
      { amenityId: "infinity-pool", pricingType: "included" },
      { amenityId: "airport-shuttle", pricingType: "free-reservation" },
      { amenityId: "herbal-spa", pricingType: "paid", price: 550000, priceUnit: "suất" },
    ],
  });
  const selectedAmenities: SelectedBookingAmenity[] = [
    {
      id: "airport-shuttle",
      name: "Xe riêng đón tiễn sân bay",
      category: "transport",
      pricingType: "free-reservation",
      price: 0,
    },
    {
      id: "herbal-spa",
      name: "Spa thảo mộc",
      category: "hotel-spa",
      pricingType: "paid",
      price: 550000,
      priceUnit: "suất",
    },
  ];

  let state = createAmenityExplorerState({
    projection,
    initialAmenityId: "herbal-spa",
  });
  assert.equal(state.mobileShowDetail, true);

  // Diacritic-insensitive search resets mobile detail and auto-falls back effectiveActiveAmenity
  state = reduceAmenityExplorerState(state, { type: "SET_SEARCH", query: "ho boi" });
  assert.equal(state.mobileShowDetail, false);
  let view = deriveAmenityExplorerView(projection, state, selectedAmenities);
  assert.equal(view.filteredItems.length, 1);
  assert.equal(view.effectiveActiveAmenity?.id, "infinity-pool");
  assert.equal(view.activeCategoryLabel, "Hồ bơi & Bãi biển");
  assert.equal(view.selectedAmenityIds.has("herbal-spa"), true);
  assert.equal(view.selectedCount, 2);
  assert.equal(view.selectedTotalFee, 550000);
  assert.equal(view.feeFilterOptions.find((o) => o.id === "selected")?.label, "Đã chọn (2)");
  assert.equal(view.isEmpty, false);

  // Select opens detail pane on mobile; fee filter returns to list
  state = reduceAmenityExplorerState(state, { type: "SELECT_AMENITY", amenityId: "infinity-pool" });
  assert.equal(state.mobileShowDetail, true);
  state = reduceAmenityExplorerState(state, { type: "RESET_FILTERS" });
  assert.equal(state.mobileShowDetail, false);
  assert.equal(state.searchQuery, "");

  // Free fee filter includes both included and free-reservation
  state = reduceAmenityExplorerState(state, { type: "SET_FEE_FILTER", feeFilter: "free" });
  view = deriveAmenityExplorerView(projection, state, selectedAmenities);
  assert.deepEqual(
    view.filteredItems.map((a) => a.id),
    ["infinity-pool", "airport-shuttle"]
  );

  // Selected fee filter returns only selected amenities
  state = reduceAmenityExplorerState(state, { type: "SET_FEE_FILTER", feeFilter: "selected" });
  view = deriveAmenityExplorerView(projection, state, selectedAmenities);
  assert.deepEqual(
    view.filteredItems.map((a) => a.id),
    ["airport-shuttle", "herbal-spa"]
  );

  // Category filter with no matching search yields empty view cleanly
  state = reduceAmenityExplorerState(state, { type: "SET_CATEGORY", category: "pool-beach" });
  view = deriveAmenityExplorerView(projection, state, selectedAmenities);
  assert.equal(view.isEmpty, true);
  assert.equal(view.effectiveActiveAmenity, null);
  assert.equal(view.activeCategoryLabel, "");

  // Back to list action explicitly clears mobile detail
  state = reduceAmenityExplorerState(
    { ...state, mobileShowDetail: true },
    { type: "BACK_TO_LIST" }
  );
  assert.equal(state.mobileShowDetail, false);

  // Mobile detail closes cleanly when active item is unselected under feeFilter "selected"
  let selectedFlow = createAmenityExplorerState({ projection });
  selectedFlow = reduceAmenityExplorerState(selectedFlow, {
    type: "SET_FEE_FILTER",
    feeFilter: "selected",
  });
  selectedFlow = reduceAmenityExplorerState(selectedFlow, {
    type: "SELECT_AMENITY",
    amenityId: "herbal-spa",
  });
  let selectedView = deriveAmenityExplorerView(projection, selectedFlow, selectedAmenities);
  assert.equal(selectedView.mobileShowDetail, true);
  assert.equal(selectedView.effectiveActiveAmenity?.id, "herbal-spa");

  // User unselects herbal-spa while only airport-shuttle (free-reservation, 0đ) remains
  selectedView = deriveAmenityExplorerView(projection, selectedFlow, [selectedAmenities[0]]);
  assert.equal(selectedView.mobileShowDetail, false);
  assert.equal(selectedView.selectedCount, 1);
  assert.equal(selectedView.selectedTotalFee, 0);

  // Selecting an unknown amenity ID never pops mobile detail open on a fallback item
  const unknownSelect = reduceAmenityExplorerState(
    createAmenityExplorerState({ projection }),
    { type: "SELECT_AMENITY", amenityId: "non-existent" }
  );
  const unknownSelectView = deriveAmenityExplorerView(projection, unknownSelect, []);
  assert.equal(unknownSelectView.mobileShowDetail, false);

  // Stale and duplicate selectedAmenities are filtered & deduplicated against projection
  const staleAndDupView = deriveAmenityExplorerView(projection, createAmenityExplorerState({ projection }), [
    selectedAmenities[1],
    selectedAmenities[1],
    {
      id: "stale-other-property-amenity",
      name: "Dịch vụ cũ",
      category: "dining",
      pricingType: "paid",
      price: 999000,
    },
  ]);
  assert.equal(staleAndDupView.selectedCount, 1);
  assert.equal(staleAndDupView.selectedTotalFee, 550000);
  assert.equal(staleAndDupView.selectedAmenityIds.has("stale-other-property-amenity"), false);
  assert.equal(
    staleAndDupView.feeFilterOptions.find((o) => o.id === "selected")?.label,
    "Đã chọn (1)"
  );
});

test("describeAmenityPricing, describeSelectedAmenity, and formatAmenitiesFeeSummary produce canonical Vietnamese copy", () => {
  const projection = projectPropertyAmenities({
    resortAmenities: [
      { amenityId: "infinity-pool", pricingType: "included" },
      { amenityId: "airport-shuttle", pricingType: "free-reservation" },
      { amenityId: "herbal-spa", pricingType: "paid", price: 550000, priceUnit: "suất" },
    ],
  });

  const includedDesc = describeAmenityPricing(projection.byId.get("infinity-pool")!);
  assert.equal(includedDesc.tone, "included");
  assert.equal(includedDesc.isSelectable, false);
  assert.equal(includedDesc.compactBadge, "Miễn phí");
  assert.equal(includedDesc.heroBadge, "Miễn phí");
  assert.equal(includedDesc.detailPrice, "Miễn phí • Bao gồm sẵn");
  assert.equal(includedDesc.detailStatus, "Sử dụng tự do trong kỳ nghỉ");
  assert.equal(includedDesc.selectActionLabel, "");

  const freeResDesc = describeAmenityPricing(projection.byId.get("airport-shuttle")!);
  assert.equal(freeResDesc.tone, "free-reservation");
  assert.equal(freeResDesc.isSelectable, true);
  assert.equal(freeResDesc.compactBadge, "Miễn phí • Đặt trước");
  assert.equal(freeResDesc.heroBadge, "Miễn phí • Cần đặt trước");
  assert.equal(freeResDesc.detailPrice, "Miễn phí (0đ)");
  assert.equal(freeResDesc.detailStatus, "Khuyến nghị đăng ký trước");
  assert.ok(freeResDesc.selectActionLabel.includes("Đăng ký sử dụng miễn phí"));
  assert.ok(freeResDesc.selectedActionLabel.includes("Đã đăng ký vào chuyến đi"));

  const paidDesc = describeAmenityPricing(projection.byId.get("herbal-spa")!);
  assert.equal(paidDesc.tone, "paid");
  assert.equal(paidDesc.isSelectable, true);
  assert.ok(paidDesc.compactBadge.startsWith("+550"));
  assert.equal(paidDesc.heroBadge, paidDesc.compactBadge);
  assert.ok(paidDesc.detailPrice.includes("/ suất"));
  assert.equal(paidDesc.detailStatus, "Dịch vụ chọn thêm (cộng vào đơn)");
  assert.ok(paidDesc.selectActionLabel.includes("+550"));
  assert.ok(paidDesc.selectedActionLabel.includes("+550"));

  const selectedFree = describeSelectedAmenity({
    pricingType: "free-reservation",
    price: 0,
  });
  assert.equal(selectedFree.tone, "free-reservation");
  assert.equal(selectedFree.subtitle, "Miễn phí • Đăng ký giữ chỗ trước");
  assert.equal(selectedFree.compactFee, "0đ • Đặt trước");
  assert.equal(selectedFree.checkoutFee, "0đ");
  assert.equal(selectedFree.confirmedFee, "Miễn phí • Đã đăng ký");

  const selectedPaidNoUnit = describeSelectedAmenity({
    pricingType: "paid",
    price: 550000,
  });
  assert.equal(selectedPaidNoUnit.tone, "paid");
  assert.equal(selectedPaidNoUnit.subtitle, "Gói dịch vụ theo kỳ nghỉ");
  assert.ok(selectedPaidNoUnit.compactFee.startsWith("+550"));
  assert.equal(selectedPaidNoUnit.checkoutFee, selectedPaidNoUnit.compactFee);
  assert.equal(selectedPaidNoUnit.confirmedFee, selectedPaidNoUnit.compactFee);

  const selectedPaidZero = describeSelectedAmenity({
    pricingType: "paid",
    price: 0,
    priceUnit: "lượt",
  });
  assert.equal(selectedPaidZero.tone, "paid");
  assert.equal(selectedPaidZero.subtitle, "lượt");
  assert.equal(selectedPaidZero.checkoutFee, "0đ");

  // Paid amenity with missing, 0, or NaN price and no priceUnit formats cleanly without "+0 ₫" or "NaN"
  const paidMissingPrice = describeAmenityPricing({
    pricingType: "paid",
    price: undefined,
    priceUnit: undefined,
  });
  assert.equal(paidMissingPrice.tone, "paid");
  assert.equal(paidMissingPrice.compactBadge, "0đ");
  assert.equal(paidMissingPrice.heroBadge, "0đ");
  assert.equal(paidMissingPrice.detailPrice, "0đ");
  assert.equal(paidMissingPrice.selectActionLabel, "Yêu cầu thêm khi đặt phòng (0đ)");
  assert.equal(paidMissingPrice.selectedActionLabel, "Đã thêm vào đặt phòng (0đ) — Bấm để gỡ");

  const paidNaNPrice = describeAmenityPricing({
    pricingType: "paid",
    price: Number.NaN,
    priceUnit: "lượt",
  });
  assert.equal(paidNaNPrice.compactBadge, "0đ");
  assert.equal(paidNaNPrice.detailPrice, "0đ / lượt");
  assert.equal(paidNaNPrice.detailPrice.includes("NaN"), false);

  const selectedPaidNaN = describeSelectedAmenity({
    pricingType: "paid",
    price: Number.NaN,
  });
  assert.equal(selectedPaidNaN.checkoutFee, "0đ");
  assert.equal(selectedPaidNaN.confirmedFee, "0đ");

  assert.equal(formatAmenitiesFeeSummary(0), "Miễn phí");
  assert.equal(formatAmenitiesFeeSummary(0, "parenthesized"), "(Miễn phí 0đ)");
  assert.ok(formatAmenitiesFeeSummary(550000).startsWith("+550"));
  assert.ok(formatAmenitiesFeeSummary(550000, "parenthesized").startsWith("(+550"));
});
