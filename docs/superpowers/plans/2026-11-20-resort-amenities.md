# Resort Amenities & Services Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full interactive resort amenities & services discovery and add-on booking experience across LuxeStay's homepage (`PropertyCard`, `FilterModal`), property detail (`PropertyModal`, Master–Detail `PropertyAmenitiesModal`), and booking checkout/confirmation flow (`BookingContext`, `BookingCheckoutModal`, `BookingSuccessModal`).

**Architecture:** Use a centralized master catalog (`src/data/amenities.ts`) with 7 standardized categories, 9 homepage filter keys, and ~42 rich amenity templates merged with per-property overrides (`src/data/properties.ts`) via pure helpers (`src/lib/amenities.ts`). Synchronize nights, adults, and 1-click selected amenities/services through a shared `bookingDraft` in `BookingContext` backed by pure transition/date helpers (`src/lib/bookingDraft.ts`), so every business rule is unit-tested with Node 24's built-in `node:test` runner without adding external dependencies.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript (strict), Tailwind CSS v4, Framer Motion 12, Lucide React 1.16, Node 24 `node:test`.

**Spec:** `docs/superpowers/specs/2026-11-20-resort-amenities-design.md`

## Global Constraints

- Tech stack: Next.js 16 App Router, React 19, TypeScript strict (`npx tsc --noEmit` must pass with 0 errors), Tailwind CSS v4, Framer Motion 12, Lucide React 1.16.
- Zero new npm packages: reuse `src/components/ui/`, Tailwind CSS v4, Framer Motion, Lucide React, and Node 24's built-in `node:test`.
- Images: every amenity photo URL must use `https://images.unsplash.com/...` (already allowed in `next.config.ts`) and `AmenityDetailPanel` must include an `onError` visual fallback so broken image frames never appear.
- Language & formatting: 100% Vietnamese UI copy consistent with LuxeStay; currency formatted via `formatVND` in `src/lib/utils.ts`.
- Backward compatibility: preserve `Property.amenities: string[]` alongside the new `Property.resortAmenities: PropertyAmenityOverride[]`.
- Pricing formula (consistent across `PropertyModal`, `BookingCheckoutModal`, `BookingSuccessModal`): `baseTotal = pricePerNight * nights`, `cleaningFee = 150000`, `serviceDiscount = 100000`, `amenitiesFee = sum(paid selected prices)`, `grandTotal = baseTotal + cleaningFee + amenitiesFee - serviceDiscount`.
- Authentic per-property data: all 12 properties (`stay-01`..`stay-12`) get realistic amenities; unavailable categories are hidden (never padded with fake resort facilities in small homestays).

## Review Focus

1. **Pricing override leakage (`paid` → `free-reservation` or `included`):** When a catalog amenity defaults to `paid` with a `price` (e.g., `airport-shuttle` at 350,000đ) and a luxury property overrides `pricingType` to `"free-reservation"` without specifying `price`, resolution must clear `price`/`priceUnit` so checkout adds `0đ` instead of silently charging 350,000đ. *(Pinned in Task 2)*
2. **Stale selection & unselectable-item guard across property switches:** Switching to a different property (via `PropertyCard`, `FavoritesDrawer`, or direct `"Đặt ngay"`) must clear `selectedAmenityIds` and clamp `adults` to `maxGuests`; attempting to toggle an `"included"` amenity or unknown `amenityId` must be ignored and excluded from pricing. *(Pinned in Task 4)*
3. **Vietnamese diacritic-insensitive search & empty-filter detail recovery:** Searching `"ho boi"`, `"dua don"`, or `"SPA"` must match Vietnamese accented names/descriptions; if a filter/search hides the active detail amenity, `PropertyAmenitiesModal` must auto-select the first visible match (or show an empty state with `"Đặt lại bộ lọc"` when 0 match, never crashing). *(Pinned in Tasks 2 & 6)*
4. **Stacked modal `Escape` & backdrop isolation (`z-[60]` over `z-50`):** Pressing `Escape` or clicking the backdrop while `PropertyAmenitiesModal` is open on top of `PropertyModal` must close ONLY `PropertyAmenitiesModal`, keeping `PropertyModal` and `bookingDraft` intact. *(Pinned in Tasks 6 & 7)*
5. **Checkout date & add-on removal synchronization:** Changing `nights` in `PropertyModal` and removing add-on services inside `BookingCheckoutModal` must keep `checkOut = checkIn + nights`, recalculate `amenitiesFee` & `grandTotal` immediately, snapshot `selectedAmenities` onto `BookingDetails` for `BookingSuccessModal`, and reset `selectedAmenityIds` on completion. *(Pinned in Tasks 4 & 8)*

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `tests/register-alias.mjs` | Create | Tiny Node 24 `module.registerHooks` loader resolving `@/*` → `src/*` for zero-dependency `node --test`. |
| `src/types/index.ts` | Modify | Add amenity categories, pricing types, filter keys, catalog/override/resolved types, `SelectedBookingAmenity`, `BookingDraft`, and update `Property`, `FilterState`, `BookingDetails`. |
| `src/data/amenities.ts` | Create | Define `AMENITY_CATEGORIES` (7), `AMENITY_FILTER_OPTIONS` (9), and `AMENITY_CATALOG` (~42 templates with verified Unsplash URLs). |
| `src/lib/amenities.ts` | Create | Pure resolution, grouping, category priority, Vietnamese search/filtering, homepage filter matching, and booking pricing helpers. |
| `src/data/properties.ts` | Modify | Add tailored `resortAmenities: PropertyAmenityOverride[]` to all 12 properties (`stay-01`..`stay-12`). |
| `src/lib/bookingDraft.ts` | Create | Pure `BookingDraft` state transition & check-in/check-out date calculation helpers. |
| `src/context/BookingContext.tsx` | Modify | Hold synced `bookingDraft`, expose draft mutators, and auto-sync when switching properties or opening checkout. |
| `src/components/property/AmenityIcon.tsx` | Create | Map verified `lucide-react` `iconName` strings to icon components with clean fallback. |
| `src/components/home/FilterModal.tsx` | Modify | Replace 7 hardcoded strings with 9 icon-bearing `AMENITY_FILTER_OPTIONS`. |
| `src/components/home/PropertyList.tsx` | Modify | Filter properties with `propertyHasAmenityFilters(prop, filterState.amenities)`. |
| `src/components/home/PropertyCard.tsx` | Modify | Display up to 3 priority category pills + `+N tiện ích` count pill. |
| `src/components/property/AmenityDetailPanel.tsx` | Create | Render 16:9 photo with `onError` fallback, badges, description, 2×2 info grid, notes, and 3-state action control. |
| `src/components/property/PropertyAmenitiesModal.tsx` | Create | `z-[60]` Master–Detail modal (desktop 2-col, mobile list↔detail) with search, fee/selected filters, available category tabs, Escape isolation, and sticky summary footer. |
| `src/components/property/PropertyModal.tsx` | Modify | Upgrade amenities section to clickable category pills + 6 clickable highlights + `"Xem tất cả XX tiện ích & dịch vụ"` CTA; sync right-column calculator with `bookingDraft` and selected add-ons. |
| `src/components/booking/BookingCheckoutModal.tsx` | Modify | Consume synced `bookingDraft`, compute dates with `computeStayDates`, render removable selected add-ons section, include `amenitiesFee`, snapshot into `BookingDetails`, and clear selected add-ons on submit. |
| `src/components/booking/BookingSuccessModal.tsx` | Modify | Display booked `nights`/`adults` and `"Tiện ích & dịch vụ đã đăng ký"` card when `selectedAmenities.length > 0`. |

---

### Task 1: Type Contracts, Node Test Alias Hook & Master Amenity Catalog

**Files:**
- Create: `tests/register-alias.mjs`
- Modify: `src/types/index.ts:1-136`
- Create: `src/data/amenities.ts`
- Test: `tests/amenities-catalog.test.ts`

**Interfaces:**
- Consumes: existing `Property`, `FilterState`, `BookingDetails` in `src/types/index.ts`.
- Produces:
  - Types in `src/types/index.ts`: `AmenityCategoryId`, `AmenityPricingType`, `AmenityFilterKey`, `AmenityCategoryMeta`, `AmenityFilterOption` (`{ key: AmenityFilterKey; label: string; iconName: string }`), `AmenityCatalogItem`, `PropertyAmenityOverride`, `ResolvedPropertyAmenity`, `SelectedBookingAmenity`, `BookingDraft`; `Property.resortAmenities?: PropertyAmenityOverride[]` (tightened to required in Task 3), `BookingDetails.pricing.amenitiesFee?: number` and `BookingDetails.selectedAmenities?: SelectedBookingAmenity[]` (tightened to required in Task 8). `FilterState.amenities` stays `string[]` here and narrows to `AmenityFilterKey[]` in Task 5 so every intermediate commit passes `npx tsc --noEmit`.
  - Exports in `src/data/amenities.ts`:
    - `AMENITY_CATEGORIES: AmenityCategoryMeta[]` (ordered by priority: `pool-beach`, `sports-recreation`, `dining`, `hotel-spa`, `transport`, `room-family`, `security-general`)
    - `AMENITY_FILTER_OPTIONS: AmenityFilterOption[]` (9 entries matching `AmenityFilterKey`)
    - `AMENITY_CATALOG: Record<string, AmenityCatalogItem>` (~42 standardized resort/stay amenities)

- [ ] **Step 1: Create `tests/register-alias.mjs` and write failing catalog integrity test `tests/amenities-catalog.test.ts`**

Create `tests/register-alias.mjs` using `node:module` `registerHooks` to map `@/` specifiers to `<repoRoot>/src/` (trying `.ts`, `.tsx`, `/index.ts`).

Create `tests/amenities-catalog.test.ts`:
```ts
import test from "node:test";
import assert from "node:assert/strict";
import {
  AMENITY_CATEGORIES,
  AMENITY_FILTER_OPTIONS,
  AMENITY_CATALOG,
} from "@/data/amenities";

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
    assert.ok(item.hours.length > 0 && item.location.length > 0 && item.description.length > 15);
    for (const fk of item.filterKeys) {
      assert.ok(filterKeys.has(fk), `Unknown filterKey ${fk} on ${key}`);
    }
    if (item.pricingType === "paid") {
      assert.ok(typeof item.price === "number" && item.price > 0, `Paid item ${key} needs positive price`);
      assert.ok(item.priceUnit && item.priceUnit.length > 0, `Paid item ${key} needs priceUnit`);
    }
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --import ./tests/register-alias.mjs --test tests/amenities-catalog.test.ts`  
Expected: FAIL (`ERR_MODULE_NOT_FOUND` for `@/data/amenities`).

- [ ] **Step 3: Update `src/types/index.ts` and implement `src/data/amenities.ts`**

1. In `src/types/index.ts`, add all types listed in **Interfaces** above. Make `Property.resortAmenities?: PropertyAmenityOverride[]` temporarily optional until Task 3 populates all 12 properties (Task 3 tightens it to required `resortAmenities: PropertyAmenityOverride[]` so `tsc` stays green during intermediate tasks).
2. In `src/data/amenities.ts`, define:
   - `AMENITY_CATEGORIES` (7 groups from spec §4.2 with Vietnamese `label`, `shortLabel`, `iconName`, `description`).
   - `AMENITY_FILTER_OPTIONS` (9 options from spec §4.4B: `pool`, `beach`, `sports-gym`, `dining`, `spa-wellness`, `transport-shuttle`, `bbq-campfire`, `bath-fireplace`, `family-pet`).
   - `AMENITY_CATALOG` covering ~42 items across all 7 categories (e.g., `infinity-pool`, `heated-pool`, `bio-pool`, `private-beach`, `outdoor-wooden-tub`, `sun-loungers`, `gym-fitness`, `yoga-class`, `tennis-pickleball`, `sup-snorkeling`, `wooden-boat`, `bicycle-free`, `mountain-bike`, `guided-trekking`, `outdoor-cinema`, `netflix-projector`, `reading-lounge`, `buffet-breakfast`, `in-room-breakfast`, `floating-breakfast`, `signature-restaurant`, `sky-lounge-bar`, `garden-bbq`, `campfire-roast`, `candlelight-dinner`, `cooking-class`, `artisan-tea-coffee`, `reception-24h`, `private-butler`, `herbal-spa`, `sauna-steam`, `daily-housekeeping`, `express-laundry`, `room-service-24h`, `airport-shuttle`, `electric-buggy`, `private-speedboat`, `motorbike-car-rental`, `smart-parking`, `yacht-squid-tour`, `high-speed-wifi`, `smart-home`, `full-kitchen`, `wood-fireplace`, `washer-dryer`, `kids-club-crib`, `pet-friendly`, `security-24h`, `smart-lock`, `in-room-safe`, `medical-support`, `luggage-storage`).
   - Use only verified `lucide-react` icon names (`Waves`, `Dumbbell`, `UtensilsCrossed`, `Sparkles`, `Car`, `Home`, `ShieldCheck`, `Sun`, `Bath`, `Bike`, `Flame`, `Coffee`, `Wine`, `Plane`, `Ship`, `Bus`, `Wifi`, `Tv`, `Baby`, `PawPrint`, `Lock`, `KeyRound`, `Luggage`, `HeartPulse`, `Compass`, `Film`, `BookOpen`, `Mountain`, `Trees`, `ChefHat`, `Shirt`, `ConciergeBell`, `Umbrella`, `Trophy`, `Tent`) and `https://images.unsplash.com/photo-...` URLs.

- [ ] **Step 4: Run catalog test to verify it passes**

Run: `node --import ./tests/register-alias.mjs --test tests/amenities-catalog.test.ts`  
Expected: PASS (3/3 tests pass).

- [ ] **Step 5: Commit**

```bash
git add tests/register-alias.mjs tests/amenities-catalog.test.ts src/types/index.ts src/data/amenities.ts
git commit -m "feat: add resort amenity types and standardized master catalog"
```

---

### Task 2: Pure Amenity Resolution, Search, Filtering & Pricing Helpers

**Files:**
- Create: `src/lib/amenities.ts`
- Test: `tests/amenities.test.ts`

**Interfaces:**
- Consumes: `AMENITY_CATEGORIES`, `AMENITY_CATALOG` from `@/data/amenities`; types from `@/types`.
- Produces (`src/lib/amenities.ts`):
  - `normalizeVietnamese(input: string): string`
  - `resolvePropertyAmenities(property: Pick<Property, "resortAmenities">): ResolvedPropertyAmenity[]`
  - `groupAmenitiesByCategory(amenities: ResolvedPropertyAmenity[]): Array<{ category: AmenityCategoryMeta; items: ResolvedPropertyAmenity[] }>`
  - `getPropertyAmenityCategories(amenities: ResolvedPropertyAmenity[]): Array<{ category: AmenityCategoryMeta; count: number }>`
  - `getCardHighlightCategories(amenities: ResolvedPropertyAmenity[], limit?: number): AmenityCategoryMeta[]` (default `limit = 3`, following `AMENITY_CATEGORIES` priority order)
  - `getFeaturedAmenities(amenities: ResolvedPropertyAmenity[], limit?: number): ResolvedPropertyAmenity[]` (default `limit = 6`, prioritizes `featured === true`, falls back to remaining items)
  - `type AmenityFeeFilter = "all" | "free" | "paid" | "selected"`
  - `filterPropertyAmenities(amenities: ResolvedPropertyAmenity[], options: { query?: string; category?: AmenityCategoryId | "all"; feeFilter?: AmenityFeeFilter; selectedIds?: string[] }): ResolvedPropertyAmenity[]`
  - `propertyHasAmenityFilters(property: Pick<Property, "resortAmenities">, requiredFilters: AmenityFilterKey[]): boolean`
  - `buildSelectedBookingAmenities(amenities: ResolvedPropertyAmenity[], selectedIds: string[]): SelectedBookingAmenity[]`
  - `CLEANING_FEE = 150000`, `SERVICE_DISCOUNT = 100000`
  - `calculateBookingPricing(pricePerNight: number, nights: number, selectedAmenities: SelectedBookingAmenity[]): { basePrice: number; nightsTotal: number; cleaningFee: number; serviceFee: number; amenitiesFee: number; discount: number; total: number }`

- [ ] **Step 1: Write failing unit tests in `tests/amenities.test.ts`**

Cover all helpers + Review Focus #1 (pricing override leakage) and Review Focus #3 (diacritic-insensitive search + free chip including `free-reservation` + category hiding):
```ts
import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeVietnamese,
  resolvePropertyAmenities,
  groupAmenitiesByCategory,
  getCardHighlightCategories,
  filterPropertyAmenities,
  propertyHasAmenityFilters,
  buildSelectedBookingAmenities,
  calculateBookingPricing,
} from "@/lib/amenities";

test("normalizeVietnamese folds accents, đ/Đ, and case", () => {
  assert.equal(normalizeVietnamese("Đưa Đón Sân Bay"), "dua don san bay");
  assert.equal(normalizeVietnamese("Hồ bơi vô cực"), "ho boi vo cuc");
});

test("resolvePropertyAmenities strips inherited price when overriding paid -> free-reservation or included", () => {
  const resolved = resolvePropertyAmenities({
    resortAmenities: [
      { amenityId: "airport-shuttle", pricingType: "free-reservation", featured: true },
      { amenityId: "herbal-spa", pricingType: "included" },
    ],
  });
  assert.equal(resolved.length, 2);
  assert.equal(resolved[0].pricingType, "free-reservation");
  assert.equal(resolved[0].price, undefined);
  assert.equal(resolved[0].priceUnit, undefined);
  assert.equal(resolved[0].featured, true);
  assert.equal(resolved[1].pricingType, "included");
  assert.equal(resolved[1].price, undefined);
});

test("groupAmenitiesByCategory hides categories with zero items and preserves priority order", () => {
  const resolved = resolvePropertyAmenities({
    resortAmenities: [
      { amenityId: "high-speed-wifi" },
      { amenityId: "infinity-pool" },
    ],
  });
  const groups = groupAmenitiesByCategory(resolved);
  assert.deepEqual(groups.map((g) => g.category.id), ["pool-beach", "room-family"]);
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
  assert.deepEqual(top.map((c) => c.id), ["pool-beach", "dining", "transport"]);
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

test("buildSelectedBookingAmenities ignores included or unknown ids and calculateBookingPricing sums paid add-ons", () => {
  const resolved = resolvePropertyAmenities({
    resortAmenities: [
      { amenityId: "high-speed-wifi", pricingType: "included" },
      { amenityId: "airport-shuttle", pricingType: "free-reservation" },
      { amenityId: "herbal-spa", pricingType: "paid", price: 550000, priceUnit: "suất" },
    ],
  });
  const selected = buildSelectedBookingAmenities(resolved, [
    "high-speed-wifi",
    "airport-shuttle",
    "herbal-spa",
    "non-existent",
  ]);
  assert.deepEqual(
    selected.map((s) => ({ id: s.id, price: s.price })),
    [
      { id: "airport-shuttle", price: 0 },
      { id: "herbal-spa", price: 550000 },
    ]
  );

  const pricing = calculateBookingPricing(2000000, 3, selected);
  assert.equal(pricing.nightsTotal, 6000000);
  assert.equal(pricing.cleaningFee, 150000);
  assert.equal(pricing.amenitiesFee, 550000);
  assert.equal(pricing.discount, 100000);
  assert.equal(pricing.total, 6600000);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --import ./tests/register-alias.mjs --test tests/amenities.test.ts`  
Expected: FAIL (`ERR_MODULE_NOT_FOUND` for `@/lib/amenities`).

- [ ] **Step 3: Implement `src/lib/amenities.ts`**

Implement all exported functions matching the exact **Interfaces** above. Key rules:
- `normalizeVietnamese`: `.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[đĐ]/g, "d").toLowerCase().trim()`.
- `resolvePropertyAmenities`: skip unknown `amenityId`, merge base catalog item with override fields, and whenever effective `pricingType !== "paid"`, explicitly set `price: undefined` and `priceUnit: undefined`.
- `buildSelectedBookingAmenities`: only include items whose `pricingType === "paid" || pricingType === "free-reservation"`, setting `price: item.pricingType === "paid" ? (item.price ?? 0) : 0`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --import ./tests/register-alias.mjs --test tests/amenities-catalog.test.ts tests/amenities.test.ts`  
Expected: PASS (all tests pass).

- [ ] **Step 5: Commit**

```bash
git add src/lib/amenities.ts tests/amenities.test.ts
git commit -m "feat: implement resort amenity resolution, filtering, and pricing helpers"
```

---

### Task 3: Tailored Resort Amenities Data for All 12 Properties

**Files:**
- Modify: `src/types/index.ts` (make `Property.resortAmenities` required)
- Modify: `src/data/properties.ts:1-692`
- Test: `tests/properties-amenities.test.ts`

**Interfaces:**
- Consumes: `PropertyAmenityOverride` from `@/types`, `AMENITY_CATALOG` and `AMENITY_FILTER_OPTIONS` from `@/data/amenities`, `resolvePropertyAmenities`, `groupAmenitiesByCategory`, `propertyHasAmenityFilters` from `@/lib/amenities`.
- Produces: all 12 entries in `PROPERTIES` populated with tailored, region-authentic `resortAmenities: PropertyAmenityOverride[]` while keeping `amenities: string[]` intact.

- [ ] **Step 1: Write failing data-integrity test `tests/properties-amenities.test.ts`**

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { PROPERTIES } from "@/data/properties";
import { AMENITY_CATALOG, AMENITY_FILTER_OPTIONS } from "@/data/amenities";
import {
  resolvePropertyAmenities,
  groupAmenitiesByCategory,
  propertyHasAmenityFilters,
} from "@/lib/amenities";

test("all 12 properties have valid, duplicate-free resortAmenities with >= 4 featured items", () => {
  assert.equal(PROPERTIES.length, 12);

  for (const prop of PROPERTIES) {
    assert.ok(prop.resortAmenities && prop.resortAmenities.length >= 10, `${prop.id} too few amenities`);
    const ids = prop.resortAmenities.map((a) => a.amenityId);
    assert.equal(new Set(ids).size, ids.length, `Duplicate amenityId in ${prop.id}`);

    for (const entry of prop.resortAmenities) {
      assert.ok(AMENITY_CATALOG[entry.amenityId], `Unknown amenityId ${entry.amenityId} in ${prop.id}`);
    }

    const resolved = resolvePropertyAmenities(prop);
    const featured = resolved.filter((a) => a.featured);
    assert.ok(featured.length >= 4, `${prop.id} needs >= 4 featured amenities`);

    const groups = groupAmenitiesByCategory(resolved);
    if (prop.propertyType === "resort" || prop.propertyType === "hotel" || prop.propertyType === "villa") {
      assert.ok(resolved.length >= 14, `${prop.id} (${prop.propertyType}) needs >= 14 amenities`);
      assert.ok(groups.length >= 6, `${prop.id} (${prop.propertyType}) needs >= 6 categories`);
    } else {
      assert.ok(groups.length >= 4, `${prop.id} (${prop.propertyType}) needs >= 4 categories`);
    }
  }
});

test("Hanoi Old Quarter homestay (stay-09) authentically omits pool-beach category", () => {
  const stay09 = PROPERTIES.find((p) => p.id === "stay-09")!;
  const groups = groupAmenitiesByCategory(resolvePropertyAmenities(stay09));
  assert.equal(groups.some((g) => g.category.id === "pool-beach"), false);
});

test("every homepage AMENITY_FILTER_OPTIONS key matches at least 1 property", () => {
  for (const opt of AMENITY_FILTER_OPTIONS) {
    const matches = PROPERTIES.filter((p) => propertyHasAmenityFilters(p, [opt.key]));
    assert.ok(matches.length >= 1, `Filter option "${opt.key}" matched 0 properties`);
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --import ./tests/register-alias.mjs --test tests/properties-amenities.test.ts`  
Expected: FAIL (`stay-01 too few amenities`).

- [ ] **Step 3: Populate `resortAmenities` for all 12 properties in `src/data/properties.ts` and make `resortAmenities` required in `src/types/index.ts`**

Populate tailored overrides for each property matching its real theme and existing `amenities` highlights:
- Resorts/Villas (`stay-02` Phú Quốc Coral Villa, `stay-05` Hội An An Bang Resort, `stay-08` Ninh Vân Bay Cliff Villa, `stay-10` Camia Resort): 16–20 items across 6–7 categories, including iconic overrides (e.g. `stay-02` free 2-way airport shuttle `free-reservation` + floating breakfast + SUP & snorkeling + private butler; `stay-05` free electric buggy to Old Town + cooking class + tropical pool; `stay-08` private speedboat + cliff pool + candlelight cave dinner + yacht tour; `stay-10` saltwater infinity pool + Camia Sunset restaurant + night squid fishing tour).
- Hotels (`stay-03` Sa Pa Aira Panorama, `stay-07` Đà Nẵng Dragon Bay Penthouse): 14–17 items across 6–7 categories (`stay-03` heated 4-season pool + Red Dao herbal bath spa + mountain-view gym + Lao Cai shuttle; `stay-07` rooftop pool & Sky Lounge + smart home + underground parking + Da Nang airport shuttle).
- Homestays & Glampings (`stay-01` Mây Lang Thang, `stay-04` Nhà Của Gió, `stay-06` Tràng An Lotus Ecolodge, `stay-09` Hanoi Heritage Suite, `stay-11` Tiệm Táo Đỏ, `stay-12` Eco Valley Glamping): 10–14 realistic items across 4–6 appropriate categories (e.g. `stay-09` omits `pool-beach`, `stay-04` includes campfire + Netflix projector + pet-friendly, `stay-12` includes outdoor cinema + guided trekking + BBQ + Da Lat shuttle).
- Ensure every property has at least 1–2 selectable `free-reservation` or `paid` add-ons so guests can test adding services on every single listing, and tighten `Property.resortAmenities` to required in `src/types/index.ts`.

- [ ] **Step 4: Run test suite & typecheck**

Run: `node --import ./tests/register-alias.mjs --test tests/*.test.ts`  
Expected: PASS (all tests across all 3 test files pass).

- [ ] **Step 5: Commit**

```bash
git add src/types/index.ts src/data/properties.ts tests/properties-amenities.test.ts
git commit -m "feat: add tailored resort amenities data for all 12 properties"
```

---

### Task 4: Synchronized Booking Draft State & Date Helpers

**Files:**
- Create: `src/lib/bookingDraft.ts`
- Modify: `src/context/BookingContext.tsx:1-144`
- Test: `tests/booking-draft.test.ts`

**Interfaces:**
- Consumes: `BookingDraft`, `Property`, `AmenityFilterKey` from `@/types`; `resolvePropertyAmenities` from `@/lib/amenities`.
- Produces:
  - `src/lib/bookingDraft.ts`:
    - `createInitialDraft(property?: Pick<Property, "id" | "maxGuests"> | null): BookingDraft`
    - `syncDraftForProperty(current: BookingDraft, property: Pick<Property, "id" | "maxGuests">): BookingDraft`
    - `toggleDraftAmenity(current: BookingDraft, property: Pick<Property, "id" | "resortAmenities">, amenityId: string): BookingDraft`
    - `removeDraftAmenity(current: BookingDraft, amenityId: string): BookingDraft`
    - `clampDraftNights(nights: number): number` (min `1`, max `30`)
    - `clampDraftAdults(adults: number, maxGuests: number): number` (min `1`, max `Math.max(1, maxGuests)`)
    - `computeStayDates(nights: number, preferredCheckIn?: string, fallbackBaseDate?: Date): { checkIn: string; checkOut: string }` (returns `dd/MM/yyyy` formatted strings where `checkOut = checkIn + nights` days)
  - `src/context/BookingContext.tsx` (`BookingContextType` additions):
    - `bookingDraft: BookingDraft`
    - `setDraftNights: (nights: number) => void`
    - `setDraftAdults: (adults: number, maxGuests?: number) => void`
    - `toggleBookingAmenity: (property: Property, amenityId: string) => void`
    - `removeBookingAmenity: (amenityId: string) => void`
    - `clearSelectedAmenities: () => void`
    - `setSelectedProperty` & `setCheckoutProperty` wrap state setters so opening any non-null property calls `syncDraftForProperty`.

- [ ] **Step 1: Write failing unit tests in `tests/booking-draft.test.ts`**

Pin Review Focus #2 (property switch reset, adult clamping, ignoring `included` or unknown amenities) and Review Focus #5 (`computeStayDates` syncing `checkOut` with `nights`):
```ts
import test from "node:test";
import assert from "node:assert/strict";
import { PROPERTIES } from "@/data/properties";
import {
  createInitialDraft,
  syncDraftForProperty,
  toggleDraftAmenity,
  removeDraftAmenity,
  clampDraftNights,
  clampDraftAdults,
  computeStayDates,
} from "@/lib/bookingDraft";

test("syncDraftForProperty preserves draft for same property and resets when switching property", () => {
  const stay02 = PROPERTIES.find((p) => p.id === "stay-02")!; // maxGuests 6
  const stay03 = PROPERTIES.find((p) => p.id === "stay-03")!; // maxGuests 2

  const draft = {
    propertyId: stay02.id,
    nights: 4,
    adults: 5,
    selectedAmenityIds: ["herbal-spa"],
  };

  const same = syncDraftForProperty(draft, stay02);
  assert.deepEqual(same, draft);

  const switched = syncDraftForProperty(draft, stay03);
  assert.equal(switched.propertyId, stay03.id);
  assert.equal(switched.nights, 2);
  assert.equal(switched.adults, 2); // clamped to stay03.maxGuests
  assert.deepEqual(switched.selectedAmenityIds, []);
});

test("toggleDraftAmenity toggles paid/free-reservation items and ignores included or unknown items", () => {
  const prop = {
    id: "test-prop",
    resortAmenities: [
      { amenityId: "high-speed-wifi", pricingType: "included" as const },
      { amenityId: "airport-shuttle", pricingType: "free-reservation" as const },
      { amenityId: "herbal-spa", pricingType: "paid" as const, price: 500000, priceUnit: "suất" },
    ],
  };

  let draft = createInitialDraft({ id: "test-prop", maxGuests: 4 });
  draft = toggleDraftAmenity(draft, prop, "high-speed-wifi");
  draft = toggleDraftAmenity(draft, prop, "does-not-exist");
  assert.deepEqual(draft.selectedAmenityIds, []);

  draft = toggleDraftAmenity(draft, prop, "airport-shuttle");
  draft = toggleDraftAmenity(draft, prop, "herbal-spa");
  assert.deepEqual(draft.selectedAmenityIds, ["airport-shuttle", "herbal-spa"]);

  draft = toggleDraftAmenity(draft, prop, "airport-shuttle");
  assert.deepEqual(draft.selectedAmenityIds, ["herbal-spa"]);

  draft = removeDraftAmenity(draft, "herbal-spa");
  assert.deepEqual(draft.selectedAmenityIds, []);
});

test("clampDraftNights and clampDraftAdults enforce valid bounds", () => {
  assert.equal(clampDraftNights(0), 1);
  assert.equal(clampDraftNights(5), 5);
  assert.equal(clampDraftAdults(0, 4), 1);
  assert.equal(clampDraftAdults(9, 4), 4);
});

test("computeStayDates calculates checkOut = checkIn + nights in dd/MM/yyyy", () => {
  const fromPreferred = computeStayDates(4, "2026-11-25");
  assert.deepEqual(fromPreferred, { checkIn: "25/11/2026", checkOut: "29/11/2026" });

  const fromFallback = computeStayDates(3, "", new Date(2026, 10, 20)); // Nov 20, 2026 -> checkIn Nov 21
  assert.deepEqual(fromFallback, { checkIn: "21/11/2026", checkOut: "24/11/2026" });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --import ./tests/register-alias.mjs --test tests/booking-draft.test.ts`  
Expected: FAIL (`ERR_MODULE_NOT_FOUND` for `@/lib/bookingDraft`).

- [ ] **Step 3: Implement `src/lib/bookingDraft.ts` and integrate into `src/context/BookingContext.tsx`**

1. Implement all exported functions in `src/lib/bookingDraft.ts`. For `computeStayDates`, parse `YYYY-MM-DD` local-date safely (split `year, month, day` to avoid UTC off-by-one shifts!) and fall back to `fallbackBaseDate + 1 day` (default `new Date()`), then add `clampDraftNights(nights)` days for `checkOut` and format both as `dd/MM/yyyy`.
2. Update `src/context/BookingContext.tsx`:
   - Initialize `bookingDraft` via `createInitialDraft()`.
   - Wrap `setSelectedProperty` and `setCheckoutProperty` so passing a non-null `Property` updates `bookingDraft` via `syncDraftForProperty(prev, property)`.
   - Expose `bookingDraft`, `setDraftNights`, `setDraftAdults`, `toggleBookingAmenity`, `removeBookingAmenity`, `clearSelectedAmenities`.

- [ ] **Step 4: Run all tests**

Run: `node --import ./tests/register-alias.mjs --test tests/*.test.ts`  
Expected: PASS (all 4 test suites pass).

- [ ] **Step 5: Commit**

```bash
git add src/lib/bookingDraft.ts src/context/BookingContext.tsx tests/booking-draft.test.ts
git commit -m "feat: add synchronized booking draft state and stay date helpers"
```

---

### Task 5: Reusable `AmenityIcon` & Homepage Integration (`FilterModal`, `PropertyList`, `PropertyCard`)

**Files:**
- Modify: `src/types/index.ts` (narrow `FilterState.amenities` to `AmenityFilterKey[]`)
- Create: `src/components/property/AmenityIcon.tsx`
- Modify: `src/components/home/FilterModal.tsx:1-237`
- Modify: `src/components/home/PropertyList.tsx:1-157`
- Modify: `src/components/home/PropertyCard.tsx:1-218`

**Interfaces:**
- Consumes: `AMENITY_FILTER_OPTIONS` from `@/data/amenities`; `resolvePropertyAmenities`, `getCardHighlightCategories`, `propertyHasAmenityFilters` from `@/lib/amenities`; `AmenityFilterKey` from `@/types`.
- Produces: `AmenityIcon({ name, className }: { name: string; className?: string })` in `src/components/property/AmenityIcon.tsx`.

- [ ] **Step 1: Create `src/components/property/AmenityIcon.tsx`**

Implement a `"use client"` icon mapper dictionary mapping every verified `lucide-react` icon name used in `src/data/amenities.ts` (`Waves`, `Dumbbell`, `UtensilsCrossed`, `Sparkles`, `Car`, `Home`, `ShieldCheck`, `Sun`, `Bath`, `Bike`, `Flame`, `Coffee`, `Wine`, `Plane`, `Ship`, `Bus`, `Wifi`, `Tv`, `Baby`, `PawPrint`, `Lock`, `KeyRound`, `Luggage`, `HeartPulse`, `Compass`, `Film`, `BookOpen`, `Mountain`, `Trees`, `ChefHat`, `Shirt`, `ConciergeBell`, `Umbrella`, `Trophy`, `Tent`) with `Check` as fallback.

- [ ] **Step 2: Upgrade `src/components/home/FilterModal.tsx` and `src/components/home/PropertyList.tsx`**

1. In `FilterModal.tsx`: replace hardcoded `amenityOptions` with `AMENITY_FILTER_OPTIONS`, type `toggleAmenity(key: AmenityFilterKey)`, and render each chip with `<AmenityIcon name={opt.iconName} className="w-3.5 h-3.5" />` + `opt.label`.
2. In `PropertyList.tsx`: replace `filterState.amenities.every((a) => prop.amenities.includes(a))` with `propertyHasAmenityFilters(prop, filterState.amenities)`.

- [ ] **Step 3: Upgrade `src/components/home/PropertyCard.tsx`**

Compute `resolvedAmenities = resolvePropertyAmenities(property)` and `highlightCategories = getCardHighlightCategories(resolvedAmenities, 3)` (memoized or lightweight per render). Under the existing `Hủy miễn phí` / `Bao gồm bữa sáng` row, render a clean compact row of up to 3 category pills (`<AmenityIcon />` + `cat.shortLabel`) plus a subtle `+{resolvedAmenities.length} tiện ích` chip in `slate-100 text-slate-600`. Keep card height compact and responsive.

- [ ] **Step 4: Verify TypeScript, ESLint, and unit tests**

Run: `npx tsc --noEmit; npm run lint; node --import ./tests/register-alias.mjs --test tests/*.test.ts`  
Expected: 0 TypeScript errors, 0 ESLint errors, all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/types/index.ts src/components/property/AmenityIcon.tsx src/components/home/FilterModal.tsx src/components/home/PropertyList.tsx src/components/home/PropertyCard.tsx
git commit -m "feat: upgrade homepage filter modal and property cards with resort amenities"
```

---

### Task 6: Master–Detail Amenities Modal (`AmenityDetailPanel` & `PropertyAmenitiesModal`)

**Files:**
- Create: `src/components/property/AmenityDetailPanel.tsx`
- Create: `src/components/property/PropertyAmenitiesModal.tsx`

**Interfaces:**
- Consumes: `ResolvedPropertyAmenity`, `AmenityCategoryId`, `Property` from `@/types`; `AMENITY_CATEGORIES` from `@/data/amenities`; `resolvePropertyAmenities`, `groupAmenitiesByCategory`, `getPropertyAmenityCategories`, `filterPropertyAmenities`, `buildSelectedBookingAmenities`, `AmenityFeeFilter` from `@/lib/amenities`; `AmenityIcon` from `./AmenityIcon`; `formatVND` from `@/lib/utils`; `Badge`, `Button` from `@/components/ui/*`.
- Produces:
  - `AmenityDetailPanel` props: `{ amenity: ResolvedPropertyAmenity; categoryLabel: string; isSelected: boolean; onToggleSelect: (amenityId: string) => void; onBackMobile?: () => void }`
  - `PropertyAmenitiesModal` props: `{ isOpen: boolean; property: Property; initialAmenityId?: string | null; initialCategory?: AmenityCategoryId | "all"; selectedAmenityIds: string[]; onToggleAmenity: (amenityId: string) => void; onClose: () => void }`

- [ ] **Step 1: Create `src/components/property/AmenityDetailPanel.tsx`**

Implement the detail panel showing:
- Optional mobile back bar (`"← Quay lại danh sách tiện ích"`) when `onBackMobile` is provided (`md:hidden`).
- 16:9 image header (`next/image` with `fill` and `sizes="(max-width: 768px) 100vw, 560px"`) with client-side `imgError` state (reset when `amenity.id` changes) that renders a clean emerald/teal gradient + large `<AmenityIcon />` fallback on error, plus overlaid category badge and pricing badge (`Miễn phí` / `Miễn phí • Cần đặt trước` / `+{formatVND(price)}`).
- Title (`text-xl font-black text-slate-900`) and full Vietnamese description.
- 2×2 structured info cards (`bg-slate-50 border border-slate-100 rounded-2xl p-3.5`):
  1. **Giờ hoạt động** (`amenity.hours`)
  2. **Vị trí / Khu vực** (`amenity.location`)
  3. **Chi phí** (`Miễn phí` or `Miễn phí • 0đ` or `${formatVND(amenity.price)} / ${amenity.priceUnit}`)
  4. **Trạng thái / Đặt trước** (`Sử dụng tự do` / `Khuyến nghị đặt trước` / `Dịch vụ chọn thêm`)
- Notes callout (`bg-amber-50/70 border border-amber-200/80 rounded-2xl`) when `amenity.notes` is present.
- 3-state action block:
  - `included`: emerald confirmation box — `"Đã bao gồm sẵn trong kỳ nghỉ — bạn có thể sử dụng tự do không cần đăng ký thêm."`
  - `free-reservation`: toggle `<Button>` — `"Đăng ký sử dụng miễn phí khi đặt phòng"` ↔ `"✓ Đã đăng ký vào chuyến đi (Miễn phí) — Bấm để hủy"`.
  - `paid`: toggle `<Button>` — `"Yêu cầu thêm khi đặt phòng (+${formatVND(amenity.price ?? 0)})"` ↔ `"✓ Đã thêm vào đặt phòng (+${formatVND(amenity.price ?? 0)}) — Bấm để gỡ"`.

- [ ] **Step 2: Create `src/components/property/PropertyAmenitiesModal.tsx`**

Implement the stacked modal (`z-[60]` above `PropertyModal`'s `z-50`):
- **Escape & backdrop isolation (Review Focus #4):** Register a `keydown` listener in capture phase (`window.addEventListener("keydown", handler, true)`) while `isOpen` is true; on `Escape`, call `e.stopPropagation(); e.preventDefault(); onClose();` so `PropertyModal` below stays open. Clicking backdrop calls `e.stopPropagation(); onClose();`.
- **Initialization:** Sync `activeCategory = initialCategory ?? "all"`, `searchQuery = ""`, `feeFilter = "all"`, `activeAmenityId = initialAmenityId ?? resolved[0]?.id ?? null`, and `mobileShowDetail = Boolean(initialAmenityId)` whenever the modal opens.
- **Sticky header:** Property title + total amenities count badge + close button; search input (`placeholder="Tìm tiện ích: hồ bơi, gym, spa, đưa đón..."` with clear `×`); fee filter chips (`Tất cả`, `Miễn phí`, `Có phụ phí`, `Đã chọn (${selectedCount})`); horizontal scrollable category tabs (`Tất cả (${resolved.length})` + only available categories via `getPropertyAmenityCategories`).
- **Auto-fallback active selection (Review Focus #3):** Derive `filteredAmenities = filterPropertyAmenities(...)` and `effectiveActiveAmenity = filteredAmenities.find((a) => a.id === activeAmenityId) ?? filteredAmenities[0] ?? null` so filtering never renders a stale/undefined detail pane.
- **Body (`flex-1 min-h-0 overflow-hidden`):**
  - When `filteredAmenities.length === 0`: centered empty state with `"Đặt lại bộ lọc"` button resetting search, category, and feeFilter.
  - Otherwise: responsive `md:grid md:grid-cols-12 h-full`:
    - Left list (`md:col-span-5 overflow-y-auto`, hidden on mobile when `mobileShowDetail` is true): grouped by category when `activeCategory === "all"` (or flat list for selected category). Each row is a `<button>` displaying `<AmenityIcon />`, name, pricing tag, and green `Đã chọn` pill if selected; active row highlighted with `border-emerald-500 bg-emerald-50/50`. Clicking sets `activeAmenityId` and `mobileShowDetail = true`.
    - Right detail (`md:col-span-7 overflow-y-auto`, hidden on mobile when `!mobileShowDetail`): renders `<AmenityDetailPanel />` for `effectiveActiveAmenity` with `onBackMobile={() => setMobileShowDetail(false)}`.
- **Sticky footer:** Left shows summary (`Đã chọn N dịch vụ • +${formatVND(amenitiesFee)}` or helper hint when 0 selected); right has primary button `"Xong & quay lại đặt phòng"` calling `onClose`.

- [ ] **Step 3: Verify TypeScript and ESLint**

Run: `npx tsc --noEmit; npm run lint`  
Expected: 0 TypeScript errors, 0 ESLint errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/property/AmenityDetailPanel.tsx src/components/property/PropertyAmenitiesModal.tsx
git commit -m "feat: add master-detail PropertyAmenitiesModal and AmenityDetailPanel"
```

---

### Task 7: Upgrade `PropertyModal` — Interactive Amenities & Synced Booking Widget

**Files:**
- Modify: `src/components/property/PropertyModal.tsx:1-463`

**Interfaces:**
- Consumes: `useBooking` (`bookingDraft`, `setDraftNights`, `setDraftAdults`, `toggleBookingAmenity`, `removeBookingAmenity`); `resolvePropertyAmenities`, `getPropertyAmenityCategories`, `getFeaturedAmenities`, `buildSelectedBookingAmenities`, `calculateBookingPricing` from `@/lib/amenities`; `AmenityIcon` from `./AmenityIcon`; `PropertyAmenitiesModal` from `./PropertyAmenitiesModal`.
- Produces: updated `PropertyModal` integrating clickable amenity highlights, category pills, `PropertyAmenitiesModal`, Escape handling, and synced right-column pricing calculator.

- [ ] **Step 1: Upgrade `src/components/property/PropertyModal.tsx`**

Make the following targeted changes:
1. Replace local `useState` for `nights` and `adults` with `bookingDraft.nights` / `bookingDraft.adults` and `setDraftNights` / `setDraftAdults(n, selectedProperty.maxGuests)` from `useBooking()`. Reset `activePhoto` to `0` when `selectedProperty.id` changes.
2. Add local modal state `amenitiesModal: { isOpen: boolean; initialAmenityId: string | null; initialCategory: AmenityCategoryId | "all" }` + helper `openAmenitiesModal(opts?)`. Add an `Escape` listener on `PropertyModal` that ONLY closes `PropertyModal` when `!amenitiesModal.isOpen` (Review Focus #4).
3. Replace the static `Tiện nghi nổi bật` block (lines 274–288) with:
   - Header showing `"Tiện ích & dịch vụ tại chỗ nghỉ"` + total badge (`{resolvedAmenities.length} tiện ích`).
   - Horizontal wrap row of clickable category summary pills (`getPropertyAmenityCategories(resolvedAmenities)`) — clicking any pill calls `openAmenitiesModal({ initialCategory: cat.id, initialAmenityId: null })`.
   - 2-column grid of 6 interactive highlight buttons (`getFeaturedAmenities(resolvedAmenities, 6)`): each button displays `<AmenityIcon />`, `item.name`, concise fee/selected badge (`✓ Đã chọn` / `Miễn phí` / `Đặt trước` / `+${formatVND(price)}`), and a `ChevronRight` affordance. Clicking opens `openAmenitiesModal({ initialAmenityId: item.id, initialCategory: "all" })`.
   - Full-width prominent outline button: `"Xem tất cả ${resolvedAmenities.length} tiện ích & dịch vụ"` (with emerald pill `${selectedAmenities.length} đã chọn` when > 0).
4. In the right-hand sticky booking widget:
   - Compute pricing via `calculateBookingPricing(selectedProperty.pricePerNight, nights, selectedAmenities)`.
   - When `selectedAmenities.length > 0`, render a compact `"Dịch vụ đi kèm đã chọn (${selectedAmenities.length})"` card listing each selected item (`0đ • Đặt trước` or `+${formatVND(item.price)}`) with a small `X` remove button (`removeBookingAmenity(item.id)`).
   - Add a `Dịch vụ & tiện ích đi kèm` line in the price breakdown (showing `+${formatVND(pricing.amenitiesFee)}` or `Miễn phí (${selectedAmenities.length} yêu cầu)`) whenever `selectedAmenities.length > 0`, and display `pricing.total`.
5. Render `<PropertyAmenitiesModal />` inside `PropertyModal` (bound to `amenitiesModal`, `bookingDraft.selectedAmenityIds`, and `toggleBookingAmenity(selectedProperty, id)`).

- [ ] **Step 2: Verify TypeScript, ESLint, and unit tests**

Run: `npx tsc --noEmit; npm run lint; node --import ./tests/register-alias.mjs --test tests/*.test.ts`  
Expected: 0 TypeScript errors, 0 ESLint errors, all tests PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/property/PropertyModal.tsx
git commit -m "feat: connect interactive resort amenities and add-on pricing in PropertyModal"
```

---

### Task 8: Upgrade `BookingCheckoutModal` & `BookingSuccessModal` + Full End-to-End Verification

**Files:**
- Modify: `src/types/index.ts` (tighten `BookingDetails.pricing.amenitiesFee` and `BookingDetails.selectedAmenities` to required)
- Modify: `src/components/booking/BookingCheckoutModal.tsx:1-305`
- Modify: `src/components/booking/BookingSuccessModal.tsx:1-175`

**Interfaces:**
- Consumes: `useBooking` (`bookingDraft`, `searchCriteria`, `removeBookingAmenity`, `clearSelectedAmenities`); `resolvePropertyAmenities`, `buildSelectedBookingAmenities`, `calculateBookingPricing` from `@/lib/amenities`; `computeStayDates` from `@/lib/bookingDraft`; `BookingDetails` (`pricing.amenitiesFee`, `selectedAmenities`) from `@/types`.
- Produces: complete synced checkout + itemized confirmation ticket.

- [ ] **Step 1: Upgrade `src/components/booking/BookingCheckoutModal.tsx`**

1. Read `bookingDraft`, `searchCriteria`, `removeBookingAmenity`, `clearSelectedAmenities` from `useBooking()`.
2. Replace hardcoded `nights = 2` / `adults = 2` / `"15/11/2026"` / `"17/11/2026"` with:
   - `nights = bookingDraft.nights`, `adults = Math.min(bookingDraft.adults, checkoutProperty.maxGuests)`
   - `{ checkIn, checkOut } = computeStayDates(nights, searchCriteria.checkIn)`
   - `selectedAmenities = buildSelectedBookingAmenities(resolvePropertyAmenities(checkoutProperty), bookingDraft.selectedAmenityIds)`
   - `pricing = calculateBookingPricing(checkoutProperty.pricePerNight, nights, selectedAmenities)`
3. Show synced `{nights} đêm nghỉ • {adults} khách • {checkIn} → {checkOut}` in the Stay Summary Card.
4. When `selectedAmenities.length > 0`, render a `"Tiện ích & dịch vụ đi kèm (${selectedAmenities.length})"` section showing each item, its `priceUnit` / `"Miễn phí • Đăng ký trước"`, `+${formatVND(item.price)}`, and a remove button (`removeBookingAmenity(item.id)`).
5. Include `Tiện ích & dịch vụ đi kèm` row in the Total breakdown (when `selectedAmenities.length > 0`), update submit CTA to `formatVND(pricing.total)`, pass `pricing` (with `amenitiesFee`) and `selectedAmenities` into `BookingDetails`, and call `clearSelectedAmenities()` right before `setBookingSuccess(bookingInfo)`.

- [ ] **Step 2: Upgrade `src/components/booking/BookingSuccessModal.tsx`**

1. Destructure `nights`, `guests`, `selectedAmenities` from `bookingSuccess`.
2. Display `{nights} đêm • {guests.adults} khách` alongside the guest name or itinerary grid.
3. When `selectedAmenities && selectedAmenities.length > 0`, render a clean `"Tiện ích & dịch vụ đi kèm đã đăng ký"` card inside the ticket body listing each item with its status (`Miễn phí • Đã đăng ký` or `+${formatVND(item.price)}`) and subtotal if `pricing.amenitiesFee > 0`.

- [ ] **Step 3: Run full verification suite (unit tests, TypeScript, ESLint, production build)**

Run: `node --import ./tests/register-alias.mjs --test tests/*.test.ts; npx tsc --noEmit; npm run lint; npm run build`  
Expected:
- All `node:test` suites PASS with 0 failures.
- `npx tsc --noEmit` exits 0 with 0 errors.
- `npm run lint` exits 0 with 0 errors.
- `npm run build` (`next build --webpack`) exits 0 and builds cleanly.

- [ ] **Step 4: Commit**

```bash
git add src/types/index.ts src/components/booking/BookingCheckoutModal.tsx src/components/booking/BookingSuccessModal.tsx
git commit -m "feat: sync selected resort amenities and pricing across checkout and confirmation ticket"
```
