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
  LoginInputSchema,
  OtpRequestInputSchema,
  OtpVerifyInputSchema,
  PaymentWebhookPayloadSchema,
  RegisterInputSchema,
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

test("Phase 2 auth, voucher, and payment webhook contracts validate payloads and endpoints", () => {
  const reg = RegisterInputSchema.safeParse({
    fullName: "  Lê Minh Anh  ",
    email: "  ANH@LUXESTAY.VN ",
    phone: "0912345678",
    password: "secret123",
  });
  assert.equal(reg.success, true);
  if (reg.success) {
    assert.equal(reg.data.email, "anh@luxestay.vn");
    assert.equal(reg.data.fullName, "Lê Minh Anh");
  }

  assert.equal(LoginInputSchema.safeParse({ email: "bad", password: "123" }).success, false);
  assert.equal(OtpRequestInputSchema.safeParse({ identifier: "0912345678" }).success, true);
  assert.equal(OtpRequestInputSchema.safeParse({ identifier: "user@luxestay.vn" }).success, true);
  assert.equal(OtpRequestInputSchema.safeParse({ identifier: "invalid" }).success, false);
  assert.equal(OtpVerifyInputSchema.safeParse({ identifier: "0912345678", code: "123456" }).success, true);
  assert.equal(OtpVerifyInputSchema.safeParse({ identifier: "0912345678", code: "12ab" }).success, false);

  const intentWithPromo = ServerReservationIntentSchema.safeParse({
    propertyId: "stay-01",
    nights: 2,
    guests: { adults: 2, children: 0, rooms: 1 },
    guestInfo: { fullName: "Test User", phone: "0912345678", email: "test@luxestay.vn" },
    paymentMethod: "vnpay",
    promoCode: " luxestay250 ",
  });
  assert.equal(intentWithPromo.success, true);
  if (intentWithPromo.success) {
    assert.equal(intentWithPromo.data.promoCode, "LUXESTAY250");
  }

  const webhook = PaymentWebhookPayloadSchema.safeParse({
    eventId: "evt-001",
    transactionId: "TXN-ABC123",
    bookingId: "LX-123456",
    provider: "vnpay",
    outcome: "succeeded",
    amount: 2500000,
    occurredAt: "2026-11-24T08:00:00.000Z",
  });
  assert.equal(webhook.success, true);

  assert.equal(API_ENDPOINTS.validateVoucher, "/api/v1/vouchers/validate");
  assert.equal(API_ENDPOINTS.authLogin, "/api/v1/auth/login");
  assert.equal(API_ENDPOINTS.favorites, "/api/v1/favorites");
  assert.equal(API_ENDPOINTS.paymentWebhook("VNPAY"), "/api/v1/payments/webhook/vnpay");
  assert.equal(API_ENDPOINTS.paymentSimulate("txn-01"), "/api/v1/payments/TXN-01/simulate");
});
