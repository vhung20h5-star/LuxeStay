import test from "node:test";
import assert from "node:assert/strict";
import { PROPERTIES } from "@/data/properties";
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
  deriveBookingQuote,
  validateCheckoutGuestInput,
  submitBookingSession,
  createBrowserReservationAdapter,
  createInMemoryReservationAdapter,
} from "@/lib/bookingSession";
import type { SearchCriteria } from "@/types";

const stay02 = PROPERTIES.find((p) => p.id === "stay-02")!; // maxGuests 6, airport-shuttle free-reservation, herbal-spa paid 650_000
const stay03 = PROPERTIES.find((p) => p.id === "stay-03")!; // maxGuests 2, herbal-spa paid 480_000

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
  assert.equal(quote.guests.adults, 2); // clamped from 5 -> stay03.maxGuests (2)
  assert.equal(quote.guests.children, 2);
  assert.equal(quote.guests.rooms, 2);

  // Cross-year range: 30/12 -> 02/01 should yield 3 nights into 2027
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
  session = toggleSessionAmenity(session, "airport-shuttle"); // free-reservation
  session = toggleSessionAmenity(session, "herbal-spa"); // paid 650_000
  session = toggleSessionAmenity(session, "high-speed-wifi"); // included -> ignored
  session = toggleSessionAmenity(session, "non-existent"); // unknown -> ignored

  // Close preview and reopen same property -> preserves draft
  session = closePreviewSession(session);
  assert.equal(session.step, "idle");
  session = openPropertySession(session, stay02, undefined, baseDate);
  assert.equal(session.nights, 4);
  assert.equal(session.guests.adults, 5);
  assert.deepEqual(session.selectedAmenityIds, ["airport-shuttle", "herbal-spa"]);

  // Proceed to checkout for same property -> preserves draft & updates quote
  session = startCheckoutSession(session, stay02, undefined, baseDate);
  assert.equal(session.step, "checking-out");
  const quote = deriveBookingQuote(session, baseDate);
  assert.ok(quote);
  assert.equal(quote.pricing.nightsTotal, stay02.pricePerNight * 4);
  assert.equal(quote.pricing.amenitiesFee, 650000);
  assert.equal(quote.pricing.cleaningFee, 150000);
  assert.equal(quote.pricing.discount, 100000);
  assert.equal(
    quote.pricing.total,
    stay02.pricePerNight * 4 + 150000 + 650000 - 100000
  );

  // Removing paid add-on recalculates total immediately
  session = removeSessionAmenity(session, "herbal-spa");
  const afterRemove = deriveBookingQuote(session, baseDate);
  assert.ok(afterRemove);
  assert.equal(afterRemove.pricing.amenitiesFee, 0);
  assert.deepEqual(afterRemove.selectedAmenityIds, ["airport-shuttle"]);

  // Direct checkout on a different property resets selections and clamps adults
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

test("submitBookingSession validates, submits via InMemoryReservationAdapter, snapshots receipt, and resets draft state", async () => {
  const search: SearchCriteria = {
    destination: "Phú Quốc",
    checkIn: "2026-12-10",
    checkOut: "2026-12-13",
    guests: { adults: 3, children: 1, rooms: 1 },
  };
  let session = startCheckoutSession(createIdleBookingSession(), stay02, search, baseDate);
  session = toggleSessionAmenity(session, "airport-shuttle");
  session = toggleSessionAmenity(session, "herbal-spa");

  const adapter = createInMemoryReservationAdapter({
    bookingId: "LX-TEST99",
    createdAt: "2026-11-21T08:00:00.000Z",
  });

  // Invalid submission does not call adapter
  const bad = await submitBookingSession(
    session,
    { fullName: "", phone: "", email: "", paymentMethod: "momo" },
    adapter,
    { fallbackBaseDate: baseDate }
  );
  assert.equal(bad.ok, false);

  // Valid submission succeeds and resets session cleanly
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

    // Next session is completely clean and holds confirmedBooking
    assert.equal(res.nextSession.step, "confirmed");
    assert.equal(res.nextSession.property, null);
    assert.equal(res.nextSession.nights, 2);
    assert.deepEqual(res.nextSession.selectedAmenityIds, []);
    assert.equal(res.nextSession.confirmedBooking?.bookingId, "LX-TEST99");
  }
});

test("BrowserReservationAdapter aborts cleanly when AbortSignal cancels mid-submit", async () => {
  const session = startCheckoutSession(createIdleBookingSession(), stay02, undefined, baseDate);
  const adapter = createBrowserReservationAdapter(500);
  const controller = new AbortController();

  const promise = submitBookingSession(
    session,
    {
      fullName: "Nguyễn Văn A",
      phone: "0912 345 678",
      email: "nguyenvana@gmail.com",
      paymentMethod: "card",
    },
    adapter,
    { signal: controller.signal, fallbackBaseDate: baseDate }
  );

  controller.abort();

  await assert.rejects(promise, (err: unknown) => {
    return err instanceof Error && err.name === "AbortError";
  });
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

  // Reopen with unchanged SearchBar -> keeps user's 4 nights & spa
  const reopenedSameSearch = openPropertySession(session, stay02, initialSearch, baseDate);
  assert.equal(reopenedSameSearch.nights, 4);
  assert.deepEqual(reopenedSameSearch.selectedAmenityIds, ["herbal-spa"]);

  // Close again, user edits SearchBar -> reopen must pick up updated dates & guests
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
  const ignoringAdapter = {
    async submit(req: Parameters<ReturnType<typeof createInMemoryReservationAdapter>["submit"]>[0]) {
      called = true;
      return createInMemoryReservationAdapter().submit(req);
    },
  };

  // Closed (idle) session must fail without calling adapter
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

  // Adapter that ignores AbortSignal and aborts mid-flight still throws AbortError
  const controller = new AbortController();
  const activeSession = startCheckoutSession(createIdleBookingSession(), stay02, undefined, baseDate);
  const raceAdapter = {
    async submit(req: Parameters<ReturnType<typeof createInMemoryReservationAdapter>["submit"]>[0]) {
      controller.abort();
      return createInMemoryReservationAdapter().submit(req);
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
