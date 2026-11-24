import test from "node:test";
import assert from "node:assert/strict";
import {
  API_ENDPOINTS,
  ApiErrorResponseSchema,
  buildApiError,
  buildApiSuccess,
  CancelReservationInputSchema,
  createApiSuccessSchema,
  GuestInfoSchema,
  HealthDataSchema,
  ReservationLookupInputSchema,
  ServerReservationIntentSchema,
} from "../dist/index.js";

test("ApiSuccess and ApiError builders produce contract-compliant envelopes", () => {
  const healthSuccess = buildApiSuccess(
    { status: "ok" as const, service: "luxestay-api" },
    { requestId: "req-1", timestamp: "2026-11-24T00:00:00.000Z" }
  );
  const parsedSuccess = createApiSuccessSchema(HealthDataSchema).safeParse(healthSuccess);
  assert.equal(parsedSuccess.success, true);

  const errorEnvelope = buildApiError(
    "VALIDATION_ERROR",
    "Dữ liệu không hợp lệ",
    [{ field: "guestInfo.phone" }],
    { requestId: "req-2", timestamp: "2026-11-24T00:00:00.000Z" }
  );
  const parsedError = ApiErrorResponseSchema.safeParse(errorEnvelope);
  assert.equal(parsedError.success, true);
});

test("ServerReservationIntentSchema accepts valid intent, strips unknown fields, and rejects bad phone/email", () => {
  const validPayload = {
    propertyId: "stay-01",
    checkInSeed: "2026-12-20",
    nights: 3,
    guests: { adults: 2, children: 0, rooms: 1 },
    selectedAmenityIds: ["airport-shuttle"],
    guestInfo: {
      fullName: "  Nguyễn Văn A  ",
      phone: "0912 345 678",
      email: "guest@luxestay.vn",
      note: "  ",
    },
    paymentMethod: "momo",
    pricing: { total: 1 }, // client tampering attempt must be stripped
  };

  const okResult = ServerReservationIntentSchema.safeParse(validPayload);
  assert.equal(okResult.success, true);
  if (okResult.success) {
    assert.equal(okResult.data.guestInfo.fullName, "Nguyễn Văn A");
    assert.equal(okResult.data.guestInfo.note, undefined);
    assert.equal("pricing" in okResult.data, false);
  }

  const badPhone = GuestInfoSchema.safeParse({
    fullName: "Nguyễn Văn A",
    phone: "12345",
    email: "guest@luxestay.vn",
  });
  assert.equal(badPhone.success, false);

  const badEmail = GuestInfoSchema.safeParse({
    fullName: "Nguyễn Văn A",
    phone: "+84912345678",
    email: "not-an-email",
  });
  assert.equal(badEmail.success, false);
});

test("API_ENDPOINTS exposes versioned paths and encodes property & reservation IDs safely", () => {
  assert.equal(API_ENDPOINTS.health, "/health");
  assert.equal(API_ENDPOINTS.catalog, "/api/v1/catalog");
  assert.equal(API_ENDPOINTS.reservations, "/api/v1/reservations");
  assert.equal(API_ENDPOINTS.propertyById("stay-01"), "/api/v1/properties/stay-01");
  assert.equal(API_ENDPOINTS.propertyById("a/b c"), "/api/v1/properties/a%2Fb%20c");
  assert.equal(API_ENDPOINTS.reservationById(" lx-ab1234 "), "/api/v1/reservations/LX-AB1234");
  assert.equal(
    API_ENDPOINTS.cancelReservation("lx-ab1234"),
    "/api/v1/reservations/LX-AB1234/cancel"
  );
});

test("ReservationLookupInputSchema and CancelReservationInputSchema normalize inputs and enforce required contact", () => {
  const lookup = ReservationLookupInputSchema.safeParse({
    bookingId: " lx-123abc ",
    contact: " guest@luxestay.vn ",
  });
  assert.equal(lookup.success, true);
  if (lookup.success) {
    assert.equal(lookup.data.bookingId, "LX-123ABC");
    assert.equal(lookup.data.contact, "guest@luxestay.vn");
  }

  assert.equal(
    ReservationLookupInputSchema.safeParse({ bookingId: "", contact: "a@b.com" }).success,
    false
  );
  assert.equal(
    CancelReservationInputSchema.safeParse({ contact: "   " }).success,
    false
  );

  const cancel = CancelReservationInputSchema.safeParse({
    contact: "0912345678",
    reason: "  Đổi lịch công tác  ",
  });
  assert.equal(cancel.success, true);
  if (cancel.success) {
    assert.equal(cancel.data.reason, "Đổi lịch công tác");
  }
});
