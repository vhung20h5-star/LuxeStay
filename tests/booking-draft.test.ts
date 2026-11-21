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
  const stay02 = PROPERTIES.find((p) => p.id === "stay-02");
  const stay03 = PROPERTIES.find((p) => p.id === "stay-03");
  assert.ok(stay02 && stay03);

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
  assert.equal(switched.adults, 2); // clamped to stay03.maxGuests (2)
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
  assert.equal(clampDraftNights(99), 30);
  assert.equal(clampDraftAdults(0, 4), 1);
  assert.equal(clampDraftAdults(9, 4), 4);
});

test("computeStayDates calculates checkOut = checkIn + nights in dd/MM/yyyy", () => {
  const fromPreferred = computeStayDates(4, "2026-11-25");
  assert.deepEqual(fromPreferred, { checkIn: "25/11/2026", checkOut: "29/11/2026" });

  const fromFallback = computeStayDates(3, "", new Date(2026, 10, 20));
  assert.deepEqual(fromFallback, { checkIn: "21/11/2026", checkOut: "24/11/2026" });
});

test("computeStayDates parses SearchBar DD/MM presets and rejects invalid calendar rollover", () => {
  const base = new Date(2026, 10, 20); // 20/11/2026
  assert.deepEqual(computeStayDates(3, "25/12", base), {
    checkIn: "25/12/2026",
    checkOut: "28/12/2026",
  });
  assert.deepEqual(computeStayDates(2, "14/11", base), {
    checkIn: "14/11/2026",
    checkOut: "16/11/2026",
  });
  // Invalid calendar date (Feb 31) must fall back to base + 1 day rather than rolling to March 3
  assert.deepEqual(computeStayDates(2, "2026-02-31", base), {
    checkIn: "21/11/2026",
    checkOut: "23/11/2026",
  });
});
