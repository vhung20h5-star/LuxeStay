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
import { PROPERTIES, SEED_CATALOG_SNAPSHOT } from "@luxestay/domain/seed";
import { createApiApp } from "../dist/app.js";
import { loadApiEnv } from "../dist/config/env.js";
import { resolveDatabaseConfig } from "../dist/db/client.js";
import { mapPropertyRowToDomain } from "../dist/modules/catalog/postgresRepository.js";
import { mapReservationRowsToBookingDetails } from "../dist/modules/reservations/postgresRepository.js";

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
      pricing: { total: 1000 },
    }),
  });

  assert.equal(response.status, 201);
  const body = await response.json();
  const parsed = createApiSuccessSchema(BookingDetailsSchema).safeParse(body);
  assert.equal(parsed.success, true);

  if (parsed.success) {
    const booking = parsed.data.data;
    assert.match(booking.bookingId ?? "", /^LX-[A-F0-9]{6}$/);
    assert.equal(booking.status, "confirmed");
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
  const customCatalog = {
    async getSnapshot() {
      return {
        ...SEED_CATALOG_SNAPSHOT,
        properties: [...SEED_CATALOG_SNAPSHOT.properties, nonFreeProp],
      };
    },
    async getPropertyById(id: string) {
      if (id === nonFreeProp.id) return nonFreeProp;
      return SEED_CATALOG_SNAPSHOT.properties.find((p) => p.id === id) ?? null;
    },
  };
  const { app } = createApiApp({ catalogRepository: customCatalog });

  // Create booking on free-cancellation property
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
      paymentMethod: "vnpay",
    }),
  });
  assert.equal(createRes.status, 201);
  const created = createApiSuccessSchema(BookingDetailsSchema).parse(await createRes.json()).data;
  const bookingId = created.bookingId!;

  // 1. Lookup missing contact -> 400
  const noContact = await app.request(API_ENDPOINTS.reservationById(bookingId));
  assert.equal(noContact.status, 400);
  assert.equal(ApiErrorResponseSchema.parse(await noContact.json()).error.code, "VALIDATION_ERROR");

  // 2. Lookup wrong contact -> 403
  const wrongContact = await app.request(
    `${API_ENDPOINTS.reservationById(bookingId)}?contact=other@luxestay.vn`
  );
  assert.equal(wrongContact.status, 403);
  assert.equal(ApiErrorResponseSchema.parse(await wrongContact.json()).error.code, "FORBIDDEN");

  // 3. Lookup unknown bookingId -> 404
  const unknownBooking = await app.request(
    `${API_ENDPOINTS.reservationById("LX-000000")}?contact=hoang@luxestay.vn`
  );
  assert.equal(unknownBooking.status, 404);
  assert.equal(ApiErrorResponseSchema.parse(await unknownBooking.json()).error.code, "NOT_FOUND");

  // 4. Lookup valid via +84 phone & lowercase bookingId -> 200
  const lookupByPhone = await app.request(
    `${API_ENDPOINTS.reservationById(bookingId.toLowerCase())}?contact=${encodeURIComponent("+84912345678")}`
  );
  assert.equal(lookupByPhone.status, 200);
  const lookedUp = createApiSuccessSchema(BookingDetailsSchema).parse(
    await lookupByPhone.json()
  ).data;
  assert.equal(lookedUp.bookingId, bookingId);
  assert.equal(lookedUp.status, "confirmed");

  // 5. Cancel with wrong contact -> 403
  const cancelForbidden = await app.request(API_ENDPOINTS.cancelReservation(bookingId), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contact: "intruder@example.com" }),
  });
  assert.equal(cancelForbidden.status, 403);

  // 6. Valid cancel -> 200 and persisted on subsequent GET
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

  const afterCancelGet = await app.request(
    `${API_ENDPOINTS.reservationById(bookingId)}?contact=hoang@luxestay.vn`
  );
  assert.equal(
    createApiSuccessSchema(BookingDetailsSchema).parse(await afterCancelGet.json()).data.status,
    "cancelled"
  );

  // 7. Double cancel -> 409 CONFLICT
  const doubleCancel = await app.request(API_ENDPOINTS.cancelReservation(bookingId), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contact: "hoang@luxestay.vn" }),
  });
  assert.equal(doubleCancel.status, 409);
  assert.equal(ApiErrorResponseSchema.parse(await doubleCancel.json()).error.code, "CONFLICT");

  // 8. Non-free cancellation property cannot be cancelled online -> 409 CONFLICT
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
      paymentMethod: "card",
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
  assert.equal(ApiErrorResponseSchema.parse(await strictCancel.json()).error.code, "CONFLICT");
});

test("loadApiEnv validates STORAGE_DRIVER and PostgreSQL mappers produce contract-compliant domain objects", () => {
  const defaultEnv = loadApiEnv({});
  assert.equal(defaultEnv.port, 4000);
  assert.equal(defaultEnv.storageDriver, "memory");
  assert.equal(resolveDatabaseConfig(defaultEnv).driver, "memory");

  assert.throws(() => loadApiEnv({ STORAGE_DRIVER: "database" }), /DATABASE_URL is required/);

  const dbEnv = loadApiEnv({
    STORAGE_DRIVER: "database",
    DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/luxestay",
  });
  assert.equal(dbEnv.storageDriver, "database");
  assert.equal(
    resolveDatabaseConfig(dbEnv).databaseUrl,
    "postgresql://postgres:postgres@localhost:5432/luxestay"
  );

  // Verify SQL row -> Domain mappers match Zod contracts cleanly
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
      sortOrder: idx,
    }))
  );
  assert.equal(PropertySchema.safeParse(mappedProp).success, true);

  const mappedBooking = mapReservationRowsToBookingDetails(
    {
      bookingId: "LX-PG0001",
      propertyId: mappedProp.id,
      status: "cancelled",
      checkIn: "20/12/2026",
      checkOut: "22/12/2026",
      nights: 2,
      adults: 2,
      children: 0,
      rooms: 1,
      basePrice: mappedProp.pricePerNight,
      nightsTotal: mappedProp.pricePerNight * 2,
      cleaningFee: 150000,
      serviceFee: 0,
      amenitiesFee: 0,
      discount: 100000,
      total: mappedProp.pricePerNight * 2 + 50000,
      guestFullName: "Nguyễn Văn A",
      guestEmail: "a@luxestay.vn",
      guestPhone: "0912345678",
      guestNote: null,
      paymentMethod: "momo",
      createdAt: new Date("2026-11-24T00:00:00.000Z"),
      cancelledAt: new Date("2026-11-24T05:00:00.000Z"),
      cancellationReason: "Đổi kế hoạch",
    },
    mappedProp,
    []
  );
  assert.equal(BookingDetailsSchema.safeParse(mappedBooking).success, true);
  assert.equal(mappedBooking.status, "cancelled");
  assert.equal(mappedBooking.cancellationReason, "Đổi kế hoạch");
});
