import test from "node:test";
import assert from "node:assert/strict";
import type {
  BookingDetails,
  ReservationSubmissionRequest,
  ReservationSubmitter,
  SearchCriteria,
} from "@luxestay/contracts";
import { PROMOTION_VOUCHERS, PROPERTIES } from "../dist/seed/index.js";
import {
  createIdleBookingSession,
  openPropertySession,
  startCheckoutSession,
  closePreviewSession,
  closeCheckoutSession,
  updateSessionNights,
  updateSessionAdults,
  toggleSessionAmenity,
  removeSessionAmenity,
  setSessionPromoCode,
  deriveBookingQuote,
  evaluatePromotionVoucher,
  validateCheckoutGuestInput,
  processServerReservationIntent,
  matchesReservationContact,
  evaluateReservationCancellation,
  evaluatePaymentWebhookTransition,
  submitBookingSession,
} from "../dist/index.js";

function createTestSubmitter(overrides?: {
  bookingId?: string;
  createdAt?: string;
}): ReservationSubmitter {
  return {
    async submit(request: ReservationSubmissionRequest, options?: { signal?: AbortSignal }) {
      if (options?.signal?.aborted) {
        const err = new Error("Aborted");
        err.name = "AbortError";
        throw err;
      }
      const details: BookingDetails = Object.freeze({
        property: request.quote.property,
        checkIn: request.quote.checkIn,
        checkOut: request.quote.checkOut,
        nights: request.quote.nights,
        guests: Object.freeze({ ...request.quote.guests }),
        pricing: Object.freeze({ ...request.quote.pricing }),
        selectedAmenities: Object.freeze(
          request.quote.selectedAmenities.map((item) => Object.freeze({ ...item }))
        ),
        guestInfo: Object.freeze({ ...request.guestInfo }),
        paymentMethod: request.paymentMethod,
        bookingId: overrides?.bookingId ?? "LX-TEST01",
        createdAt: overrides?.createdAt ?? "2026-11-21T00:00:00.000Z",
        status: "confirmed",
      });
      return details;
    },
  };
}

const stay02 = PROPERTIES.find((p) => p.id === "stay-02")!;
const stay03 = PROPERTIES.find((p) => p.id === "stay-03")!;
const baseDate = new Date(2026, 10, 20); // 20/11/2026

test("openPropertySession seeds nights from SearchBar DD/MM presets (including cross-year) and clamps adults to maxGuests", () => {
  const search: SearchCriteria = {
    destination: "Sa Pa",
    checkIn: "25/12",
    checkOut: "28/12",
    guests: { adults: 5, children: 2, rooms: 2 },
  };

  const session = openPropertySession(createIdleBookingSession(), stay03, search, baseDate);
  const quote = deriveBookingQuote(session, baseDate);
  assert.ok(quote);
  assert.equal(session.step, "previewing");
  assert.equal(quote.nights, 3);
  assert.equal(quote.checkIn, "25/12/2026");
  assert.equal(quote.checkOut, "28/12/2026");
  assert.equal(quote.guests.adults, 2);
  assert.equal(quote.guests.children, 2);
  assert.equal(quote.guests.rooms, 2);

  const crossYearSearch: SearchCriteria = {
    destination: "Phú Quốc",
    checkIn: "30/12",
    checkOut: "02/01",
    guests: { adults: 4, children: 0, rooms: 1 },
  };
  const crossSession = openPropertySession(
    createIdleBookingSession(),
    stay02,
    crossYearSearch,
    baseDate
  );
  const crossQuote = deriveBookingQuote(crossSession, baseDate);
  assert.ok(crossQuote);
  assert.equal(crossQuote.nights, 3);
  assert.equal(crossQuote.checkIn, "30/12/2026");
  assert.equal(crossQuote.checkOut, "02/01/2027");
});

test("invalid calendar rollover dates fall back safely to tomorrow + 2 nights", () => {
  const badSearch: SearchCriteria = {
    destination: "",
    checkIn: "2026-02-31",
    checkOut: "2026-03-05",
    guests: { adults: 2, children: 0, rooms: 1 },
  };

  const session = openPropertySession(createIdleBookingSession(), stay02, badSearch, baseDate);
  const quote = deriveBookingQuote(session, baseDate);
  assert.ok(quote);
  assert.equal(quote.nights, 2);
  assert.equal(quote.checkIn, "21/11/2026");
  assert.equal(quote.checkOut, "23/11/2026");
});

test("preserves selections on reopen and checkout handoff for same property, resets when switching property", () => {
  let session = openPropertySession(createIdleBookingSession(), stay02, undefined, baseDate);
  session = updateSessionNights(session, 4);
  session = updateSessionAdults(session, 5);
  session = toggleSessionAmenity(session, "airport-shuttle");
  session = toggleSessionAmenity(session, "herbal-spa");
  session = toggleSessionAmenity(session, "high-speed-wifi");
  session = toggleSessionAmenity(session, "non-existent");

  session = closePreviewSession(session);
  assert.equal(session.step, "idle");
  session = openPropertySession(session, stay02, undefined, baseDate);
  assert.equal(session.nights, 4);
  assert.equal(session.guests.adults, 5);
  assert.deepEqual(session.selectedAmenityIds, ["airport-shuttle", "herbal-spa"]);

  session = startCheckoutSession(session, stay02, undefined, baseDate);
  assert.equal(session.step, "checking-out");
  const quote = deriveBookingQuote(session, baseDate);
  assert.ok(quote);
  // 2026-11-21 (Sat +20%), 22 (Sun), 23 (Mon), 24 (Tue) -> 1 weekend night surcharge
  const expectedSatSurcharge = Math.round(stay02.pricePerNight * 0.2);
  const expectedFourNights = stay02.pricePerNight * 4 + expectedSatSurcharge;
  assert.equal(quote.pricing.seasonalSurcharge, expectedSatSurcharge);
  assert.equal(quote.pricing.nightsTotal, expectedFourNights);
  assert.equal(quote.pricing.nightlyBreakdown?.length, 4);
  assert.equal(quote.pricing.nightlyBreakdown?.[0]?.reason, "weekend");
  assert.equal(quote.pricing.amenitiesFee, 650000);
  assert.equal(quote.pricing.cleaningFee, 150000);
  assert.equal(quote.pricing.discount, 0);
  assert.equal(
    quote.pricing.total,
    expectedFourNights + 150000 + 650000
  );

  // Applying a valid voucher dynamically reduces total and records appliedPromoCode
  const withVoucher = deriveBookingQuote(
    setSessionPromoCode(session, "luxestay250"),
    baseDate,
    { vouchers: PROMOTION_VOUCHERS, now: baseDate }
  );
  assert.ok(withVoucher);
  assert.equal(withVoucher.pricing.appliedPromoCode, "LUXESTAY250");
  assert.equal(withVoucher.pricing.discount, 250000);
  assert.equal(
    withVoucher.pricing.total,
    expectedFourNights + 150000 + 650000 - 250000
  );

  session = removeSessionAmenity(session, "herbal-spa");
  const afterRemove = deriveBookingQuote(session, baseDate);
  assert.ok(afterRemove);
  assert.equal(afterRemove.pricing.amenitiesFee, 0);
  assert.deepEqual(afterRemove.selectedAmenityIds, ["airport-shuttle"]);

  const switched = startCheckoutSession(session, stay03, undefined, baseDate);
  assert.equal(switched.step, "checking-out");
  assert.equal(switched.property?.id, stay03.id);
  assert.equal(switched.nights, 2);
  assert.equal(switched.guests.adults, 2);
  assert.deepEqual(switched.selectedAmenityIds, []);
});

test("updateSessionNights and updateSessionAdults enforce valid invariants even on out-of-range input", () => {
  let session = openPropertySession(createIdleBookingSession(), stay03, undefined, baseDate);
  session = updateSessionNights(session, 0);
  assert.equal(session.nights, 1);
  session = updateSessionNights(session, 99);
  assert.equal(session.nights, 30);
  session = updateSessionAdults(session, 0);
  assert.equal(session.guests.adults, 1);
  session = updateSessionAdults(session, 10);
  assert.equal(session.guests.adults, stay03.maxGuests);
});

test("validateCheckoutGuestInput rejects missing required fields or invalid email", () => {
  assert.equal(
    validateCheckoutGuestInput({
      fullName: "   ",
      phone: "0912345678",
      email: "a@b.com",
      paymentMethod: "momo",
    }).ok,
    false
  );
  assert.equal(
    validateCheckoutGuestInput({
      fullName: "Nguyễn Văn A",
      phone: "",
      email: "a@b.com",
      paymentMethod: "momo",
    }).ok,
    false
  );
  assert.equal(
    validateCheckoutGuestInput({
      fullName: "Nguyễn Văn A",
      phone: "invalid-phone",
      email: "a@b.com",
      paymentMethod: "momo",
    }).ok,
    false
  );
  assert.equal(
    validateCheckoutGuestInput({
      fullName: "Nguyễn Văn A",
      phone: "0912345678",
      email: "invalid-email",
      paymentMethod: "momo",
    }).ok,
    false
  );
  const valid = validateCheckoutGuestInput({
    fullName: " Nguyễn Văn A ",
    phone: " 0912 345 678 ",
    email: " test@example.com ",
    note: " Tầng cao ",
    paymentMethod: "vnpay",
  });
  assert.equal(valid.ok, true);
  if (valid.ok) {
    assert.equal(valid.value.fullName, "Nguyễn Văn A");
    assert.equal(valid.value.email, "test@example.com");
  }
});

test("submitBookingSession validates, submits via submitter seam, snapshots receipt, and resets draft state", async () => {
  const search: SearchCriteria = {
    destination: "Phú Quốc",
    checkIn: "2026-12-10",
    checkOut: "2026-12-13",
    guests: { adults: 3, children: 1, rooms: 1 },
  };
  let session = startCheckoutSession(createIdleBookingSession(), stay02, search, baseDate);
  session = toggleSessionAmenity(session, "airport-shuttle");
  session = toggleSessionAmenity(session, "herbal-spa");

  const adapter = createTestSubmitter({
    bookingId: "LX-TEST99",
    createdAt: "2026-11-21T08:00:00.000Z",
  });

  const bad = await submitBookingSession(
    session,
    { fullName: "", phone: "", email: "", paymentMethod: "momo" },
    adapter,
    { fallbackBaseDate: baseDate }
  );
  assert.equal(bad.ok, false);

  const res = await submitBookingSession(
    session,
    {
      fullName: "Nguyễn Văn A",
      phone: "0912 345 678",
      email: "nguyenvana@gmail.com",
      note: "Đón chuyến bay VN1825",
      paymentMethod: "momo",
    },
    adapter,
    { fallbackBaseDate: baseDate }
  );

  assert.equal(res.ok, true);
  if (res.ok) {
    assert.equal(res.booking.bookingId, "LX-TEST99");
    assert.equal(res.booking.checkIn, "10/12/2026");
    assert.equal(res.booking.checkOut, "13/12/2026");
    assert.equal(res.booking.nights, 3);
    assert.deepEqual(res.booking.guests, { adults: 3, children: 1, rooms: 1 });
    assert.equal(res.booking.pricing.amenitiesFee, 650000);
    assert.equal(res.booking.selectedAmenities.length, 2);

    assert.equal(res.nextSession.step, "confirmed");
    assert.equal(res.nextSession.property, null);
    assert.equal(res.nextSession.nights, 2);
    assert.deepEqual(res.nextSession.selectedAmenityIds, []);
    assert.equal(res.nextSession.confirmedBooking?.bookingId, "LX-TEST99");
  }
});

test("reopening a closed property re-seeds when SearchBar criteria changed, while preserving edits when unchanged", () => {
  const initialSearch: SearchCriteria = {
    destination: "Phú Quốc",
    checkIn: "14/11",
    checkOut: "16/11",
    guests: { adults: 2, children: 0, rooms: 1 },
  };
  let session = openPropertySession(createIdleBookingSession(), stay02, initialSearch, baseDate);
  session = updateSessionNights(session, 4);
  session = toggleSessionAmenity(session, "herbal-spa");
  session = closePreviewSession(session);

  const reopenedSameSearch = openPropertySession(session, stay02, initialSearch, baseDate);
  assert.equal(reopenedSameSearch.nights, 4);
  assert.deepEqual(reopenedSameSearch.selectedAmenityIds, ["herbal-spa"]);

  const closedAgain = closePreviewSession(reopenedSameSearch);
  const updatedSearch: SearchCriteria = {
    destination: "Phú Quốc",
    checkIn: "25/12",
    checkOut: "28/12",
    guests: { adults: 4, children: 1, rooms: 2 },
  };
  const reopenedNewSearch = openPropertySession(closedAgain, stay02, updatedSearch, baseDate);
  const quote = deriveBookingQuote(reopenedNewSearch, baseDate);
  assert.ok(quote);
  assert.equal(quote.nights, 3);
  assert.equal(quote.checkIn, "25/12/2026");
  assert.equal(quote.checkOut, "28/12/2026");
  assert.deepEqual(quote.guests, { adults: 4, children: 1, rooms: 2 });
});

test("same-day or backwards DD/MM SearchBar ranges fall back to default 2 nights instead of clamping to 30", () => {
  const sameDay: SearchCriteria = {
    destination: "",
    checkIn: "25/12",
    checkOut: "25/12",
    guests: { adults: 2, children: 0, rooms: 1 },
  };
  const reversed: SearchCriteria = {
    destination: "",
    checkIn: "20/11",
    checkOut: "18/11",
    guests: { adults: 2, children: 0, rooms: 1 },
  };

  assert.equal(openPropertySession(createIdleBookingSession(), stay02, sameDay, baseDate).nights, 2);
  assert.equal(openPropertySession(createIdleBookingSession(), stay02, reversed, baseDate).nights, 2);
});

test("submitBookingSession rejects closed idle session and enforces AbortSignal even if adapter ignores signal", async () => {
  let called = false;
  const stub = createTestSubmitter();
  const ignoringAdapter: ReservationSubmitter = {
    async submit(req) {
      called = true;
      return stub.submit(req);
    },
  };

  const closedSession = closeCheckoutSession(
    startCheckoutSession(createIdleBookingSession(), stay02, undefined, baseDate)
  );
  const closedRes = await submitBookingSession(
    closedSession,
    {
      fullName: "Nguyễn Văn A",
      phone: "0912 345 678",
      email: "a@b.com",
      paymentMethod: "momo",
    },
    ignoringAdapter,
    { fallbackBaseDate: baseDate }
  );
  assert.equal(closedRes.ok, false);
  assert.equal(called, false);

  const controller = new AbortController();
  const activeSession = startCheckoutSession(createIdleBookingSession(), stay02, undefined, baseDate);
  const raceAdapter: ReservationSubmitter = {
    async submit(req) {
      controller.abort();
      return stub.submit(req);
    },
  };
  await assert.rejects(
    submitBookingSession(
      activeSession,
      {
        fullName: "Nguyễn Văn A",
        phone: "0912 345 678",
        email: "a@b.com",
        paymentMethod: "momo",
      },
      raceAdapter,
      { signal: controller.signal, fallbackBaseDate: baseDate }
    ),
    (err: unknown) => err instanceof Error && err.name === "AbortError"
  );
});

test("processServerReservationIntent recalculates authoritative server pricing and ignores unknown/included amenities", () => {
  const unknownProperty = processServerReservationIntent(
    {
      propertyId: "non-existent",
      nights: 2,
      guests: { adults: 2, children: 0, rooms: 1 },
      selectedAmenityIds: [],
      guestInfo: {
        fullName: "Nguyễn Văn A",
        phone: "0912345678",
        email: "a@b.com",
      },
      paymentMethod: "momo",
    },
    PROPERTIES,
    { fallbackBaseDate: baseDate }
  );
  assert.equal(unknownProperty.ok, false);
  if (!unknownProperty.ok) {
    assert.equal(unknownProperty.status, 404);
  }

  const res = processServerReservationIntent(
    {
      propertyId: "stay-02",
      checkInSeed: "2026-12-10",
      nights: 3,
      guests: { adults: 99, children: 1, rooms: 1 },
      selectedAmenityIds: ["herbal-spa", "airport-shuttle", "high-speed-wifi", "non-existent-id"],
      guestInfo: {
        fullName: " Trần Thị B ",
        phone: "+84 912 345 678",
        email: "tranthib@example.com",
      },
      paymentMethod: "vnpay",
    },
    PROPERTIES,
    {
      bookingId: "LX-SERVER1",
      createdAt: "2026-11-22T10:00:00.000Z",
      fallbackBaseDate: baseDate,
    }
  );
  assert.equal(res.ok, true);
  if (res.ok) {
    // 2026-12-10 (Thu base), 2026-12-11 (Fri +20%), 2026-12-12 (Sat +20%)
    const weekendPerNight = Math.round(stay02.pricePerNight * 0.2);
    const expectedSeasonal = weekendPerNight * 2;
    const expectedNightsTotal = stay02.pricePerNight * 3 + expectedSeasonal;
    assert.equal(res.booking.bookingId, "LX-SERVER1");
    assert.equal(res.booking.status, "pending_payment");
    assert.ok(res.booking.paymentExpiresAt);
    assert.equal(res.booking.guests.adults, stay02.maxGuests);
    assert.equal(res.booking.selectedAmenities.length, 2);
    assert.equal(res.booking.pricing.seasonalSurcharge, expectedSeasonal);
    assert.equal(res.booking.pricing.nightsTotal, expectedNightsTotal);
    assert.equal(res.booking.pricing.amenitiesFee, 650000);
    assert.equal(res.booking.pricing.discount, 0);
    assert.equal(
      res.booking.pricing.total,
      expectedNightsTotal + 150000 + 650000
    );
  }
});

test("matchesReservationContact normalizes VN phones & case-insensitive email, and evaluateReservationCancellation enforces ownership and freeCancellation policy", () => {
  const freeCancelProp = PROPERTIES.find((p) => p.freeCancellation)!;
  const nonFreeProp = { ...freeCancelProp, id: "stay-non-free", freeCancellation: false };

  const created = processServerReservationIntent(
    {
      propertyId: freeCancelProp.id,
      checkInSeed: "2026-12-10",
      nights: 2,
      guests: { adults: 2, children: 0, rooms: 1 },
      selectedAmenityIds: [],
      guestInfo: {
        fullName: "Nguyễn Văn A",
        phone: "0912 345 678",
        email: "Guest@LuxeStay.vn",
      },
      paymentMethod: "hotel",
    },
    PROPERTIES,
    {
      bookingId: "LX-CAN01",
      createdAt: "2026-11-24T00:00:00.000Z",
      fallbackBaseDate: baseDate,
      userId: "user-owner-1",
    }
  );
  assert.equal(created.ok, true);
  if (!created.ok) return;

  assert.equal(created.booking.status, "confirmed");
  assert.equal(matchesReservationContact(created.booking, "guest@luxestay.vn"), true);
  assert.equal(matchesReservationContact(created.booking, "+84 912-345-678"), true);
  assert.equal(matchesReservationContact(created.booking, "84912345678"), true);
  assert.equal(matchesReservationContact(created.booking, "other@luxestay.vn"), false);
  assert.equal(matchesReservationContact(created.booking, "0988888888"), false);

  // Wrong contact -> 403 FORBIDDEN
  const wrongContact = evaluateReservationCancellation(created.booking, {
    contact: "intruder@example.com",
  });
  assert.equal(wrongContact.ok, false);
  if (!wrongContact.ok) {
    assert.equal(wrongContact.status, 403);
    assert.equal(wrongContact.code, "FORBIDDEN");
  }

  // Non-free cancellation property -> 409 CONFLICT for confirmed bookings
  const strictBooking = { ...created.booking, property: nonFreeProp };
  const blockedByPolicy = evaluateReservationCancellation(strictBooking, {
    contact: "guest@luxestay.vn",
  });
  assert.equal(blockedByPolicy.ok, false);
  if (!blockedByPolicy.ok) {
    assert.equal(blockedByPolicy.status, 409);
    assert.equal(blockedByPolicy.code, "CONFLICT");
  }

  // Pending payment booking on non-free property CAN be cancelled freely by owner userId without contact
  const pendingStrict = { ...strictBooking, status: "pending_payment" as const };
  const cancelPendingByOwner = evaluateReservationCancellation(
    pendingStrict,
    { reason: "Đổi phương thức thanh toán" },
    { authenticatedUserId: "user-owner-1" }
  );
  assert.equal(cancelPendingByOwner.ok, true);

  // Valid cancellation -> frozen cancelled booking
  const cancelled = evaluateReservationCancellation(
    created.booking,
    { contact: "+84912345678", reason: "Đổi lịch công tác" },
    { cancelledAt: "2026-11-24T12:00:00.000Z" }
  );
  assert.equal(cancelled.ok, true);
  if (cancelled.ok) {
    assert.equal(cancelled.booking.status, "cancelled");
    assert.equal(cancelled.booking.cancelledAt, "2026-11-24T12:00:00.000Z");
    assert.equal(cancelled.booking.cancellationReason, "Đổi lịch công tác");
    assert.equal(Object.isFrozen(cancelled.booking), true);

    // Double cancellation -> 409 CONFLICT
    const doubleCancel = evaluateReservationCancellation(cancelled.booking, {
      contact: "guest@luxestay.vn",
    });
    assert.equal(doubleCancel.ok, false);
    if (!doubleCancel.ok) {
      assert.equal(doubleCancel.status, 409);
      assert.equal(doubleCancel.code, "CONFLICT");
    }
  }
});

test("evaluatePromotionVoucher validates fixed/percent/cap/minOrder/expiry/memberOnly and processServerReservationIntent enforces vouchers", () => {
  // LUXESTAY250: fixed 250k, min 1.5M
  const lowOrder = evaluatePromotionVoucher("luxestay250", 1200000, PROMOTION_VOUCHERS, {
    now: baseDate,
  });
  assert.equal(lowOrder.ok, false);
  if (!lowOrder.ok) assert.equal(lowOrder.reason, "MIN_ORDER");

  const validFixed = evaluatePromotionVoucher("  luxestay250  ", 2000000, PROMOTION_VOUCHERS, {
    now: baseDate,
  });
  assert.equal(validFixed.ok, true);
  if (validFixed.ok) {
    assert.equal(validFixed.code, "LUXESTAY250");
    assert.equal(validFixed.discount, 250000);
  }

  // SUMMERVIBE: 10% capped at 500k
  const uncappedPercent = evaluatePromotionVoucher("SUMMERVIBE", 2500000, PROMOTION_VOUCHERS, {
    now: baseDate,
  });
  assert.equal(uncappedPercent.ok, true);
  if (uncappedPercent.ok) assert.equal(uncappedPercent.discount, 250000);

  const cappedPercent = evaluatePromotionVoucher("SUMMERVIBE", 10000000, PROMOTION_VOUCHERS, {
    now: baseDate,
  });
  assert.equal(cappedPercent.ok, true);
  if (cappedPercent.ok) assert.equal(cappedPercent.discount, 500000);

  // Expired voucher
  const expired = evaluatePromotionVoucher("SUMMERVIBE", 2000000, PROMOTION_VOUCHERS, {
    now: new Date("2026-12-05T00:00:00.000Z"),
  });
  assert.equal(expired.ok, false);
  if (!expired.ok) assert.equal(expired.reason, "EXPIRED");

  // Member-only voucher
  const memberVoucher = {
    ...PROMOTION_VOUCHERS[0],
    id: "voucher-member",
    code: "MEMBERVIP",
    memberOnly: true,
    minOrderTotal: 0,
  };
  const guestBlocked = evaluatePromotionVoucher("MEMBERVIP", 2000000, [memberVoucher], {
    now: baseDate,
    isAuthenticated: false,
  });
  assert.equal(guestBlocked.ok, false);
  if (!guestBlocked.ok) assert.equal(guestBlocked.reason, "MEMBER_ONLY");

  const memberAllowed = evaluatePromotionVoucher("MEMBERVIP", 2000000, [memberVoucher], {
    now: baseDate,
    isAuthenticated: true,
  });
  assert.equal(memberAllowed.ok, true);

  // Server intent rejects invalid promoCode with 400 and applies valid promoCode authoritatively
  const badIntent = processServerReservationIntent(
    {
      propertyId: "stay-02",
      nights: 2,
      guests: { adults: 2, children: 0, rooms: 1 },
      selectedAmenityIds: [],
      guestInfo: { fullName: "Khách Test", phone: "0912345678", email: "test@luxestay.vn" },
      paymentMethod: "vnpay",
      promoCode: "FAKECODE99",
    },
    PROPERTIES,
    { fallbackBaseDate: baseDate, vouchers: PROMOTION_VOUCHERS }
  );
  assert.equal(badIntent.ok, false);
  if (!badIntent.ok) assert.equal(badIntent.status, 400);

  const goodIntent = processServerReservationIntent(
    {
      propertyId: "stay-02",
      nights: 2,
      guests: { adults: 2, children: 0, rooms: 1 },
      selectedAmenityIds: [],
      guestInfo: { fullName: "Khách Test", phone: "0912345678", email: "test@luxestay.vn" },
      paymentMethod: "vnpay",
      promoCode: "SUMMERVIBE",
    },
    PROPERTIES,
    { fallbackBaseDate: baseDate, vouchers: PROMOTION_VOUCHERS }
  );
  assert.equal(goodIntent.ok, true);
  if (goodIntent.ok) {
    // 2026-11-21 (Sat +20%), 2026-11-22 (Sun base)
    const satSurcharge = Math.round(stay02.pricePerNight * 0.2);
    const subtotal = stay02.pricePerNight * 2 + satSurcharge + 150000;
    const expectedDiscount = Math.min(500000, Math.round(subtotal * 0.1));
    assert.equal(goodIntent.booking.pricing.seasonalSurcharge, satSurcharge);
    assert.equal(goodIntent.booking.pricing.appliedPromoCode, "SUMMERVIBE");
    assert.equal(goodIntent.booking.pricing.discount, expectedDiscount);
    assert.equal(goodIntent.booking.pricing.total, subtotal - expectedDiscount);
    assert.equal(goodIntent.booking.status, "pending_payment");
  }
});

test("evaluatePaymentWebhookTransition enforces pending_payment state transitions and rejects terminal overrides", () => {
  const created = processServerReservationIntent(
    {
      propertyId: "stay-02",
      nights: 2,
      guests: { adults: 2, children: 0, rooms: 1 },
      selectedAmenityIds: [],
      guestInfo: { fullName: "Khách Pay", phone: "0912345678", email: "pay@luxestay.vn" },
      paymentMethod: "momo",
    },
    PROPERTIES,
    { bookingId: "LX-PAY01", fallbackBaseDate: baseDate }
  );
  assert.equal(created.ok, true);
  if (!created.ok) return;
  assert.equal(created.booking.status, "pending_payment");

  const succeeded = evaluatePaymentWebhookTransition(created.booking, "succeeded");
  assert.equal(succeeded.ok, true);
  if (succeeded.ok) {
    assert.equal(succeeded.changed, true);
    assert.equal(succeeded.nextStatus, "confirmed");
    assert.equal(succeeded.booking.status, "confirmed");

    // Replaying same outcome is idempotent no-op
    const replay = evaluatePaymentWebhookTransition(succeeded.booking, "succeeded");
    assert.equal(replay.ok, true);
    if (replay.ok) assert.equal(replay.changed, false);

    // Conflicting transition from confirmed -> failed is blocked (409)
    const conflict = evaluatePaymentWebhookTransition(succeeded.booking, "failed");
    assert.equal(conflict.ok, false);
    if (!conflict.ok) assert.equal(conflict.status, 409);
  }

  const expired = evaluatePaymentWebhookTransition(created.booking, "expired");
  assert.equal(expired.ok, true);
  if (expired.ok) assert.equal(expired.nextStatus, "expired");
});

test("openPropertySession and startCheckoutSession carry initialPromoCode and processServerReservationIntent enforces property and newUserOnly eligibility", () => {
  const stay01 = PROPERTIES.find((p) => p.id === "stay-01")!;

  const previewWithPromo = openPropertySession(
    createIdleBookingSession(),
    stay01,
    undefined,
    baseDate,
    " welcome150 "
  );
  assert.equal(previewWithPromo.promoCode, "WELCOME150");

  const checkoutWithPromo = startCheckoutSession(
    previewWithPromo,
    stay01,
    undefined,
    baseDate
  );
  assert.equal(checkoutWithPromo.promoCode, "WELCOME150");

  const quoteAllowed = deriveBookingQuote(checkoutWithPromo, baseDate, {
    vouchers: PROMOTION_VOUCHERS,
    now: baseDate,
    isAuthenticated: true,
    hasPriorSuccessfulBookings: false,
  });
  assert.ok(quoteAllowed);
  assert.equal(quoteAllowed.pricing.appliedPromoCode, "WELCOME150");
  assert.equal(quoteAllowed.pricing.discount, 150000);

  const quoteRepeatBlocked = deriveBookingQuote(checkoutWithPromo, baseDate, {
    vouchers: PROMOTION_VOUCHERS,
    now: baseDate,
    isAuthenticated: true,
    hasPriorSuccessfulBookings: true,
  });
  assert.ok(quoteRepeatBlocked);
  assert.equal(quoteRepeatBlocked.pricing.appliedPromoCode, undefined);
  assert.equal(quoteRepeatBlocked.pricing.discount, 0);

  const homestayOnHotel = processServerReservationIntent(
    {
      propertyId: "stay-03",
      nights: 2,
      guests: { adults: 2, children: 0, rooms: 1 },
      selectedAmenityIds: [],
      guestInfo: { fullName: "Khách Test", phone: "0912345678", email: "test@luxestay.vn" },
      paymentMethod: "vnpay",
      promoCode: "HOMESTAY10",
    },
    PROPERTIES,
    { fallbackBaseDate: baseDate, vouchers: PROMOTION_VOUCHERS }
  );
  assert.equal(homestayOnHotel.ok, false);
  if (!homestayOnHotel.ok) assert.equal(homestayOnHotel.status, 400);

  const welcomeRepeatBlocked = processServerReservationIntent(
    {
      propertyId: "stay-01",
      nights: 2,
      guests: { adults: 2, children: 0, rooms: 1 },
      selectedAmenityIds: [],
      guestInfo: { fullName: "Khách Cũ", phone: "0912345678", email: "repeat@luxestay.vn" },
      paymentMethod: "hotel",
      promoCode: "WELCOME150",
    },
    PROPERTIES,
    {
      fallbackBaseDate: baseDate,
      vouchers: PROMOTION_VOUCHERS,
      userId: "USR-REPEAT-1",
      isAuthenticated: true,
      hasPriorSuccessfulBookings: true,
    }
  );
  assert.equal(welcomeRepeatBlocked.ok, false);
  if (!welcomeRepeatBlocked.ok) assert.equal(welcomeRepeatBlocked.status, 400);
});
