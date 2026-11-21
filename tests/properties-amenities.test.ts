import test from "node:test";
import assert from "node:assert/strict";
import { PROPERTIES } from "@/data/properties";
import { AMENITY_CATALOG, AMENITY_FILTER_OPTIONS } from "@/data/amenities";
import {
  projectPropertyAmenities,
  propertyHasAmenityFilters,
} from "@/lib/amenities";

test("all 12 properties have valid, duplicate-free resortAmenities, no legacy amenities array, and >= 4 featured items", () => {
  assert.equal(PROPERTIES.length, 12);

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
