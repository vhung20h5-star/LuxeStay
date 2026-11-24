import test from "node:test";
import assert from "node:assert/strict";
import type { PropertyAvailabilityOverride } from "@luxestay/contracts";
import { PROPERTIES } from "../dist/seed/index.js";
import {
  buildAvailabilityCalendar,
  computeNightlyPrice,
  enumerateStayDates,
  evaluatePropertyAvailability,
  evaluateReservationCancellation,
  evaluateReservationCompletion,
  evaluateReviewEligibility,
  hasCheckoutDatePassed,
  isReservationHoldingInventory,
  isVietnamHoliday,
  isWeekendNight,
  processServerReservationIntent,
  recalculatePropertyRating,
  updateSessionCheckIn,
  updateSessionRooms,
  createIdleBookingSession,
  openPropertySession,
  deriveBookingQuote,
} from "../dist/index.js";

const villaStay = PROPERTIES.find((p) => p.propertyType === "villa")!; // inventoryCount = 1
const hotelStay = PROPERTIES.find((p) => p.propertyType === "hotel")!; // hotel, inventoryCount = 5
const baseDate = new Date(2026, 10, 20); // 2026-11-20

test("computeNightlyPrice applies override > holiday (+30%) > weekend (+20%) > base priority", () => {
  // 2026-12-08 = Tuesday (base)
  assert.equal(isWeekendNight("2026-12-08"), false);
  assert.equal(isVietnamHoliday("2026-12-08"), false);
  const base = computeNightlyPrice(1_000_000, "2026-12-08");
  assert.equal(base.reason, "base");
  assert.equal(base.effectivePrice, 1_000_000);

  // 2026-12-11 = Friday (weekend +20%)
  assert.equal(isWeekendNight("2026-12-11"), true);
  const fri = computeNightlyPrice(1_000_000, "2026-12-11");
  assert.equal(fri.reason, "weekend");
  assert.equal(fri.effectivePrice, 1_200_000);

  // 2026-12-25 = Friday AND Holiday (holiday +30% takes precedence over weekend)
  assert.equal(isWeekendNight("2026-12-25"), true);
  assert.equal(isVietnamHoliday("2026-12-25"), true);
  const holiday = computeNightlyPrice(1_000_000, "2026-12-25");
  assert.equal(holiday.reason, "holiday");
  assert.equal(holiday.effectivePrice, 1_300_000);

  // Override takes highest precedence over holiday & weekend
  const override = computeNightlyPrice(1_000_000, "2026-12-25", {
    overridePrice: 1_850_000,
  });
  assert.equal(override.reason, "override");
  assert.equal(override.effectivePrice, 1_850_000);
});

test("isReservationHoldingInventory holds only confirmed and non-expired pending_payment bookings", () => {
  const now = new Date("2026-11-24T10:00:00.000Z");
  assert.equal(isReservationHoldingInventory({ status: "confirmed" }, now), true);
  assert.equal(
    isReservationHoldingInventory(
      { status: "pending_payment", paymentExpiresAt: "2026-11-24T10:15:00.000Z" },
      now
    ),
    true
  );
  assert.equal(
    isReservationHoldingInventory(
      { status: "pending_payment", paymentExpiresAt: "2026-11-24T09:59:59.000Z" },
      now
    ),
    false
  );
  assert.equal(isReservationHoldingInventory({ status: "cancelled" }, now), false);
  assert.equal(isReservationHoldingInventory({ status: "expired" }, now), false);
  assert.equal(isReservationHoldingInventory({ status: "payment_failed" }, now), false);
  assert.equal(isReservationHoldingInventory({ status: "completed" }, now), false);
});

test("evaluatePropertyAvailability enforces 1-unit villa anti-double-booking, multi-room hotel occupancy, and blocked dates", () => {
  assert.equal(villaStay.inventoryCount, 1);
  assert.equal(hotelStay.inventoryCount, 5);

  const existingVilla = processServerReservationIntent(
    {
      propertyId: villaStay.id,
      checkInSeed: "2026-12-08",
      nights: 2,
      guests: { adults: 2, children: 0, rooms: 1 },
      selectedAmenityIds: [],
      guestInfo: { fullName: "Khách A", phone: "0912345678", email: "a@luxestay.vn" },
      paymentMethod: "hotel",
    },
    PROPERTIES,
    { fallbackBaseDate: baseDate }
  );
  assert.equal(existingVilla.ok, true);
  if (!existingVilla.ok) return;

  // Overlapping booking on 1-unit villa -> 409 CONFLICT
  const overlapIntent = processServerReservationIntent(
    {
      propertyId: villaStay.id,
      checkInSeed: "2026-12-09",
      nights: 2,
      guests: { adults: 2, children: 0, rooms: 1 },
      selectedAmenityIds: [],
      guestInfo: { fullName: "Khách B", phone: "0988777666", email: "b@luxestay.vn" },
      paymentMethod: "hotel",
    },
    PROPERTIES,
    {
      fallbackBaseDate: baseDate,
      enforceAvailability: true,
      existingReservations: [existingVilla.booking],
    }
  );
  assert.equal(overlapIntent.ok, false);
  if (!overlapIntent.ok) {
    assert.equal(overlapIntent.status, 409);
    assert.equal(overlapIntent.code, "CONFLICT");
  }

  // Same-day check-out (2026-12-10) is FREE because stay dates are [2026-12-08, 2026-12-09]
  const backToBack = processServerReservationIntent(
    {
      propertyId: villaStay.id,
      checkInSeed: "2026-12-10",
      nights: 1,
      guests: { adults: 2, children: 0, rooms: 1 },
      selectedAmenityIds: [],
      guestInfo: { fullName: "Khách C", phone: "0977666555", email: "c@luxestay.vn" },
      paymentMethod: "hotel",
    },
    PROPERTIES,
    {
      fallbackBaseDate: baseDate,
      enforceAvailability: true,
      existingReservations: [existingVilla.booking],
    }
  );
  assert.equal(backToBack.ok, true);

  // Blocked date override blocks booking even when rooms are free
  const overrides: PropertyAvailabilityOverride[] = [
    {
      propertyId: hotelStay.id,
      date: "2026-12-15",
      isBlocked: true,
      note: "Bảo trì định kỳ",
    },
  ];
  const blockedEval = evaluatePropertyAvailability(
    hotelStay,
    enumerateStayDates("2026-12-14", 3),
    1,
    overrides,
    [],
    baseDate
  );
  assert.equal(blockedEval.available, false);
  assert.deepEqual(blockedEval.blockedDates, ["2026-12-15"]);

  // Multi-room hotel (5 rooms): 3 booked -> 2 remaining -> requesting 2 OK, requesting 3 fails
  const hotelBooking = processServerReservationIntent(
    {
      propertyId: hotelStay.id,
      checkInSeed: "2026-12-08",
      nights: 2,
      guests: { adults: 4, children: 0, rooms: 3 },
      selectedAmenityIds: [],
      guestInfo: { fullName: "Đoàn Khách", phone: "0912345678", email: "group@luxestay.vn" },
      paymentMethod: "hotel",
    },
    PROPERTIES,
    { fallbackBaseDate: baseDate, enforceAvailability: true }
  );
  assert.equal(hotelBooking.ok, true);
  if (!hotelBooking.ok) return;
  // Multi-room quote scales nightsTotal by rooms (3 rooms * 2 weekday nights)
  assert.equal(hotelBooking.booking.pricing.nightsTotal, hotelStay.pricePerNight * 2 * 3);

  const twoMore = evaluatePropertyAvailability(
    hotelStay,
    ["2026-12-08", "2026-12-09"],
    2,
    [],
    [hotelBooking.booking],
    baseDate
  );
  assert.equal(twoMore.available, true);
  assert.equal(twoMore.remainingUnitsByDate["2026-12-08"], 2);

  const threeMore = evaluatePropertyAvailability(
    hotelStay,
    ["2026-12-08", "2026-12-09"],
    3,
    [],
    [hotelBooking.booking],
    baseDate
  );
  assert.equal(threeMore.available, false);

  // Calendar builder reflects booked units and seasonal prices
  const cal = buildAvailabilityCalendar(
    hotelStay,
    "2026-12-08",
    "2026-12-12",
    overrides,
    [hotelBooking.booking],
    baseDate
  );
  assert.equal(cal.days.length, 5);
  assert.equal(cal.days[0]?.remainingUnits, 2); // 2026-12-08 (Tue)
  assert.equal(cal.days[0]?.priceReason, "base");
  assert.equal(cal.days[3]?.priceReason, "weekend"); // 2026-12-11 (Fri)
  assert.equal(cal.days[4]?.priceReason, "weekend"); // 2026-12-12 (Sat)
});

test("updateSessionCheckIn and updateSessionRooms update booking quote reactively", () => {
  let session = openPropertySession(createIdleBookingSession(), hotelStay, undefined, baseDate);
  session = updateSessionCheckIn(session, "2026-12-08"); // Tue + Wed (base nights)
  session = updateSessionRooms(session, 2);
  const quote = deriveBookingQuote(session, baseDate);
  assert.ok(quote);
  assert.equal(quote.checkIn, "08/12/2026");
  assert.equal(quote.guests.rooms, 2);
  assert.equal(quote.pricing.seasonalSurcharge, 0);
  assert.equal(quote.pricing.nightsTotal, hotelStay.pricePerNight * 2 * 2);
});

test("evaluateReservationCompletion, cancellation guard, evaluateReviewEligibility, and recalculatePropertyRating", () => {
  const created = processServerReservationIntent(
    {
      propertyId: villaStay.id,
      checkInSeed: "2026-12-08",
      nights: 2,
      guests: { adults: 2, children: 0, rooms: 1 },
      selectedAmenityIds: [],
      guestInfo: { fullName: "Nguyễn Review", phone: "0912345678", email: "review@luxestay.vn" },
      paymentMethod: "hotel",
    },
    PROPERTIES,
    { bookingId: "LX-REV001", fallbackBaseDate: baseDate, userId: "user-rev-1" }
  );
  assert.equal(created.ok, true);
  if (!created.ok) return;

  // Before check-out (2026-12-10 12:00) and still confirmed -> NOT eligible for review yet (409)
  assert.equal(hasCheckoutDatePassed("10/12/2026", new Date(2026, 11, 10, 11, 0)), false);
  assert.equal(hasCheckoutDatePassed("10/12/2026", new Date(2026, 11, 10, 12, 0)), true);

  const tooEarly = evaluateReviewEligibility(
    created.booking,
    new Set(),
    { authenticatedUserId: "user-rev-1" },
    { now: new Date(2026, 11, 9, 10, 0) }
  );
  assert.equal(tooEarly.ok, false);
  if (!tooEarly.ok) assert.equal(tooEarly.status, 409);

  // Wrong user -> 403 FORBIDDEN
  const wrongUser = evaluateReviewEligibility(
    created.booking,
    new Set(),
    { contact: "stranger@example.com" },
    { now: new Date(2026, 11, 12, 15, 0) }
  );
  assert.equal(wrongUser.ok, false);
  if (!wrongUser.ok) assert.equal(wrongUser.status, 403);

  // Past check-out on confirmed booking -> eligible!
  const afterCheckout = evaluateReviewEligibility(
    created.booking,
    new Set(),
    { contact: "review@luxestay.vn" },
    { now: new Date(2026, 11, 10, 13, 0) }
  );
  assert.equal(afterCheckout.ok, true);

  // Explicit completion transitions confirmed -> completed and blocks subsequent cancellation
  const completed = evaluateReservationCompletion(
    created.booking,
    { contact: "review@luxestay.vn" },
    { completedAt: "2026-12-10T05:00:00.000Z" }
  );
  assert.equal(completed.ok, true);
  if (!completed.ok) return;
  assert.equal(completed.booking.status, "completed");
  assert.equal(completed.booking.completedAt, "2026-12-10T05:00:00.000Z");

  const cancelCompleted = evaluateReservationCancellation(completed.booking, {
    contact: "review@luxestay.vn",
  });
  assert.equal(cancelCompleted.ok, false);
  if (!cancelCompleted.ok) assert.equal(cancelCompleted.status, 409);

  // Completed booking is eligible immediately regardless of current date
  const completedEligible = evaluateReviewEligibility(
    completed.booking,
    new Set(),
    { authenticatedUserId: "user-rev-1" },
    { now: new Date(2026, 10, 24, 8, 0) }
  );
  assert.equal(completedEligible.ok, true);

  // Duplicate review for same bookingId -> 409 CONFLICT
  const duplicate = evaluateReviewEligibility(
    completed.booking,
    new Set(["LX-REV001"]),
    { authenticatedUserId: "user-rev-1" },
    { now: new Date(2026, 10, 24, 8, 0) }
  );
  assert.equal(duplicate.ok, false);
  if (!duplicate.ok) assert.equal(duplicate.status, 409);

  // Rating recalculation: exact mode when reviewCount <= stored reviews
  const exact = recalculatePropertyRating(4.5, 2, [{ rating: 4 }, { rating: 5 }], 3);
  assert.equal(exact.reviewCount, 3);
  assert.equal(exact.rating, 4);

  // Rating recalculation: weighted mode preserving seeded baseline (e.g., 100 reviews @ 4.8 + new 5.0)
  const weighted = recalculatePropertyRating(4.8, 100, [{ rating: 5 }], 5);
  assert.equal(weighted.reviewCount, 101);
  assert.equal(weighted.rating, 4.8); // (480 + 5) / 101 = 4.8019 -> 4.8
});
