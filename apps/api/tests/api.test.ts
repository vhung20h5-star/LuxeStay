import test from "node:test";
import assert from "node:assert/strict";
import {
  API_ENDPOINTS,
  ApiErrorResponseSchema,
  BookingDetailsSchema,
  CatalogSnapshotSchema,
  createApiSuccessSchema,
  HealthDataSchema,
  PropertySchema,
} from "@luxestay/contracts";
import { PROPERTIES } from "@luxestay/domain/seed";
import { createApiApp } from "../dist/app.js";
import { loadApiEnv } from "../dist/config/env.js";
import {
  assertDatabaseDriverSupported,
  resolveDatabaseConfig,
} from "../dist/db/client.js";

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

test("POST /api/v1/reservations recalculates authoritative server pricing, saves booking, and ignores tampered fields", async () => {
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
      paymentMethod: "momo",
      pricing: { total: 1000 }, // Tampering attempt must be ignored
    }),
  });

  assert.equal(response.status, 201);
  const body = await response.json();
  const parsed = createApiSuccessSchema(BookingDetailsSchema).safeParse(body);
  assert.equal(parsed.success, true);

  if (parsed.success) {
    const booking = parsed.data.data;
    assert.match(booking.bookingId ?? "", /^LX-[A-F0-9]{6}$/);
    assert.equal(booking.guests.adults, stay02.maxGuests);
    assert.equal(booking.selectedAmenities.length, 2);
    assert.equal(
      booking.pricing.total,
      stay02.pricePerNight * 3 + 150000 + 650000 - 100000
    );

    const stored = await repositories.reservations.findById(booking.bookingId!);
    assert.ok(stored);
    assert.equal(stored.pricing.total, booking.pricing.total);
  }
});

test("POST /api/v1/reservations returns structured ApiError on invalid JSON, bad validation, and unknown property", async () => {
  const { app } = createApiApp();

  // 1. Invalid JSON
  const badJsonRes = await app.request(API_ENDPOINTS.reservations, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{not-json",
  });
  assert.equal(badJsonRes.status, 400);
  const badJson = ApiErrorResponseSchema.parse(await badJsonRes.json());
  assert.equal(badJson.error.code, "INVALID_JSON");

  // 2. Invalid phone / validation error
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

  // 3. Unknown property -> 404
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

test("loadApiEnv validates STORAGE_DRIVER and requires DATABASE_URL when driver is database", () => {
  const defaultEnv = loadApiEnv({});
  assert.equal(defaultEnv.port, 4000);
  assert.equal(defaultEnv.storageDriver, "memory");
  assert.doesNotThrow(() => assertDatabaseDriverSupported(resolveDatabaseConfig(defaultEnv)));

  assert.throws(
    () => loadApiEnv({ STORAGE_DRIVER: "database" }),
    /DATABASE_URL is required/
  );

  const dbEnv = loadApiEnv({
    STORAGE_DRIVER: "database",
    DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/luxestay",
  });
  assert.equal(dbEnv.storageDriver, "database");
  assert.throws(
    () => assertDatabaseDriverSupported(resolveDatabaseConfig(dbEnv)),
    /Phase 1 DB adapter/
  );
});
