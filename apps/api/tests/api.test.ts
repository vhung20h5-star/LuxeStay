import test from "node:test";
import assert from "node:assert/strict";
import {
  API_ENDPOINTS,
  ApiErrorResponseSchema,
  AuthSessionDataSchema,
  BookingDetailsSchema,
  CatalogSnapshotSchema,
  CreateReviewResultSchema,
  createApiSuccessSchema,
  FavoritesListDataSchema,
  HealthDataSchema,
  HostAnalyticsDataSchema,
  HostPropertiesListDataSchema,
  HostReservationsListDataSchema,
  NotificationLogSchema,
  OtpRequestResultSchema,
  PaymentGatewaySessionSchema,
  PaymentWebhookResultSchema,
  PropertyAvailabilityDataSchema,
  PropertySchema,
  VoucherValidationResultSchema,
} from "@luxestay/contracts";
import { PROPERTIES, SEED_CATALOG_SNAPSHOT } from "@luxestay/domain/seed";
import { createApiApp } from "../dist/app.js";
import { loadApiEnv } from "../dist/config/env.js";
import { resolveDatabaseConfig } from "../dist/db/client.js";
import { mapPropertyRowToDomain } from "../dist/modules/catalog/postgresRepository.js";
import { createSeedCatalogRepository } from "../dist/modules/catalog/repository.js";
import {
  signWebhookPayload,
  WEBHOOK_SIGNATURE_HEADER,
} from "../dist/modules/payments/signature.js";
import { mapReservationRowsToBookingDetails } from "../dist/modules/reservations/postgresRepository.js";
import { z } from "zod";

function extractCookieHeader(response: Response): string {
  const raw = response.headers.get("set-cookie");
  assert.ok(raw, "Expected Set-Cookie header");
  return raw.split(";")[0];
}

test("GET /health returns contract-compliant ok payload and x-request-id header", async () => {
  const { app } = createApiApp();
  const response = await app.request(API_ENDPOINTS.health, {
    headers: { "x-request-id": "trace-health-01" },
  });

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("x-request-id"), "trace-health-01");

  const body = await response.json();
  const parsed = createApiSuccessSchema(HealthDataSchema).safeParse(body);
  assert.equal(parsed.success, true);
  if (parsed.success) {
    assert.equal(parsed.data.data.status, "ok");
    assert.equal(parsed.data.meta?.requestId, "trace-health-01");
  }
});

test("GET /api/v1/catalog returns complete CatalogSnapshot validated against contract", async () => {
  const { app } = createApiApp();
  const response = await app.request(API_ENDPOINTS.catalog);

  assert.equal(response.status, 200);
  const body = await response.json();
  const parsed = createApiSuccessSchema(CatalogSnapshotSchema).safeParse(body);
  assert.equal(parsed.success, true);
  if (parsed.success) {
    assert.equal(parsed.data.data.properties.length, 12);
    assert.equal(parsed.data.data.categories.length, 9);
    assert.equal(parsed.data.data.destinations.length, 8);
    assert.equal(Object.keys(parsed.data.data.amenityCatalog).length, 51);
    assert.equal(parsed.data.data.promotions.vouchers.length, 2);
    assert.equal(parsed.data.data.testimonials.length, 3);
  }
});

test("GET /api/v1/properties/:id returns property or 404 NOT_FOUND envelope", async () => {
  const { app } = createApiApp();

  const okRes = await app.request(API_ENDPOINTS.propertyById("stay-01"));
  assert.equal(okRes.status, 200);
  const okParsed = createApiSuccessSchema(PropertySchema).safeParse(await okRes.json());
  assert.equal(okParsed.success, true);
  if (okParsed.success) {
    assert.equal(okParsed.data.data.id, "stay-01");
  }

  const missingRes = await app.request(API_ENDPOINTS.propertyById("does-not-exist"));
  assert.equal(missingRes.status, 404);
  const errParsed = ApiErrorResponseSchema.safeParse(await missingRes.json());
  assert.equal(errParsed.success, true);
  if (errParsed.success) {
    assert.equal(errParsed.data.error.code, "NOT_FOUND");
  }
});

test("POST /api/v1/reservations recalculates authoritative server pricing, handles hotel vs online status, and ignores tampered fields", async () => {
  const { app, repositories } = createApiApp();
  const stay02 = PROPERTIES.find((p) => p.id === "stay-02")!;

  const response = await app.request(API_ENDPOINTS.reservations, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      propertyId: "stay-02",
      checkInSeed: "2026-12-10",
      nights: 3,
      guests: { adults: 99, children: 1, rooms: 1 },
      selectedAmenityIds: ["herbal-spa", "airport-shuttle", "high-speed-wifi", "unknown-id"],
      guestInfo: {
        fullName: "Nguyễn Văn A",
        phone: "0912 345 678",
        email: "guest@luxestay.vn",
        note: "Tầng cao",
      },
      paymentMethod: "hotel",
      pricing: { total: 1000 },
    }),
  });

  assert.equal(response.status, 201);
  const body = await response.json();
  const parsed = createApiSuccessSchema(BookingDetailsSchema).safeParse(body);
  assert.equal(parsed.success, true);

  if (parsed.success) {
    const booking = parsed.data.data;
    // 2026-12-10 (Thu base), 2026-12-11 (Fri +20%), 2026-12-12 (Sat +20%)
    const expectedSeasonal = Math.round(stay02.pricePerNight * 0.2) * 2;
    assert.match(booking.bookingId ?? "", /^LX-[A-F0-9]{6}$/);
    assert.equal(booking.status, "confirmed");
    assert.equal(booking.guests.adults, stay02.maxGuests);
    assert.equal(booking.selectedAmenities.length, 2);
    assert.equal(booking.pricing.seasonalSurcharge, expectedSeasonal);
    assert.equal(booking.pricing.discount, 0);
    assert.equal(
      booking.pricing.total,
      stay02.pricePerNight * 3 + expectedSeasonal + 150000 + 650000
    );

    const stored = await repositories.reservations.findById(booking.bookingId!);
    assert.ok(stored);
    assert.equal(stored.pricing.total, booking.pricing.total);

    // Hotel payment immediately logs confirmation email notification
    const logs = await repositories.notifications.listByBookingId(booking.bookingId!);
    assert.equal(logs.length, 1);
    assert.equal(logs[0].type, "booking_confirmed");
  }
});

test("POST /api/v1/reservations returns structured ApiError on invalid JSON, bad validation, and unknown property", async () => {
  const { app } = createApiApp();

  const badJsonRes = await app.request(API_ENDPOINTS.reservations, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{not-json",
  });
  assert.equal(badJsonRes.status, 400);
  const badJson = ApiErrorResponseSchema.parse(await badJsonRes.json());
  assert.equal(badJson.error.code, "INVALID_JSON");

  const badPhoneRes = await app.request(API_ENDPOINTS.reservations, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      propertyId: "stay-01",
      nights: 2,
      guests: { adults: 2, children: 0, rooms: 1 },
      selectedAmenityIds: [],
      guestInfo: {
        fullName: "Nguyễn Văn A",
        phone: "12345",
        email: "guest@luxestay.vn",
      },
      paymentMethod: "momo",
    }),
  });
  assert.equal(badPhoneRes.status, 400);
  const badPhone = ApiErrorResponseSchema.parse(await badPhoneRes.json());
  assert.equal(badPhone.error.code, "VALIDATION_ERROR");

  const unknownPropRes = await app.request(API_ENDPOINTS.reservations, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      propertyId: "stay-999",
      nights: 2,
      guests: { adults: 2, children: 0, rooms: 1 },
      selectedAmenityIds: [],
      guestInfo: {
        fullName: "Nguyễn Văn A",
        phone: "0912345678",
        email: "guest@luxestay.vn",
      },
      paymentMethod: "vnpay",
    }),
  });
  assert.equal(unknownPropRes.status, 404);
  const unknownProp = ApiErrorResponseSchema.parse(await unknownPropRes.json());
  assert.equal(unknownProp.error.code, "NOT_FOUND");
});

test("GET /api/v1/reservations/:bookingId and PATCH .../cancel verify contact ownership, enforce freeCancellation, and persist cancelled state", async () => {
  const freeCancelProp = PROPERTIES.find((p) => p.freeCancellation)!;
  const nonFreeProp = { ...freeCancelProp, id: "stay-strict", freeCancellation: false };
  const customCatalog = createSeedCatalogRepository({
    ...SEED_CATALOG_SNAPSHOT,
    properties: [...SEED_CATALOG_SNAPSHOT.properties, nonFreeProp],
  });
  const { app } = createApiApp({ catalogRepository: customCatalog });

  const createRes = await app.request(API_ENDPOINTS.reservations, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      propertyId: freeCancelProp.id,
      checkInSeed: "2026-12-20",
      nights: 2,
      guests: { adults: 2, children: 0, rooms: 1 },
      selectedAmenityIds: [],
      guestInfo: {
        fullName: "Lê Minh Hoàng",
        phone: "0912 345 678",
        email: "hoang@luxestay.vn",
      },
      paymentMethod: "hotel",
    }),
  });
  assert.equal(createRes.status, 201);
  const created = createApiSuccessSchema(BookingDetailsSchema).parse(await createRes.json()).data;
  const bookingId = created.bookingId!;

  const noContact = await app.request(API_ENDPOINTS.reservationById(bookingId));
  assert.equal(noContact.status, 400);

  const wrongContact = await app.request(
    `${API_ENDPOINTS.reservationById(bookingId)}?contact=other@luxestay.vn`
  );
  assert.equal(wrongContact.status, 403);

  const unknownBooking = await app.request(
    `${API_ENDPOINTS.reservationById("LX-000000")}?contact=hoang@luxestay.vn`
  );
  assert.equal(unknownBooking.status, 404);

  const lookupByPhone = await app.request(
    `${API_ENDPOINTS.reservationById(bookingId.toLowerCase())}?contact=${encodeURIComponent("+84912345678")}`
  );
  assert.equal(lookupByPhone.status, 200);
  assert.equal(
    createApiSuccessSchema(BookingDetailsSchema).parse(await lookupByPhone.json()).data.status,
    "confirmed"
  );

  const cancelForbidden = await app.request(API_ENDPOINTS.cancelReservation(bookingId), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contact: "intruder@example.com" }),
  });
  assert.equal(cancelForbidden.status, 403);

  const cancelOk = await app.request(API_ENDPOINTS.cancelReservation(bookingId), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contact: "HOANG@luxestay.vn", reason: "Đổi lịch bay" }),
  });
  assert.equal(cancelOk.status, 200);
  const cancelled = createApiSuccessSchema(BookingDetailsSchema).parse(await cancelOk.json()).data;
  assert.equal(cancelled.status, "cancelled");
  assert.ok(cancelled.cancelledAt);
  assert.equal(cancelled.cancellationReason, "Đổi lịch bay");

  const doubleCancel = await app.request(API_ENDPOINTS.cancelReservation(bookingId), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contact: "hoang@luxestay.vn" }),
  });
  assert.equal(doubleCancel.status, 409);

  // Confirmed booking on non-free cancellation property cannot be cancelled online -> 409 CONFLICT
  const strictCreate = await app.request(API_ENDPOINTS.reservations, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      propertyId: nonFreeProp.id,
      nights: 1,
      guests: { adults: 2, children: 0, rooms: 1 },
      selectedAmenityIds: [],
      guestInfo: {
        fullName: "Lê Minh Hoàng",
        phone: "0912345678",
        email: "hoang@luxestay.vn",
      },
      paymentMethod: "hotel",
    }),
  });
  const strictBooking = createApiSuccessSchema(BookingDetailsSchema).parse(
    await strictCreate.json()
  ).data;
  const strictCancel = await app.request(API_ENDPOINTS.cancelReservation(strictBooking.bookingId!), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contact: "hoang@luxestay.vn" }),
  });
  assert.equal(strictCancel.status, 409);
});

test("Auth (password + OTP + HttpOnly session cookie), Favorites sync, and My Reservations work end-to-end", async () => {
  const { app } = createApiApp({ nodeEnv: "test" });

  // Unauthenticated /me returns user: null
  const anonMe = await app.request(API_ENDPOINTS.authMe);
  assert.equal(anonMe.status, 200);
  assert.equal(
    createApiSuccessSchema(AuthSessionDataSchema).parse(await anonMe.json()).data.user,
    null
  );

  // Unauthenticated favorites & my reservations -> 401
  assert.equal((await app.request(API_ENDPOINTS.favorites)).status, 401);
  assert.equal((await app.request(API_ENDPOINTS.myReservations)).status, 401);

  // Register account
  const regRes = await app.request(API_ENDPOINTS.authRegister, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fullName: "Phạm Gia Huy",
      email: "huy@luxestay.vn",
      phone: "0912345678",
      password: "password123",
    }),
  });
  assert.equal(regRes.status, 201);
  const sessionCookie = extractCookieHeader(regRes);
  assert.ok(regRes.headers.get("set-cookie")?.includes("HttpOnly"));

  // Duplicate email -> 409 CONFLICT
  const dupRes = await app.request(API_ENDPOINTS.authRegister, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fullName: "Phạm Gia Huy",
      email: "HUY@luxestay.vn",
      password: "password123",
    }),
  });
  assert.equal(dupRes.status, 409);

  // /auth/me with session cookie returns user
  const authedMe = await app.request(API_ENDPOINTS.authMe, {
    headers: { Cookie: sessionCookie },
  });
  const meData = createApiSuccessSchema(AuthSessionDataSchema).parse(await authedMe.json()).data;
  assert.equal(meData.user?.email, "huy@luxestay.vn");

  // Favorites merge & toggle
  const syncRes = await app.request(`${API_ENDPOINTS.favorites}?mode=merge`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Cookie: sessionCookie },
    body: JSON.stringify({ propertyIds: ["stay-01", "stay-03", "invalid-stay"] }),
  });
  assert.equal(syncRes.status, 200);
  const synced = createApiSuccessSchema(FavoritesListDataSchema).parse(await syncRes.json()).data;
  assert.deepEqual(synced.propertyIds, ["stay-01", "stay-03"]);

  const toggleRes = await app.request(API_ENDPOINTS.toggleFavorite("stay-01"), {
    method: "POST",
    headers: { Cookie: sessionCookie },
  });
  assert.equal(toggleRes.status, 200);
  const toggled = createApiSuccessSchema(FavoritesListDataSchema).parse(await toggleRes.json()).data;
  assert.deepEqual(toggled.propertyIds, ["stay-03"]);

  // Booking created while logged-in attaches userId & appears in GET /api/v1/reservations/my
  const myBookRes = await app.request(API_ENDPOINTS.reservations, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: sessionCookie },
    body: JSON.stringify({
      propertyId: "stay-01",
      nights: 2,
      guests: { adults: 2, children: 0, rooms: 1 },
      selectedAmenityIds: [],
      guestInfo: { fullName: "Phạm Gia Huy", phone: "0912345678", email: "huy@luxestay.vn" },
      paymentMethod: "hotel",
    }),
  });
  assert.equal(myBookRes.status, 201);
  const myBooking = createApiSuccessSchema(BookingDetailsSchema).parse(await myBookRes.json()).data;
  assert.equal(myBooking.userId, meData.user?.id);

  const listMyRes = await app.request(API_ENDPOINTS.myReservations, {
    headers: { Cookie: sessionCookie },
  });
  assert.equal(listMyRes.status, 200);
  const listMyData = createApiSuccessSchema(
    z.object({ bookings: z.array(BookingDetailsSchema) })
  ).parse(await listMyRes.json()).data;
  assert.equal(listMyData.bookings.length, 1);
  assert.equal(listMyData.bookings[0].bookingId, myBooking.bookingId);

  // Authenticated owner can view & cancel without providing ?contact=
  const ownerLookup = await app.request(API_ENDPOINTS.reservationById(myBooking.bookingId!), {
    headers: { Cookie: sessionCookie },
  });
  assert.equal(ownerLookup.status, 200);

  // Logout invalidates session
  await app.request(API_ENDPOINTS.authLogout, {
    method: "POST",
    headers: { Cookie: sessionCookie },
  });
  const afterLogoutMe = await app.request(API_ENDPOINTS.authMe, {
    headers: { Cookie: sessionCookie },
  });
  assert.equal(
    createApiSuccessSchema(AuthSessionDataSchema).parse(await afterLogoutMe.json()).data.user,
    null
  );

  // Login wrong password -> 401, right password -> 200
  const badLogin = await app.request(API_ENDPOINTS.authLogin, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "huy@luxestay.vn", password: "wrong" }),
  });
  assert.equal(badLogin.status, 401);

  const okLogin = await app.request(API_ENDPOINTS.authLogin, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "huy@luxestay.vn", password: "password123" }),
  });
  assert.equal(okLogin.status, 200);

  // OTP flow with VN phone
  const otpReq = await app.request(API_ENDPOINTS.authOtpRequest, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier: "+84 988 111 222" }),
  });
  assert.equal(otpReq.status, 200);
  const otpData = createApiSuccessSchema(OtpRequestResultSchema).parse(await otpReq.json()).data;
  assert.equal(otpData.channel, "sms");
  assert.ok(otpData.devCode);

  const badOtp = await app.request(API_ENDPOINTS.authOtpVerify, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier: "0988111222", code: "000000" }),
  });
  assert.equal(badOtp.status, 401);

  const goodOtp = await app.request(API_ENDPOINTS.authOtpVerify, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      identifier: "0988111222",
      code: otpData.devCode,
      fullName: "Khách OTP",
    }),
  });
  assert.equal(goodOtp.status, 200);
  const otpSession = createApiSuccessSchema(AuthSessionDataSchema).parse(await goodOtp.json()).data;
  assert.equal(otpSession.user?.fullName, "Khách OTP");
  assert.equal(otpSession.user?.provider, "otp");
});

test("Dynamic Voucher Engine validates codes via /api/v1/vouchers/validate and recalculates authoritative discounts on reservations", async () => {
  const { app } = createApiApp();
  const stay01 = PROPERTIES.find((p) => p.id === "stay-01")!;

  const lowRes = await app.request(API_ENDPOINTS.validateVoucher, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code: "LUXESTAY250", subtotal: 1000000 }),
  });
  assert.equal(lowRes.status, 200);
  const lowParsed = createApiSuccessSchema(VoucherValidationResultSchema).parse(
    await lowRes.json()
  ).data;
  assert.equal(lowParsed.valid, false);
  assert.equal(lowParsed.discount, 0);

  const okRes = await app.request(API_ENDPOINTS.validateVoucher, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code: "  summervibe ", subtotal: 6000000 }),
  });
  const okParsed = createApiSuccessSchema(VoucherValidationResultSchema).parse(
    await okRes.json()
  ).data;
  assert.equal(okParsed.valid, true);
  assert.equal(okParsed.code, "SUMMERVIBE");
  assert.equal(okParsed.discount, 500000); // capped at 500k

  // Reservation with invalid promoCode -> 400
  const badBookingRes = await app.request(API_ENDPOINTS.reservations, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      propertyId: stay01.id,
      nights: 2,
      guests: { adults: 2, children: 0, rooms: 1 },
      selectedAmenityIds: [],
      guestInfo: { fullName: "Voucher Test", phone: "0912345678", email: "v@luxestay.vn" },
      paymentMethod: "hotel",
      promoCode: "NOT_REAL",
    }),
  });
  assert.equal(badBookingRes.status, 400);

  // Reservation with LUXESTAY250 on weekday dates -> discount 250k applied authoritatively
  const goodBookingRes = await app.request(API_ENDPOINTS.reservations, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      propertyId: stay01.id,
      checkInSeed: "2026-12-08",
      nights: 2,
      guests: { adults: 2, children: 0, rooms: 1 },
      selectedAmenityIds: [],
      guestInfo: { fullName: "Voucher Test", phone: "0912345678", email: "v@luxestay.vn" },
      paymentMethod: "hotel",
      promoCode: "luxestay250",
    }),
  });
  assert.equal(goodBookingRes.status, 201);
  const booked = createApiSuccessSchema(BookingDetailsSchema).parse(
    await goodBookingRes.json()
  ).data;
  assert.equal(booked.pricing.appliedPromoCode, "LUXESTAY250");
  assert.equal(booked.pricing.discount, 250000);
  assert.equal(booked.pricing.seasonalSurcharge, 0);
  assert.equal(booked.pricing.total, stay01.pricePerNight * 2 + 150000 - 250000);
});

test("Payment Sandbox, HMAC-SHA256 Webhook verification, Idempotency, and Notification Logs work end-to-end", async () => {
  const { app, webhookSecret, repositories } = createApiApp({ nodeEnv: "test" });

  // 1. Online reservation starts in pending_payment with payment transaction
  const createRes = await app.request(API_ENDPOINTS.reservations, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      propertyId: "stay-01",
      nights: 2,
      guests: { adults: 2, children: 0, rooms: 1 },
      selectedAmenityIds: [],
      guestInfo: { fullName: "Thanh Toán Test", phone: "0912345678", email: "pay@luxestay.vn" },
      paymentMethod: "vnpay",
      promoCode: "SUMMERVIBE",
    }),
  });
  assert.equal(createRes.status, 201);
  const created = createApiSuccessSchema(BookingDetailsSchema).parse(await createRes.json()).data;
  assert.equal(created.status, "pending_payment");
  assert.ok(created.payment?.transactionId.startsWith("TXN-"));
  const txId = created.payment!.transactionId;
  const bookingId = created.bookingId!;

  // 2. Gateway session lookup returns summary
  const sessionRes = await app.request(API_ENDPOINTS.paymentById(txId));
  assert.equal(sessionRes.status, 200);
  const gwSession = createApiSuccessSchema(PaymentGatewaySessionSchema).parse(
    await sessionRes.json()
  ).data;
  assert.equal(gwSession.transaction.status, "pending");
  assert.equal(gwSession.sandboxEnabled, true);

  // 3. Unsigned or tampered webhook is rejected with 401 UNAUTHORIZED
  const webhookPayload = JSON.stringify({
    eventId: "EVT-IDEMPOTENT-001",
    transactionId: txId,
    bookingId,
    provider: "vnpay",
    outcome: "succeeded",
    amount: created.pricing.total,
    occurredAt: "2026-11-24T10:00:00.000Z",
  });
  const badSigRes = await app.request(API_ENDPOINTS.paymentWebhook("vnpay"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      [WEBHOOK_SIGNATURE_HEADER]: "sha256=deadbeef",
    },
    body: webhookPayload,
  });
  assert.equal(badSigRes.status, 401);

  // 4. Valid HMAC-SHA256 webhook transitions booking -> confirmed & creates 1 confirmation email
  const validSig = signWebhookPayload(webhookPayload, webhookSecret);
  const okWebhookRes = await app.request(API_ENDPOINTS.paymentWebhook("vnpay"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      [WEBHOOK_SIGNATURE_HEADER]: validSig,
    },
    body: webhookPayload,
  });
  assert.equal(okWebhookRes.status, 200);
  const webhookData = createApiSuccessSchema(PaymentWebhookResultSchema).parse(
    await okWebhookRes.json()
  ).data;
  assert.equal(webhookData.deduplicated, false);
  assert.equal(webhookData.bookingStatus, "confirmed");
  assert.equal(webhookData.transaction.status, "succeeded");

  // 5. Replaying EXACT same eventId is idempotent (deduplicated: true, still only 1 email)
  const replayRes = await app.request(API_ENDPOINTS.paymentWebhook("vnpay"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      [WEBHOOK_SIGNATURE_HEADER]: validSig,
    },
    body: webhookPayload,
  });
  assert.equal(replayRes.status, 200);
  const replayData = createApiSuccessSchema(PaymentWebhookResultSchema).parse(
    await replayRes.json()
  ).data;
  assert.equal(replayData.deduplicated, true);

  const notificationsRes = await app.request(
    `${API_ENDPOINTS.reservationNotifications(bookingId)}?contact=pay@luxestay.vn`
  );
  assert.equal(notificationsRes.status, 200);
  const notifData = createApiSuccessSchema(
    z.object({ notifications: z.array(NotificationLogSchema) })
  ).parse(await notificationsRes.json()).data;
  assert.equal(notifData.notifications.length, 1);
  assert.equal(notifData.notifications[0].type, "booking_confirmed");

  // 6. Sandbox simulate endpoint tests failed outcome cleanly on a second booking
  const createFailRes = await app.request(API_ENDPOINTS.reservations, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      propertyId: "stay-02",
      nights: 1,
      guests: { adults: 2, children: 0, rooms: 1 },
      selectedAmenityIds: [],
      guestInfo: { fullName: "Fail Test", phone: "0912345678", email: "fail@luxestay.vn" },
      paymentMethod: "momo",
    }),
  });
  const failBooking = createApiSuccessSchema(BookingDetailsSchema).parse(
    await createFailRes.json()
  ).data;
  const simRes = await app.request(
    API_ENDPOINTS.paymentSimulate(failBooking.payment!.transactionId),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ outcome: "failed", reason: "Số dư ví không đủ" }),
    }
  );
  assert.equal(simRes.status, 200);
  const simData = createApiSuccessSchema(PaymentWebhookResultSchema).parse(
    await simRes.json()
  ).data;
  assert.equal(simData.bookingStatus, "payment_failed");
  const failLogs = await repositories.notifications.listByBookingId(failBooking.bookingId!);
  assert.equal(failLogs[0]?.type, "payment_failed");
});

test("loadApiEnv validates STORAGE_DRIVER and PostgreSQL mappers produce contract-compliant domain objects", () => {
  const defaultEnv = loadApiEnv({});
  assert.equal(defaultEnv.port, 4000);
  assert.equal(defaultEnv.storageDriver, "memory");
  assert.equal(defaultEnv.paymentSandboxEnabled, true);
  assert.equal(resolveDatabaseConfig(defaultEnv).driver, "memory");

  assert.throws(() => loadApiEnv({ STORAGE_DRIVER: "database" }), /DATABASE_URL is required/);
  assert.throws(() => loadApiEnv({ NODE_ENV: "production" }), /PAYMENT_WEBHOOK_SECRET is required/);

  const dbEnv = loadApiEnv({
    STORAGE_DRIVER: "database",
    DATABASE_URL: "postgresql://postgres:postgres@localhost:5434/luxestay",
  });
  assert.equal(dbEnv.storageDriver, "database");
  assert.equal(
    resolveDatabaseConfig(dbEnv).databaseUrl,
    "postgresql://postgres:postgres@localhost:5434/luxestay"
  );

  const sampleProp = PROPERTIES[0];
  const mappedProp = mapPropertyRowToDomain(
    {
      id: sampleProp.id,
      title: sampleProp.title,
      subtitle: sampleProp.subtitle,
      propertyType: sampleProp.propertyType,
      category: sampleProp.category,
      city: sampleProp.location.city,
      province: sampleProp.location.province,
      address: sampleProp.location.address,
      distanceToCenter: sampleProp.location.distanceToCenter,
      images: sampleProp.images,
      pricePerNight: sampleProp.pricePerNight,
      originalPrice: sampleProp.originalPrice ?? null,
      rating: sampleProp.rating,
      reviewCount: sampleProp.reviewCount,
      maxGuests: sampleProp.maxGuests,
      bedrooms: sampleProp.bedrooms,
      beds: sampleProp.beds,
      bathrooms: sampleProp.bathrooms,
      inventoryCount: sampleProp.inventoryCount,
      ownerUserId: sampleProp.ownerUserId ?? null,
      isSuperhost: Boolean(sampleProp.isSuperhost),
      isFeatured: Boolean(sampleProp.isFeatured),
      isFlashDeal: Boolean(sampleProp.isFlashDeal),
      freeCancellation: Boolean(sampleProp.freeCancellation),
      breakfastIncluded: Boolean(sampleProp.breakfastIncluded),
      description: sampleProp.description,
      hostName: sampleProp.host.name,
      hostAvatar: sampleProp.host.avatar,
      hostJoinedDate: sampleProp.host.joinedDate,
      hostResponseRate: sampleProp.host.responseRate,
      hostIsSuperhost: sampleProp.host.isSuperhost,
      sortOrder: 0,
    },
    sampleProp.resortAmenities.map((a, idx) => ({
      propertyId: sampleProp.id,
      amenityId: a.amenityId,
      sortOrder: idx,
      featured: a.featured ?? null,
      name: a.name ?? null,
      shortLabel: a.shortLabel ?? null,
      description: a.description ?? null,
      image: a.image ?? null,
      hours: a.hours ?? null,
      location: a.location ?? null,
      pricingType: a.pricingType ?? null,
      price: a.price ?? null,
      priceUnit: a.priceUnit ?? null,
      notes: a.notes ?? null,
    })),
    sampleProp.reviews.map((r, idx) => ({
      id: r.id,
      propertyId: sampleProp.id,
      authorName: r.authorName,
      authorAvatar: r.authorAvatar,
      rating: r.rating,
      date: r.date,
      comment: r.comment,
      bookingId: null,
      userId: null,
      isVerified: false,
      createdAt: new Date("2026-11-01T00:00:00.000Z"),
      sortOrder: idx,
    }))
  );
  assert.equal(PropertySchema.safeParse(mappedProp).success, true);

  const mappedBooking = mapReservationRowsToBookingDetails(
    {
      bookingId: "LX-PG0001",
      propertyId: mappedProp.id,
      userId: "USR-TEST01",
      status: "cancelled",
      checkIn: "20/12/2026",
      checkOut: "22/12/2026",
      nights: 2,
      adults: 2,
      children: 0,
      rooms: 1,
      basePrice: mappedProp.pricePerNight,
      nightsTotal: mappedProp.pricePerNight * 2,
      seasonalSurcharge: 0,
      nightlyBreakdown: null,
      cleaningFee: 150000,
      serviceFee: 0,
      amenitiesFee: 0,
      discount: 250000,
      appliedPromoCode: "LUXESTAY250",
      total: mappedProp.pricePerNight * 2 - 100000,
      guestFullName: "Nguyễn Văn A",
      guestEmail: "a@luxestay.vn",
      guestPhone: "0912345678",
      guestNote: null,
      paymentMethod: "momo",
      paymentExpiresAt: new Date("2026-11-24T00:15:00.000Z"),
      createdAt: new Date("2026-11-24T00:00:00.000Z"),
      completedAt: null,
      cancelledAt: new Date("2026-11-24T05:00:00.000Z"),
      cancellationReason: "Đổi kế hoạch",
    },
    mappedProp,
    []
  );
  assert.equal(BookingDetailsSchema.safeParse(mappedBooking).success, true);
  assert.equal(mappedBooking.status, "cancelled");
  assert.equal(mappedBooking.userId, "USR-TEST01");
  assert.equal(mappedBooking.pricing.appliedPromoCode, "LUXESTAY250");
  assert.equal(mappedBooking.cancellationReason, "Đổi kế hoạch");
});

test("Phase 3A Availability Engine: calendar endpoint, seasonal/holiday pricing, concurrent anti-double-booking, and hold release on cancel", async () => {
  const { app, repositories } = createApiApp();
  const stay01 = PROPERTIES.find((p) => p.id === "stay-01")!;
  assert.equal(stay01.inventoryCount, 1);

  // Seed a host override on 2026-12-26 (blocked) and 2026-12-27 (custom price)
  await repositories.availability.upsertOverride({
    propertyId: "stay-01",
    date: "2026-12-26",
    isBlocked: true,
    note: "Bảo trì hồ bơi",
  });
  await repositories.availability.upsertOverride({
    propertyId: "stay-01",
    date: "2026-12-27",
    isBlocked: false,
    overridePrice: 2_100_000,
  });

  // 1. GET /availability returns weekend (+20%), holiday (+30% on 12-25), blocked & override days
  const calRes = await app.request(
    `${API_ENDPOINTS.propertyAvailability("stay-01")}?from=2026-12-24&to=2026-12-28`
  );
  assert.equal(calRes.status, 200);
  const calData = createApiSuccessSchema(PropertyAvailabilityDataSchema).parse(
    await calRes.json()
  ).data;
  assert.equal(calData.days.length, 5);
  assert.equal(calData.days[0]?.priceReason, "holiday"); // 12-24
  assert.equal(calData.days[1]?.priceReason, "holiday"); // 12-25
  assert.equal(calData.days[1]?.effectivePrice, Math.round(stay01.pricePerNight * 1.3));
  assert.equal(calData.days[2]?.isBlocked, true); // 12-26
  assert.equal(calData.days[2]?.isAvailable, false);
  assert.equal(calData.days[3]?.priceReason, "override"); // 12-27
  assert.equal(calData.days[3]?.effectivePrice, 2_100_000);

  // 2. Booking overlapping blocked date 2026-12-26 returns 409 CONFLICT
  const blockedBookingRes = await app.request(API_ENDPOINTS.reservations, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      propertyId: "stay-01",
      checkInSeed: "2026-12-25",
      nights: 2,
      guests: { adults: 2, children: 0, rooms: 1 },
      selectedAmenityIds: [],
      guestInfo: { fullName: "Khách Blocked", phone: "0912345678", email: "blocked@luxestay.vn" },
      paymentMethod: "hotel",
    }),
  });
  assert.equal(blockedBookingRes.status, 409);

  // 3. Concurrent double-booking race on 1-unit stay-01 (2026-12-18 Fri + 2026-12-19 Sat)
  const makeRequest = (email: string) =>
    app.request(API_ENDPOINTS.reservations, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        propertyId: "stay-01",
        checkInSeed: "2026-12-18",
        nights: 2,
        guests: { adults: 2, children: 0, rooms: 1 },
        selectedAmenityIds: [],
        guestInfo: { fullName: "Race Guest", phone: "0912345678", email },
        paymentMethod: "hotel",
      }),
    });

  const [r1, r2] = await Promise.all([
    makeRequest("race1@luxestay.vn"),
    makeRequest("race2@luxestay.vn"),
  ]);
  const statuses = [r1.status, r2.status].sort((a, b) => a - b);
  assert.deepEqual(statuses, [201, 409]);

  const winnerRes = r1.status === 201 ? r1 : r2;
  const winnerBooking = createApiSuccessSchema(BookingDetailsSchema).parse(
    await winnerRes.json()
  ).data;
  assert.equal(
    winnerBooking.pricing.seasonalSurcharge,
    Math.round(stay01.pricePerNight * 0.2) * 2
  );

  // 4. Calendar now reflects 0 remaining units on 2026-12-18 and 2026-12-19
  const occupiedCalRes = await app.request(
    `${API_ENDPOINTS.propertyAvailability("stay-01")}?from=2026-12-18&to=2026-12-20`
  );
  const occupiedCal = createApiSuccessSchema(PropertyAvailabilityDataSchema).parse(
    await occupiedCalRes.json()
  ).data;
  assert.equal(occupiedCal.days[0]?.remainingUnits, 0);
  assert.equal(occupiedCal.days[1]?.remainingUnits, 0);
  assert.equal(occupiedCal.days[2]?.remainingUnits, 1);

  // 5. Cancelling the winning reservation immediately releases inventory -> re-booking succeeds (201)
  const cancelRes = await app.request(API_ENDPOINTS.cancelReservation(winnerBooking.bookingId!), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contact: winnerBooking.guestInfo.email, reason: "Đổi ngày" }),
  });
  assert.equal(cancelRes.status, 200);

  const rebookRes = await makeRequest("rebook@luxestay.vn");
  assert.equal(rebookRes.status, 201);
});

test("Phase 3A Verified Reviews: completion workflow, eligibility guards, atomic rating update, and duplicate prevention", async () => {
  const { app } = createApiApp({ nodeEnv: "test" });
  const initialPropRes = await app.request(API_ENDPOINTS.propertyById("stay-01"));
  const initialProp = createApiSuccessSchema(PropertySchema).parse(
    await initialPropRes.json()
  ).data;
  const initialCount = initialProp.reviewCount;

  // Create confirmed hotel booking for future dates
  const createRes = await app.request(API_ENDPOINTS.reservations, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      propertyId: "stay-01",
      checkInSeed: "2027-02-10",
      nights: 2,
      guests: { adults: 2, children: 0, rooms: 1 },
      selectedAmenityIds: [],
      guestInfo: { fullName: "Khách Đánh Giá", phone: "0912345678", email: "reviewer@luxestay.vn" },
      paymentMethod: "hotel",
    }),
  });
  assert.equal(createRes.status, 201);
  const booking = createApiSuccessSchema(BookingDetailsSchema).parse(await createRes.json()).data;

  // 1. Reviewing before stay completion -> 409 CONFLICT
  const earlyReviewRes = await app.request(API_ENDPOINTS.propertyReviews("stay-01"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      bookingId: booking.bookingId,
      contact: "reviewer@luxestay.vn",
      rating: 5,
      comment: "Chưa ở xong nhưng thử gửi đánh giá sớm xem hệ thống có chặn không.",
    }),
  });
  assert.equal(earlyReviewRes.status, 409);

  // 2. Wrong contact trying to complete -> 403 FORBIDDEN
  const wrongCompleteRes = await app.request(
    API_ENDPOINTS.completeReservation(booking.bookingId!),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contact: "intruder@example.com" }),
    }
  );
  assert.equal(wrongCompleteRes.status, 403);

  // 3. Owner completes stay via sandbox endpoint -> 200 completed
  const completeRes = await app.request(API_ENDPOINTS.completeReservation(booking.bookingId!), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contact: "reviewer@luxestay.vn" }),
  });
  assert.equal(completeRes.status, 200);
  const completedBooking = createApiSuccessSchema(BookingDetailsSchema).parse(
    await completeRes.json()
  ).data;
  assert.equal(completedBooking.status, "completed");
  assert.ok(completedBooking.completedAt);

  // 4. Cannot cancel a completed booking -> 409 CONFLICT
  const cancelCompleted = await app.request(API_ENDPOINTS.cancelReservation(booking.bookingId!), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contact: "reviewer@luxestay.vn" }),
  });
  assert.equal(cancelCompleted.status, 409);

  // 5. Wrong contact cannot submit review -> 403 FORBIDDEN
  const forbiddenReview = await app.request(API_ENDPOINTS.propertyReviews("stay-01"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      bookingId: booking.bookingId,
      contact: "stranger@example.com",
      rating: 5,
      comment: "Giả mạo chủ đơn để gửi đánh giá xem có bị từ chối không.",
    }),
  });
  assert.equal(forbiddenReview.status, 403);

  // 6. Owner submits verified review -> 201 Created, rating & reviewCount updated
  const okReviewRes = await app.request(API_ENDPOINTS.propertyReviews("stay-01"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      bookingId: booking.bookingId,
      contact: "reviewer@luxestay.vn",
      rating: 5,
      comment: "Không gian gỗ tuyệt đẹp, ngắm biển mây buổi sáng cực kỳ thư giãn và chủ nhà rất chu đáo!",
    }),
  });
  assert.equal(okReviewRes.status, 201);
  const reviewResult = createApiSuccessSchema(CreateReviewResultSchema).parse(
    await okReviewRes.json()
  ).data;
  assert.equal(reviewResult.review.isVerified, true);
  assert.equal(reviewResult.review.bookingId, booking.bookingId);
  assert.equal(reviewResult.propertyReviewCount, initialCount + 1);

  // 7. Property detail endpoint reflects new verified review at top & incremented reviewCount
  const updatedPropRes = await app.request(API_ENDPOINTS.propertyById("stay-01"));
  const updatedProp = createApiSuccessSchema(PropertySchema).parse(
    await updatedPropRes.json()
  ).data;
  assert.equal(updatedProp.reviewCount, initialCount + 1);
  assert.equal(updatedProp.reviews[0]?.id, reviewResult.review.id);
  assert.equal(updatedProp.reviews[0]?.isVerified, true);

  // 8. Duplicate review for same bookingId -> 409 CONFLICT
  const dupReviewRes = await app.request(API_ENDPOINTS.propertyReviews("stay-01"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      bookingId: booking.bookingId,
      contact: "reviewer@luxestay.vn",
      rating: 4,
      comment: "Thử gửi đánh giá lần hai cho cùng một mã đơn đặt phòng.",
    }),
  });
  assert.equal(dupReviewRes.status, 409);
});

test("Phase 3B RBAC & Host/Admin Portal: guards, property CRUD, availability overrides, stay completion, and analytics", async () => {
  // Explicitly disable paymentSandboxEnabled to prove Host/Admin can still complete stays in production mode
  const { app } = createApiApp({ nodeEnv: "test", paymentSandboxEnabled: false });

  // 1. Unauthenticated access -> 401 UNAUTHORIZED
  const unauthRes = await app.request(API_ENDPOINTS.hostProperties);
  assert.equal(unauthRes.status, 401);

  // 2. Guest user -> 403 FORBIDDEN on /api/v1/host/*
  const guestReg = await app.request(API_ENDPOINTS.authRegister, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fullName: "Khách Thường",
      email: "normalguest@luxestay.vn",
      password: "password123",
    }),
  });
  assert.equal(guestReg.status, 201);
  const guestCookie = extractCookieHeader(guestReg);
  const guestHostRes = await app.request(API_ENDPOINTS.hostProperties, {
    headers: { Cookie: guestCookie },
  });
  assert.equal(guestHostRes.status, 403);

  // 3. Built-in Demo Host login -> role === "host", owns 6 properties (stay-01..stay-06)
  const hostLogin = await app.request(API_ENDPOINTS.authLogin, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "host@luxestay.vn", password: "host1234" }),
  });
  assert.equal(hostLogin.status, 200);
  const hostSession = createApiSuccessSchema(AuthSessionDataSchema).parse(
    await hostLogin.json()
  ).data;
  assert.equal(hostSession.user?.role, "host");
  const hostCookie = extractCookieHeader(hostLogin);

  const hostListRes = await app.request(API_ENDPOINTS.hostProperties, {
    headers: { Cookie: hostCookie },
  });
  assert.equal(hostListRes.status, 200);
  const hostProps = createApiSuccessSchema(HostPropertiesListDataSchema).parse(
    await hostListRes.json()
  ).data.properties;
  assert.equal(hostProps.length, 6);

  // 4. Host cannot edit or override availability for unowned property stay-07 -> 403 FORBIDDEN
  const forbiddenPatch = await app.request(API_ENDPOINTS.hostPropertyById("stay-07"), {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: hostCookie },
    body: JSON.stringify({ pricePerNight: 1_900_000 }),
  });
  assert.equal(forbiddenPatch.status, 403);

  const forbiddenAvail = await app.request(API_ENDPOINTS.hostPropertyAvailability("stay-07"), {
    method: "PUT",
    headers: { "Content-Type": "application/json", Cookie: hostCookie },
    body: JSON.stringify({
      dates: [{ date: "2027-06-01", isBlocked: true }],
    }),
  });
  assert.equal(forbiddenAvail.status, 403);

  // 5. Host creates a new property -> 201, updates price -> 200, overrides availability -> 200
  const createPropRes = await app.request(API_ENDPOINTS.hostProperties, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: hostCookie },
    body: JSON.stringify({
      title: "Forest Mist Cabin Đà Lạt",
      subtitle: "Nhà gỗ giữa rừng thông có sân vườn BBQ",
      propertyType: "homestay",
      category: "pine-forest",
      location: {
        city: "Đà Lạt",
        province: "Lâm Đồng",
        address: "Đường Trịnh Hoài Đức, Phường 11",
        distanceToCenter: "Cách trung tâm 4 km",
      },
      images: [
        "https://images.unsplash.com/photo-1587061949409-02df41d5e562?auto=format&fit=crop&w=1200&q=80",
      ],
      pricePerNight: 1_400_000,
      inventoryCount: 2,
      maxGuests: 4,
      bedrooms: 2,
      beds: 2,
      bathrooms: 2,
      freeCancellation: true,
      breakfastIncluded: true,
      description:
        "Không gian gỗ ấm áp nhìn thẳng ra rừng thông xanh mát, đầy đủ bếp và sân BBQ ngoài trời.",
      amenityIds: ["high-speed-wifi", "garden-bbq"],
    }),
  });
  assert.equal(createPropRes.status, 201);
  const createdProp = createApiSuccessSchema(PropertySchema).parse(
    await createPropRes.json()
  ).data;
  assert.equal(createdProp.ownerUserId, hostSession.user?.id);

  const patchPropRes = await app.request(API_ENDPOINTS.hostPropertyById(createdProp.id), {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: hostCookie },
    body: JSON.stringify({ pricePerNight: 1_550_000, inventoryCount: 3 }),
  });
  assert.equal(patchPropRes.status, 200);
  const patchedProp = createApiSuccessSchema(PropertySchema).parse(
    await patchPropRes.json()
  ).data;
  assert.equal(patchedProp.pricePerNight, 1_550_000);
  assert.equal(patchedProp.inventoryCount, 3);

  const availRes = await app.request(API_ENDPOINTS.hostPropertyAvailability(createdProp.id), {
    method: "PUT",
    headers: { "Content-Type": "application/json", Cookie: hostCookie },
    body: JSON.stringify({
      dates: [
        { date: "2027-07-10", isBlocked: true, note: "Bảo trì" },
        { date: "2027-07-11", isBlocked: false, overridePrice: 2_300_000 },
      ],
    }),
  });
  assert.equal(availRes.status, 200);
  const availData = createApiSuccessSchema(PropertyAvailabilityDataSchema).parse(
    await availRes.json()
  ).data;
  assert.equal(availData.days[0]?.isBlocked, true);
  assert.equal(availData.days[1]?.effectivePrice, 2_300_000);

  // 6. Guest books createdProp -> Host cannot delete property while active booking exists (409)
  const guestBookRes = await app.request(API_ENDPOINTS.reservations, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: guestCookie },
    body: JSON.stringify({
      propertyId: createdProp.id,
      checkInSeed: "2027-07-12",
      nights: 2,
      guests: { adults: 2, children: 0, rooms: 1 },
      selectedAmenityIds: [],
      guestInfo: { fullName: "Khách Thường", phone: "0912345678", email: "normalguest@luxestay.vn" },
      paymentMethod: "hotel",
    }),
  });
  assert.equal(guestBookRes.status, 201);
  const guestBooking = createApiSuccessSchema(BookingDetailsSchema).parse(
    await guestBookRes.json()
  ).data;

  const blockedDelete = await app.request(API_ENDPOINTS.hostPropertyById(createdProp.id), {
    method: "DELETE",
    headers: { Cookie: hostCookie },
  });
  assert.equal(blockedDelete.status, 409);

  // 7. Host views reservations, completes stay even with sandbox disabled, and reads analytics
  const hostResList = await app.request(API_ENDPOINTS.hostReservations, {
    headers: { Cookie: hostCookie },
  });
  assert.equal(hostResList.status, 200);
  const hostBookings = createApiSuccessSchema(HostReservationsListDataSchema).parse(
    await hostResList.json()
  ).data.bookings;
  assert.equal(hostBookings.length, 1);

  const guestCannotComplete = await app.request(
    API_ENDPOINTS.completeReservation(guestBooking.bookingId!),
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: guestCookie },
      body: JSON.stringify({}),
    }
  );
  assert.equal(guestCannotComplete.status, 403);

  const hostComplete = await app.request(
    API_ENDPOINTS.completeReservation(guestBooking.bookingId!),
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: hostCookie },
      body: JSON.stringify({}),
    }
  );
  assert.equal(hostComplete.status, 200);
  const completedBooking = createApiSuccessSchema(BookingDetailsSchema).parse(
    await hostComplete.json()
  ).data;
  assert.equal(completedBooking.status, "completed");

  const analyticsRes = await app.request(API_ENDPOINTS.hostAnalytics, {
    headers: { Cookie: hostCookie },
  });
  assert.equal(analyticsRes.status, 200);
  const analytics = createApiSuccessSchema(HostAnalyticsDataSchema).parse(
    await analyticsRes.json()
  ).data;
  assert.equal(analytics.completedBookings, 1);
  assert.equal(analytics.completedRevenue, guestBooking.pricing.total);
  assert.equal(analytics.totalRevenue, guestBooking.pricing.total);

  // Now that booking is completed (no longer holding inventory), Host can delete createdProp -> 200
  const okDelete = await app.request(API_ENDPOINTS.hostPropertyById(createdProp.id), {
    method: "DELETE",
    headers: { Cookie: hostCookie },
  });
  assert.equal(okDelete.status, 200);

  // 8. Admin login sees ALL 12 properties and can manage stay-07
  const adminLogin = await app.request(API_ENDPOINTS.authLogin, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@luxestay.vn", password: "admin1234" }),
  });
  assert.equal(adminLogin.status, 200);
  const adminCookie = extractCookieHeader(adminLogin);
  const adminPropsRes = await app.request(API_ENDPOINTS.hostProperties, {
    headers: { Cookie: adminCookie },
  });
  const adminProps = createApiSuccessSchema(HostPropertiesListDataSchema).parse(
    await adminPropsRes.json()
  ).data.properties;
  assert.equal(adminProps.length, 12);

  const adminPatchStay07 = await app.request(API_ENDPOINTS.hostPropertyById("stay-07"), {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: adminCookie },
    body: JSON.stringify({ breakfastIncluded: true }),
  });
  assert.equal(adminPatchStay07.status, 200);
});
