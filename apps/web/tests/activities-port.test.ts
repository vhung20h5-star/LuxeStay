import assert from "node:assert/strict";
import test from "node:test";
import { TRAVEL_ACTIVITIES } from "@luxestay/domain/seed";
import {
  createActivitiesPort,
  createHttpActivitiesPort,
  createMockActivitiesPort,
} from "../src/shared/ports/activitiesPort";
import { HttpApiError } from "../src/shared/ports/errors";
import { createHttpReservationManagerAdapter } from "../src/shared/ports/persistencePort";

test("createMockActivitiesPort filters, books, looks up, and cancels standalone activity", async () => {
  const port = createMockActivitiesPort();
  const fullCatalog = await port.listActivities();
  assert.equal(fullCatalog.activities.length, 56);
  assert.equal(fullCatalog.cities.length, 14);
  assert.deepEqual(fullCatalog.sections, ["attractions", "tours", "essentials", "entertainment"]);
  assert.equal(fullCatalog.subcategories?.length, 11);

  const themeParks = await port.listActivities({
    section: "attractions",
    subcategory: "theme-park",
  });
  assert.equal(themeParks.activities.length, 5);
  assert.ok(themeParks.activities.some((a) => a.id === "act-13"));
  assert.ok(themeParks.activities.some((a) => a.id === "act-39"));

  const catalog = await port.listActivities({ category: "transfer", city: "Đà Lạt" });
  assert.equal(catalog.activities.length, 1);
  assert.equal(catalog.activities[0].id, "act-01");

  const detail = await port.getActivityBySlug(catalog.activities[0].slug);
  assert.ok(detail);
  assert.ok(detail.relatedStays.length > 0);
  assert.equal(detail.activity.images.length, 3);
  assert.equal(detail.activity.imageCaptions?.length, 3);
  assert.ok(detail.activity.knowBeforeYouGo.length >= 4);
  assert.ok(detail.activity.howToUse);
  assert.ok(detail.activity.cancellationPolicy);

  const booked = await port.createBooking({
    activityId: "act-01",
    slotId: TRAVEL_ACTIVITIES[0].slots[0].id,
    dateIso: "2026-12-12",
    quantity: 1,
    guestInfo: {
      fullName: "Lê Hoa",
      phone: "0912345678",
      email: "hoa@luxestay.vn",
    },
    paymentMethod: "hotel",
  });
  assert.match(booked.bookingId, /^ACT-/);
  assert.equal(booked.status, "confirmed");

  const lookedUp = await port.lookupBooking(booked.bookingId, "hoa@luxestay.vn");
  assert.equal(lookedUp.bookingId, booked.bookingId);

  const cancelled = await port.cancelBooking(booked.bookingId, {
    contact: "hoa@luxestay.vn",
    reason: "Hủy thử nghiệm",
  });
  assert.equal(cancelled.status, "cancelled");
});

test("createHttpActivitiesPort enforces strict api mode with zero mock fallback on failure or CONTRACT_MISMATCH", async () => {
  const failingFetch: typeof fetch = async () => {
    throw new TypeError("ECONNREFUSED");
  };
  const port = createActivitiesPort({
    mode: "api",
    apiBaseUrl: "http://localhost:4999",
    fetchImpl: failingFetch,
  });

  await assert.rejects(
    () => port.listActivities(),
    (err: unknown) => err instanceof HttpApiError && err.code === "NETWORK_ERROR"
  );

  const mismatchFetch: typeof fetch = async () =>
    new Response(JSON.stringify({ ok: true, data: { invalid: true } }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  const mismatchPort = createHttpActivitiesPort({
    baseUrl: "",
    fetchImpl: mismatchFetch,
  });

  await assert.rejects(
    () => mismatchPort.listActivities(),
    (err: unknown) => err instanceof HttpApiError && err.code === "CONTRACT_MISMATCH"
  );
});

test("ReservationManagerPort.cancelActivityItem sends PATCH to reservation activity item cancel endpoint", async () => {
  let capturedUrl = "";
  let capturedMethod = "";

  const mockFetch: typeof fetch = async (input, init) => {
    capturedUrl = String(input);
    capturedMethod = init?.method ?? "GET";
    return new Response(
      JSON.stringify({
        ok: false,
        error: { code: "NOT_FOUND", message: "Không tìm thấy đơn đặt phòng." },
      }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  };

  const manager = createHttpReservationManagerAdapter({
    baseUrl: "http://localhost:4000",
    fetchImpl: mockFetch,
  });

  await assert.rejects(
    () =>
      manager.cancelActivityItem("LX-ABC123", "lx-abc123-act-1", {
        contact: "guest@luxestay.vn",
      }),
    (err: unknown) => err instanceof HttpApiError && err.code === "NOT_FOUND"
  );
  assert.equal(capturedMethod, "PATCH");
  assert.equal(
    capturedUrl,
    "http://localhost:4000/api/v1/reservations/LX-ABC123/activities/lx-abc123-act-1/cancel"
  );
});
