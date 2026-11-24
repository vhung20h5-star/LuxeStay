import test from "node:test";
import assert from "node:assert/strict";
import { buildApiError, buildApiSuccess } from "@luxestay/contracts";
import {
  createIdleBookingSession,
  deriveBookingQuote,
  processServerReservationIntent,
  startCheckoutSession,
} from "@luxestay/domain";
import { PROPERTIES, SEED_CATALOG_SNAPSHOT } from "@luxestay/domain/seed";
import { getPublicWebEnv, getServerWebEnv } from "@/shared/config/env";
import { createHttpAuthPort, createMockAuthPort } from "@/shared/ports/authPort";
import {
  createCatalogRepositoryForMode,
  createHttpCatalogRepository,
} from "@/shared/ports/catalogPort";
import { HttpApiError } from "@/shared/ports/errors";
import {
  createHttpPropertyExperiencePort,
  createMockPropertyExperiencePort,
} from "@/shared/ports/experiencePort";
import { createHttpHostPort, createMockHostPort } from "@/shared/ports/hostPort";
import {
  createHttpPaymentGatewayPort,
  createMockPaymentGatewayPort,
} from "@/shared/ports/paymentPort";
import {
  DEFAULT_FAVORITE_IDS,
  FAVORITES_STORAGE_KEY,
  sanitizeFavoriteIds,
  toggleFavoriteId,
  createBrowserFavoritesAdapter,
  createInMemoryFavoritesAdapter,
  createBrowserReservationAdapter,
  createBrowserReservationManagerAdapter,
  createHttpReservationAdapter,
  createHttpReservationManagerAdapter,
  createInMemoryReservationAdapter,
  createWebAppPorts,
  createInMemoryAppPorts,
} from "@/shared/ports/persistencePort";
import type {
  StorageEventLike,
  StorageEventTargetLike,
  StorageLike,
} from "@/shared/ports/types";

const VALID_IDS = new Set(PROPERTIES.map((p) => p.id));
const stay02 = PROPERTIES.find((p) => p.id === "stay-02")!;
const baseDate = new Date(2026, 10, 20);

function createFakeStorage(initial?: Record<string, string>) {
  const map = new Map<string, string>(Object.entries(initial ?? {}));
  let throwOnGet = false;
  let throwOnSet = false;
  let setCalls = 0;

  const storage: StorageLike = {
    getItem(key: string) {
      if (throwOnGet) throw new Error("SecurityError: storage read blocked");
      return map.has(key) ? map.get(key)! : null;
    },
    setItem(key: string, value: string) {
      setCalls += 1;
      if (throwOnSet) throw new Error("QuotaExceededError: storage write blocked");
      map.set(key, value);
    },
  };

  return {
    storage,
    map,
    setThrowOnGet(val: boolean) {
      throwOnGet = val;
    },
    setThrowOnSet(val: boolean) {
      throwOnSet = val;
    },
    getSetCalls() {
      return setCalls;
    },
  };
}

function createFakeEventTarget() {
  const listeners = new Set<(event: StorageEventLike) => void>();
  const target: StorageEventTargetLike = {
    addEventListener(_type, listener) {
      listeners.add(listener);
    },
    removeEventListener(_type, listener) {
      listeners.delete(listener);
    },
  };

  return {
    target,
    dispatch(key: string | null) {
      for (const listener of [...listeners]) {
        listener({ key });
      }
    },
    listenerCount() {
      return listeners.size;
    },
  };
}

test("sanitizeFavoriteIds rejects non-arrays, deduplicates, trims, and filters invalid property IDs", () => {
  assert.equal(sanitizeFavoriteIds(null, VALID_IDS), null);
  assert.equal(sanitizeFavoriteIds({}, VALID_IDS), null);
  assert.equal(sanitizeFavoriteIds("stay-01", VALID_IDS), null);
  assert.equal(sanitizeFavoriteIds(42, VALID_IDS), null);
  assert.deepEqual(sanitizeFavoriteIds([], VALID_IDS), []);

  const cleaned = sanitizeFavoriteIds(
    [" stay-03 ", 123, "", "   ", "unknown-stay", "stay-01", "stay-03", null],
    VALID_IDS
  );
  assert.deepEqual(cleaned, ["stay-03", "stay-01"]);
  assert.equal(Object.isFrozen(cleaned), true);
});

test("toggleFavoriteId adds valid IDs, removes existing IDs, and no-ops on unknown or blank IDs", () => {
  const initial = Object.freeze(["stay-01"]);
  assert.equal(toggleFavoriteId(initial, "unknown-stay", VALID_IDS), initial);
  assert.equal(toggleFavoriteId(initial, "   ", VALID_IDS), initial);

  const added = toggleFavoriteId(initial, " stay-02 ", VALID_IDS);
  assert.deepEqual(added, ["stay-01", "stay-02"]);
  assert.equal(Object.isFrozen(added), true);

  const removed = toggleFavoriteId(added, "stay-01", VALID_IDS);
  assert.deepEqual(removed, ["stay-02"]);
});

test("createBrowserFavoritesAdapter distinguishes absent vs explicit empty, handles corrupted JSON, and keeps snapshot referentially stable", () => {
  const fake = createFakeStorage();
  const repo = createBrowserFavoritesAdapter({
    storage: fake.storage,
    validPropertyIds: VALID_IDS,
  });

  assert.deepEqual(repo.getServerSnapshot(), DEFAULT_FAVORITE_IDS);
  assert.equal(repo.getServerSnapshot(), repo.getServerSnapshot());

  const firstSnap = repo.getSnapshot();
  assert.deepEqual(firstSnap, DEFAULT_FAVORITE_IDS);
  assert.equal(repo.getSnapshot(), firstSnap);

  fake.map.set(FAVORITES_STORAGE_KEY, "[]");
  const emptySnap = repo.getSnapshot();
  assert.deepEqual(emptySnap, []);
  assert.equal(repo.getSnapshot(), emptySnap);

  fake.map.set(FAVORITES_STORAGE_KEY, "{broken-json");
  const brokenSnap = repo.getSnapshot();
  assert.deepEqual(brokenSnap, DEFAULT_FAVORITE_IDS);
  assert.equal(repo.getSnapshot(), brokenSnap);

  fake.map.set(FAVORITES_STORAGE_KEY, JSON.stringify({ not: "an-array" }));
  const nonArraySnap = repo.getSnapshot();
  assert.deepEqual(nonArraySnap, DEFAULT_FAVORITE_IDS);
  assert.equal(repo.getSnapshot(), nonArraySnap);

  fake.map.set(FAVORITES_STORAGE_KEY, JSON.stringify(["stay-05", "ghost-id", "stay-05", "stay-02"]));
  const sanitizedSnap = repo.getSnapshot();
  assert.deepEqual(sanitizedSnap, ["stay-05", "stay-02"]);
  assert.equal(repo.getSnapshot(), sanitizedSnap);

  const customRepo = createBrowserFavoritesAdapter({
    storage: createFakeStorage().storage,
    validPropertyIds: VALID_IDS,
    defaultIds: ["stay-04", "unknown", "stay-04"],
  });
  assert.deepEqual(customRepo.getServerSnapshot(), ["stay-04"]);
  assert.deepEqual(customRepo.getSnapshot(), ["stay-04"]);

  const emptyDefaultRepo = createBrowserFavoritesAdapter({
    storage: createFakeStorage().storage,
    validPropertyIds: VALID_IDS,
    defaultIds: [],
  });
  assert.deepEqual(emptyDefaultRepo.getServerSnapshot(), []);
  assert.deepEqual(emptyDefaultRepo.getSnapshot(), []);

  const prePopulated = createFakeStorage({
    [FAVORITES_STORAGE_KEY]: JSON.stringify(["stay-03"]),
  });
  const lazyRepo = createBrowserFavoritesAdapter({
    storage: prePopulated.storage,
    validPropertyIds: VALID_IDS,
  });
  assert.deepEqual(lazyRepo.toggle("stay-05"), ["stay-03", "stay-05"]);
});

test("createBrowserFavoritesAdapter persists toggle/setAll, degrades gracefully on storage errors, and syncs cross-tab storage events", () => {
  const fake = createFakeStorage();
  const events = createFakeEventTarget();
  const repo = createBrowserFavoritesAdapter({
    storage: fake.storage,
    validPropertyIds: VALID_IDS,
    eventTarget: events.target,
  });

  let notifications = 0;
  const unsub = repo.subscribe(() => {
    notifications += 1;
  });
  assert.equal(events.listenerCount(), 1);

  const afterRemove = repo.toggle("stay-01");
  assert.deepEqual(afterRemove, ["stay-02"]);
  assert.equal(fake.map.get(FAVORITES_STORAGE_KEY), JSON.stringify(["stay-02"]));
  assert.equal(notifications, 1);

  const prevSetCalls = fake.getSetCalls();
  repo.toggle("non-existent-stay");
  repo.setAll(["stay-02"]);
  assert.equal(fake.getSetCalls(), prevSetCalls);
  assert.equal(notifications, 1);

  events.dispatch("other_key");
  assert.equal(notifications, 1);

  fake.map.set(FAVORITES_STORAGE_KEY, JSON.stringify(["stay-04", "stay-08"]));
  events.dispatch(FAVORITES_STORAGE_KEY);
  assert.equal(notifications, 2);
  assert.deepEqual(repo.getSnapshot(), ["stay-04", "stay-08"]);

  fake.setThrowOnSet(true);
  const afterRestrictedToggle = repo.toggle("stay-03");
  assert.deepEqual(afterRestrictedToggle, ["stay-04", "stay-08", "stay-03"]);
  assert.equal(repo.getSnapshot(), afterRestrictedToggle);
  assert.equal(notifications, 3);

  fake.setThrowOnGet(true);
  assert.equal(repo.getSnapshot(), afterRestrictedToggle);
  events.dispatch(FAVORITES_STORAGE_KEY);
  assert.equal(repo.getSnapshot(), afterRestrictedToggle);

  fake.setThrowOnGet(false);
  fake.setThrowOnSet(false);
  events.dispatch(FAVORITES_STORAGE_KEY);
  assert.deepEqual(repo.getSnapshot(), ["stay-04", "stay-08"]);
  assert.equal(notifications, 4);

  fake.map.clear();
  events.dispatch(null);
  assert.deepEqual(repo.getSnapshot(), DEFAULT_FAVORITE_IDS);
  assert.equal(notifications, 5);

  let secondNotifications = 0;
  const unsubSecond = repo.subscribe(() => {
    secondNotifications += 1;
  });
  assert.equal(events.listenerCount(), 1);
  unsub();
  assert.equal(events.listenerCount(), 1);
  unsub();
  assert.equal(events.listenerCount(), 1);
  repo.toggle("stay-01");
  assert.equal(secondNotifications, 1);

  unsubSecond();
  assert.equal(events.listenerCount(), 0);
  unsubSecond();
  assert.equal(events.listenerCount(), 0);
});

test("createInMemoryFavoritesAdapter supports deterministic toggle, setAll, and subscription", () => {
  const repo = createInMemoryFavoritesAdapter({
    initialIds: ["stay-01", "invalid", "stay-01"],
    validPropertyIds: VALID_IDS,
  });

  assert.deepEqual(repo.getSnapshot(), ["stay-01"]);
  assert.deepEqual(repo.getServerSnapshot(), ["stay-01"]);

  let calls = 0;
  const unsub = repo.subscribe(() => {
    calls += 1;
  });

  repo.toggle("stay-05");
  assert.deepEqual(repo.getSnapshot(), ["stay-01", "stay-05"]);
  assert.equal(calls, 1);

  repo.setAll(["stay-02", "stay-02", "unknown"]);
  assert.deepEqual(repo.getSnapshot(), ["stay-02"]);
  assert.equal(calls, 2);

  unsub();
  repo.toggle("stay-02");
  assert.deepEqual(repo.getSnapshot(), []);
  assert.equal(calls, 2);
});

test("Reservation adapters and AppPorts factories support browser, in-memory, and strict HTTP contract envelopes", async () => {
  const quote = deriveBookingQuote(
    startCheckoutSession(createIdleBookingSession(), stay02, undefined, baseDate),
    baseDate
  )!;
  const request = {
    quote,
    guestInfo: {
      fullName: "Nguyễn Văn A",
      phone: "0912 345 678",
      email: "a@example.com",
    },
    paymentMethod: "momo" as const,
  };

  const memPorts = createInMemoryAppPorts({
    initialFavoriteIds: ["stay-02"],
    validPropertyIds: VALID_IDS,
    bookingId: "LX-PORT01",
    createdAt: "2026-11-21T10:00:00.000Z",
  });
  assert.deepEqual(memPorts.favorites.getSnapshot(), ["stay-02"]);

  const booking = await memPorts.reservations.submit(request);
  assert.equal(booking.bookingId, "LX-PORT01");
  assert.equal(memPorts.reservations.getSubmittedBookings().length, 1);
  assert.equal(Object.isFrozen(booking), true);
  assert.equal(Object.isFrozen(booking.guests), true);
  assert.equal(Object.isFrozen(booking.pricing), true);
  assert.equal(Object.isFrozen(booking.selectedAmenities), true);
  assert.equal(Object.isFrozen(booking.guestInfo), true);
  request.guestInfo.fullName = "MUTATED";
  assert.equal(memPorts.reservations.getSubmittedBookings()[0].guestInfo.fullName, "Nguyễn Văn A");
  request.guestInfo.fullName = "Nguyễn Văn A";

  // Browser reservation adapter completion & AbortSignal cancellation
  const browserAdapter = createBrowserReservationAdapter(-50);
  const completed = await browserAdapter.submit(request);
  assert.ok(completed.bookingId?.startsWith("LX-"));
  assert.equal(Object.isFrozen(completed), true);

  const slowAdapter = createBrowserReservationAdapter(500);
  const controller = new AbortController();
  const abortedPromise = slowAdapter.submit(request, { signal: controller.signal });
  controller.abort();
  await assert.rejects(abortedPromise, (err: unknown) => err instanceof Error && err.name === "AbortError");

  // Pre-aborted signal on in-memory adapter
  const preAborted = new AbortController();
  preAborted.abort();
  await assert.rejects(
    createInMemoryReservationAdapter().submit(request, { signal: preAborted.signal }),
    (err: unknown) => err instanceof Error && err.name === "AbortError"
  );

  // HTTP reservation adapter sends ServerReservationIntent & parses ApiSuccess<BookingDetails>
  const httpAdapter = createHttpReservationAdapter({
    baseUrl: "http://localhost:4000",
    fetchImpl: async (input, init) => {
      assert.equal(String(input), "http://localhost:4000/api/v1/reservations");
      const intent = JSON.parse(String(init?.body));
      assert.equal("pricing" in intent, false);
      const serverResult = processServerReservationIntent(intent, PROPERTIES, {
        bookingId: "LX-HTTP01",
        createdAt: "2026-11-22T12:00:00.000Z",
        fallbackBaseDate: baseDate,
      });
      if (!serverResult.ok) {
        return new Response(
          JSON.stringify(buildApiError("VALIDATION_ERROR", serverResult.error)),
          { status: serverResult.status, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify(
          buildApiSuccess(serverResult.booking, {
            requestId: "req-http-1",
            timestamp: "2026-11-22T12:00:00.000Z",
          })
        ),
        { status: 201, headers: { "Content-Type": "application/json" } }
      );
    },
  });

  const tamperedRequest = {
    ...request,
    quote: {
      ...request.quote,
      pricing: { ...request.quote.pricing, total: 0 },
    },
  };
  const httpBooking = await httpAdapter.submit(tamperedRequest);
  assert.equal(httpBooking.bookingId, "LX-HTTP01");
  assert.equal(httpBooking.pricing.total, request.quote.pricing.total);
  assert.equal(Object.isFrozen(httpBooking), true);
  assert.equal(Object.isFrozen(httpBooking.pricing), true);
});

test("createWebAppPorts enforces strict api mode errors (never silently falls back on 4xx/5xx or network failure) and supports explicit mock mode", async () => {
  const quote = deriveBookingQuote(
    startCheckoutSession(createIdleBookingSession(), stay02, undefined, baseDate),
    baseDate
  )!;
  const request = {
    quote,
    guestInfo: {
      fullName: "Nguyễn Văn A",
      phone: "0912 345 678",
      email: "a@example.com",
    },
    paymentMethod: "momo" as const,
  };

  // 1. Server 400 VALIDATION_ERROR surfaces as HttpApiError (no fallback)
  const validationPorts = createWebAppPorts({
    mode: "api",
    apiBaseUrl: "http://localhost:4000",
    validPropertyIds: VALID_IDS,
    fetchImpl: async () =>
      new Response(
        JSON.stringify(
          buildApiError("VALIDATION_ERROR", "Số điện thoại chưa đúng định dạng.", undefined, {
            requestId: "req-400",
            timestamp: "2026-11-24T00:00:00.000Z",
          })
        ),
        { status: 400, headers: { "Content-Type": "application/json" } }
      ),
  });

  await assert.rejects(
    validationPorts.reservations.submit(request),
    (err: unknown) =>
      err instanceof HttpApiError &&
      err.status === 400 &&
      err.code === "VALIDATION_ERROR" &&
      err.requestId === "req-400" &&
      err.message.includes("Số điện thoại")
  );

  // 2. Network offline throws HttpApiError(NETWORK_ERROR) (no fallback)
  const offlinePorts = createWebAppPorts({
    mode: "api",
    apiBaseUrl: "http://localhost:4000",
    validPropertyIds: VALID_IDS,
    fetchImpl: async () => {
      throw new TypeError("fetch failed");
    },
  });

  await assert.rejects(
    offlinePorts.reservations.submit(request),
    (err: unknown) => err instanceof HttpApiError && err.code === "NETWORK_ERROR" && err.status === 0
  );

  // 3. Explicit mock mode works offline without fetch
  const mockPorts = createWebAppPorts({
    mode: "mock",
    apiBaseUrl: "http://localhost:4000",
    validPropertyIds: VALID_IDS,
    mockReservationDelayMs: 0,
  });
  const mockBooking = await mockPorts.reservations.submit(request);
  assert.ok(mockBooking.bookingId?.startsWith("LX-"));
});

test("CatalogRepository validates API contracts, surfaces CONTRACT_MISMATCH, and switches cleanly between api and mock modes", async () => {
  // Mock mode reads seed snapshot
  const mockRepo = createCatalogRepositoryForMode({
    mode: "mock",
    apiBaseUrl: "http://localhost:4000",
  });
  const mockSnapshot = await mockRepo.getSnapshot();
  assert.equal(mockSnapshot.properties.length, 12);

  // API mode validates CatalogSnapshotSchema
  const apiRepo = createHttpCatalogRepository({
    baseUrl: "http://localhost:4000/",
    fetchImpl: async (input) => {
      assert.equal(String(input), "http://localhost:4000/api/v1/catalog");
      return new Response(
        JSON.stringify(
          buildApiSuccess(SEED_CATALOG_SNAPSHOT, {
            requestId: "req-cat-1",
            timestamp: "2026-11-24T00:00:00.000Z",
          })
        ),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    },
  });
  const apiSnapshot = await apiRepo.getSnapshot();
  assert.equal(apiSnapshot.properties.length, 12);
  assert.equal(apiSnapshot.promotions.vouchers.length, 2);

  // Malformed response triggers CONTRACT_MISMATCH
  const brokenRepo = createHttpCatalogRepository({
    baseUrl: "http://localhost:4000",
    fetchImpl: async () =>
      new Response(JSON.stringify({ ok: true, data: { broken: true } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
  });
  await assert.rejects(
    brokenRepo.getSnapshot(),
    (err: unknown) => err instanceof HttpApiError && err.code === "CONTRACT_MISMATCH"
  );

  // Env helpers normalize trailing slashes and defaults
  const pubEnv = getPublicWebEnv({
    NEXT_PUBLIC_DATA_MODE: "mock",
    NEXT_PUBLIC_API_BASE_URL: "http://localhost:4000///",
  });
  assert.equal(pubEnv.dataMode, "mock");
  assert.equal(pubEnv.publicApiBaseUrl, "http://localhost:4000");

  const srvEnv = getServerWebEnv({
    NEXT_PUBLIC_DATA_MODE: "api",
    NEXT_PUBLIC_API_BASE_URL: "https://api.luxestay.vn/",
    API_BASE_URL: "http://api-internal:4000/",
  });
  assert.equal(srvEnv.serverApiBaseUrl, "http://api-internal:4000");
  assert.equal(srvEnv.publicApiBaseUrl, "https://api.luxestay.vn");

  // Same-origin browser mode ("/") + Vercel Service Binding (API_BASE_URL) / VERCEL_URL fallback
  const sameOriginPublic = getPublicWebEnv({
    NEXT_PUBLIC_DATA_MODE: "api",
    NEXT_PUBLIC_API_BASE_URL: "/",
  });
  assert.equal(sameOriginPublic.publicApiBaseUrl, "");

  const vercelBindingEnv = getServerWebEnv({
    NEXT_PUBLIC_DATA_MODE: "api",
    NEXT_PUBLIC_API_BASE_URL: "/",
    API_BASE_URL: "https://backend-internal.vercel.internal/",
  });
  assert.equal(vercelBindingEnv.publicApiBaseUrl, "");
  assert.equal(vercelBindingEnv.serverApiBaseUrl, "https://backend-internal.vercel.internal");

  const vercelUrlFallbackEnv = getServerWebEnv({
    NEXT_PUBLIC_DATA_MODE: "api",
    NEXT_PUBLIC_API_BASE_URL: "same-origin",
    VERCEL_URL: "luxestay-preview.vercel.app",
  });
  assert.equal(vercelUrlFallbackEnv.publicApiBaseUrl, "");
  assert.equal(vercelUrlFallbackEnv.serverApiBaseUrl, "https://luxestay-preview.vercel.app");

  assert.throws(
    () =>
      getServerWebEnv({
        NEXT_PUBLIC_DATA_MODE: "api",
        NEXT_PUBLIC_API_BASE_URL: "/",
      }),
    /API_BASE_URL is required/
  );

  // Relative same-origin HTTP catalog fetch hits /api/v1/catalog directly
  const relativeCalls: string[] = [];
  const relativeRepo = createHttpCatalogRepository({
    baseUrl: "",
    fetchImpl: async (input) => {
      relativeCalls.push(String(input));
      return new Response(
        JSON.stringify(
          buildApiSuccess(SEED_CATALOG_SNAPSHOT, {
            requestId: "req-relative",
            timestamp: "2026-11-24T00:00:00.000Z",
          })
        ),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    },
  });
  const relativeSnap = await relativeRepo.getSnapshot();
  assert.equal(relativeSnap.properties.length, SEED_CATALOG_SNAPSHOT.properties.length);
  assert.deepEqual(relativeCalls, ["/api/v1/catalog"]);
});

test("CatalogRepository.getPropertyById supports mock lookup, HTTP 200, HTTP 404 -> null, and CONTRACT_MISMATCH", async () => {
  const mockRepo = createCatalogRepositoryForMode({
    mode: "mock",
    apiBaseUrl: "http://localhost:4000",
  });
  const mockFound = await mockRepo.getPropertyById("stay-01");
  assert.equal(mockFound?.id, "stay-01");
  const mockMissing = await mockRepo.getPropertyById("does-not-exist");
  assert.equal(mockMissing, null);

  const httpRepo = createHttpCatalogRepository({
    baseUrl: "http://localhost:4000/",
    fetchImpl: async (input) => {
      const url = String(input);
      if (url === "http://localhost:4000/api/v1/properties/stay-02") {
        return new Response(
          JSON.stringify(
            buildApiSuccess(stay02, {
              requestId: "req-prop-200",
              timestamp: "2026-11-24T00:00:00.000Z",
            })
          ),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      if (url === "http://localhost:4000/api/v1/properties/unknown-stay") {
        return new Response(
          JSON.stringify(
            buildApiError("NOT_FOUND", "Không tìm thấy chỗ nghỉ.", undefined, {
              requestId: "req-prop-404",
              timestamp: "2026-11-24T00:00:00.000Z",
            })
          ),
          { status: 404, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response(JSON.stringify({ ok: true, data: { invalid: true } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    },
  });

  const found = await httpRepo.getPropertyById("stay-02");
  assert.equal(found?.id, "stay-02");
  assert.equal(found?.title, stay02.title);

  const missing = await httpRepo.getPropertyById("unknown-stay");
  assert.equal(missing, null);

  await assert.rejects(
    httpRepo.getPropertyById("corrupted-stay"),
    (err: unknown) => err instanceof HttpApiError && err.code === "CONTRACT_MISMATCH"
  );
});

test("ReservationManagerPort supports browser localStorage persistence, in-memory auto-sync, and HTTP lookup/cancel error envelopes", async () => {
  const quote = deriveBookingQuote(
    startCheckoutSession(createIdleBookingSession(), stay02, undefined, baseDate),
    baseDate
  )!;
  const request = {
    quote,
    guestInfo: {
      fullName: "Trần Minh Quân",
      phone: "0912 345 678",
      email: "quan.tran@example.com",
    },
    paymentMethod: "vnpay" as const,
  };

  // 1. Browser mock adapter + manager share StorageLike persistence
  const fakeStorage = createFakeStorage();
  const browserSubmitter = createBrowserReservationAdapter(0, { storage: fakeStorage.storage });
  const browserManager = createBrowserReservationManagerAdapter({ storage: fakeStorage.storage });

  const created = await browserSubmitter.submit(request);
  assert.ok(created.bookingId);
  assert.equal(created.status, "confirmed");

  // Lookup by case-insensitive email & normalized +84 phone
  const foundByEmail = await browserManager.lookup(
    created.bookingId.toLowerCase(),
    "QUAN.TRAN@EXAMPLE.COM"
  );
  assert.equal(foundByEmail.bookingId, created.bookingId);

  const foundByPhone = await browserManager.lookup(created.bookingId, "+84 912-345-678");
  assert.equal(foundByPhone.bookingId, created.bookingId);

  // Wrong contact -> 403 FORBIDDEN
  await assert.rejects(
    browserManager.lookup(created.bookingId, "wrong@example.com"),
    (err: unknown) => err instanceof HttpApiError && err.status === 403 && err.code === "FORBIDDEN"
  );

  // Unknown booking -> 404 NOT_FOUND
  await assert.rejects(
    browserManager.lookup("LX-999999", "quan.tran@example.com"),
    (err: unknown) => err instanceof HttpApiError && err.status === 404 && err.code === "NOT_FOUND"
  );

  // Cancel persists cancelled status and blocks double-cancel with 409 CONFLICT
  const cancelled = await browserManager.cancel(created.bookingId, {
    contact: "0912345678",
    reason: "Thay đổi lịch trình công tác",
  });
  assert.equal(cancelled.status, "cancelled");
  assert.ok(cancelled.cancelledAt);
  assert.equal(cancelled.cancellationReason, "Thay đổi lịch trình công tác");

  const reFetched = await browserManager.lookup(created.bookingId, "quan.tran@example.com");
  assert.equal(reFetched.status, "cancelled");

  await assert.rejects(
    browserManager.cancel(created.bookingId, { contact: "quan.tran@example.com" }),
    (err: unknown) => err instanceof HttpApiError && err.status === 409 && err.code === "CONFLICT"
  );

  // 2. In-memory AppPorts auto-registers submitted bookings in reservationManager
  const memPorts = createInMemoryAppPorts({
    validPropertyIds: VALID_IDS,
    bookingId: "LX-MEM001",
    createdAt: "2026-11-24T08:00:00.000Z",
  });
  await memPorts.reservations.submit(request);
  const memFound = await memPorts.reservationManager.lookup("lx-mem001", "quan.tran@example.com");
  assert.equal(memFound.bookingId, "LX-MEM001");
  const memCancelled = await memPorts.reservationManager.cancel("LX-MEM001", {
    contact: "0912345678",
  });
  assert.equal(memCancelled.status, "cancelled");

  // 3. HTTP ReservationManagerAdapter sends correct URL/method and propagates 403/409 errors
  const httpManager = createHttpReservationManagerAdapter({
    baseUrl: "http://localhost:4000/",
    fetchImpl: async (input, init) => {
      const url = String(input);
      if (init?.method === "GET") {
        assert.equal(
          url,
          "http://localhost:4000/api/v1/reservations/LX-HTTP99?contact=quan.tran%40example.com"
        );
        return new Response(
          JSON.stringify(
            buildApiSuccess(created, {
              requestId: "req-lookup-1",
              timestamp: "2026-11-24T09:00:00.000Z",
            })
          ),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      if (init?.method === "PATCH") {
        assert.equal(url, "http://localhost:4000/api/v1/reservations/LX-HTTP99/cancel");
        const body = JSON.parse(String(init.body));
        if (body.contact === "already-cancelled@example.com") {
          return new Response(
            JSON.stringify(
              buildApiError("CONFLICT", "Đơn đặt phòng này đã được hủy trước đó.", undefined, {
                requestId: "req-cancel-409",
                timestamp: "2026-11-24T09:01:00.000Z",
              })
            ),
            { status: 409, headers: { "Content-Type": "application/json" } }
          );
        }
        return new Response(
          JSON.stringify(
            buildApiSuccess(cancelled, {
              requestId: "req-cancel-200",
              timestamp: "2026-11-24T09:02:00.000Z",
            })
          ),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      throw new Error(`Unexpected request: ${init?.method} ${url}`);
    },
  });

  const httpFound = await httpManager.lookup("LX-HTTP99", "quan.tran@example.com");
  assert.equal(httpFound.bookingId, created.bookingId);
  assert.equal(Object.isFrozen(httpFound), true);

  const httpCancelled = await httpManager.cancel("LX-HTTP99", {
    contact: "quan.tran@example.com",
    reason: "Đổi kế hoạch",
  });
  assert.equal(httpCancelled.status, "cancelled");

  await assert.rejects(
    httpManager.cancel("LX-HTTP99", { contact: "already-cancelled@example.com" }),
    (err: unknown) =>
      err instanceof HttpApiError &&
      err.status === 409 &&
      err.code === "CONFLICT" &&
      err.requestId === "req-cancel-409"
  );
});

test("AuthPort supports HttpOnly cookie credentials, register/login/OTP, and remote favorites sync", async () => {
  // 1. Mock AuthPort works offline for mock mode
  const mockAuth = createMockAuthPort();
  assert.equal(await mockAuth.me(), null);
  const otpReq = await mockAuth.requestOtp({ identifier: "0912345678" });
  assert.equal(otpReq.devCode, "123456");
  await assert.rejects(
    mockAuth.verifyOtp({ identifier: "0912345678", code: "000000" }),
    (err: unknown) => err instanceof HttpApiError && err.status === 401
  );
  const otpUser = await mockAuth.verifyOtp({
    identifier: "0912345678",
    code: "123456",
    fullName: "Khách Mock",
  });
  assert.equal(otpUser.fullName, "Khách Mock");
  assert.deepEqual(await mockAuth.syncFavorites(["stay-01", "stay-02"], "merge"), [
    "stay-01",
    "stay-02",
  ]);
  assert.deepEqual(await mockAuth.toggleRemoteFavorite("stay-01"), ["stay-02"]);
  await mockAuth.logout();
  assert.equal(await mockAuth.me(), null);

  // 2. HTTP AuthPort sends credentials: include and validates contracts
  const sampleUser = {
    id: "USR-HTTP01",
    email: "member@luxestay.vn",
    fullName: "Nguyễn Thành Viên",
    provider: "password" as const,
    role: "guest" as const,
    createdAt: "2026-11-24T10:00:00.000Z",
  };
  const httpAuth = createHttpAuthPort({
    baseUrl: "http://localhost:4000/",
    fetchImpl: async (input, init) => {
      assert.equal(init?.credentials, "include");
      const url = String(input);
      if (url === "http://localhost:4000/api/v1/auth/me") {
        return new Response(JSON.stringify(buildApiSuccess({ user: sampleUser })), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (url === "http://localhost:4000/api/v1/auth/login") {
        const body = JSON.parse(String(init?.body));
        if (body.password !== "secret123") {
          return new Response(
            JSON.stringify(buildApiError("UNAUTHORIZED", "Sai mật khẩu")),
            { status: 401, headers: { "Content-Type": "application/json" } }
          );
        }
        return new Response(JSON.stringify(buildApiSuccess({ user: sampleUser })), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (url === "http://localhost:4000/api/v1/favorites?mode=merge") {
        return new Response(
          JSON.stringify(buildApiSuccess({ propertyIds: ["stay-01", "stay-05"] })),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      throw new Error(`Unexpected auth request: ${url}`);
    },
  });

  assert.equal((await httpAuth.me())?.id, "USR-HTTP01");
  await assert.rejects(
    httpAuth.login({ email: "member@luxestay.vn", password: "wrong" }),
    (err: unknown) => err instanceof HttpApiError && err.status === 401 && err.code === "UNAUTHORIZED"
  );
  assert.equal((await httpAuth.login({ email: "member@luxestay.vn", password: "secret123" })).email, "member@luxestay.vn");
  assert.deepEqual(await httpAuth.syncFavorites(["stay-01"], "merge"), ["stay-01", "stay-05"]);
});

test("PaymentGatewayPort validates vouchers, loads gateway sessions, and simulates sandbox outcomes", async () => {
  // Mock voucher validation uses domain engine directly
  const mockPayment = createMockPaymentGatewayPort({
    vouchers: SEED_CATALOG_SNAPSHOT.promotions.vouchers,
  });
  const okVoucher = await mockPayment.validateVoucher({ code: "luxestay250", subtotal: 2000000 });
  assert.equal(okVoucher.valid, true);
  assert.equal(okVoucher.discount, 250000);

  const badVoucher = await mockPayment.validateVoucher({ code: "LUXESTAY250", subtotal: 900000 });
  assert.equal(badVoucher.valid, false);
  assert.equal(badVoucher.discount, 0);

  // HTTP PaymentGatewayPort validates PaymentGatewaySession & PaymentWebhookResult contracts
  const sampleTx = {
    transactionId: "TXN-DEMO01",
    bookingId: "LX-PAY123",
    provider: "vnpay" as const,
    amount: 2450000,
    currency: "VND" as const,
    status: "pending" as const,
    checkoutUrl: "/payments/TXN-DEMO01",
    expiresAt: "2026-11-24T11:00:00.000Z",
    createdAt: "2026-11-24T10:45:00.000Z",
    updatedAt: "2026-11-24T10:45:00.000Z",
  };
  const httpPayment = createHttpPaymentGatewayPort({
    baseUrl: "http://localhost:4000",
    fetchImpl: async (input, init) => {
      assert.equal(init?.credentials, "include");
      const url = String(input);
      if (url === "http://localhost:4000/api/v1/payments/TXN-DEMO01") {
        return new Response(
          JSON.stringify(
            buildApiSuccess({
              transaction: sampleTx,
              bookingSummary: {
                bookingId: "LX-PAY123",
                propertyTitle: stay02.title,
                propertyCity: stay02.location.city,
                checkIn: "20/12/2026",
                checkOut: "22/12/2026",
                nights: 2,
                guestFullName: "Test Guest",
                guestEmail: "guest@luxestay.vn",
                status: "pending_payment",
              },
              sandboxEnabled: true,
            })
          ),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      if (url === "http://localhost:4000/api/v1/payments/TXN-DEMO01/simulate") {
        return new Response(
          JSON.stringify(
            buildApiSuccess({
              received: true,
              deduplicated: false,
              transaction: { ...sampleTx, status: "succeeded", paidAt: "2026-11-24T10:46:00.000Z" },
              bookingStatus: "confirmed",
            })
          ),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      throw new Error(`Unexpected payment request: ${url}`);
    },
  });

  const gw = await httpPayment.getGatewaySession("txn-demo01");
  assert.equal(gw.transaction.transactionId, "TXN-DEMO01");
  assert.equal(gw.sandboxEnabled, true);

  const sim = await httpPayment.simulateOutcome("TXN-DEMO01", { outcome: "succeeded" });
  assert.equal(sim.bookingStatus, "confirmed");
  assert.equal(sim.deduplicated, false);
});

test("Phase 3A PropertyExperiencePort and ReservationManagerPort.complete work in mock and strict HTTP contract modes", async () => {
  const stay01 = PROPERTIES.find((p) => p.id === "stay-01")!;
  const created = processServerReservationIntent(
    {
      propertyId: "stay-01",
      checkInSeed: "2027-03-10",
      nights: 2,
      guests: { adults: 2, children: 0, rooms: 1 },
      selectedAmenityIds: [],
      guestInfo: { fullName: "Khách 3A", phone: "0912345678", email: "guest3a@luxestay.vn" },
      paymentMethod: "hotel",
    },
    PROPERTIES,
    { bookingId: "LX-3A0001", fallbackBaseDate: baseDate }
  );
  assert.equal(created.ok, true);
  if (!created.ok) return;

  // 1. Mock experience port builds availability calendar & enforces review eligibility
  const storedBookings = [created.booking];
  const mockExp = createMockPropertyExperiencePort({
    properties: PROPERTIES,
    getBookings: () => storedBookings,
  });

  const cal = await mockExp.getAvailability("stay-01", { from: "2027-03-10", to: "2027-03-13" });
  assert.equal(cal.days.length, 4);
  assert.equal(cal.days[0]?.remainingUnits, 0); // occupied by confirmed LX-3A0001
  assert.equal(cal.days[1]?.remainingUnits, 0);
  assert.equal(cal.days[2]?.remainingUnits, 1);

  // Uncompleted future stay cannot be reviewed
  await assert.rejects(
    mockExp.submitReview("stay-01", {
      bookingId: "LX-3A0001",
      contact: "guest3a@luxestay.vn",
      rating: 5,
      comment: "Thử gửi đánh giá trước khi hoàn tất lưu trú.",
    }),
    (err: unknown) => err instanceof HttpApiError && err.status === 409
  );

  // Mark booking completed via in-memory manager & submit verified review
  const ports = createInMemoryAppPorts({
    properties: PROPERTIES,
    bookingId: "LX-3A0002",
  });
  const quote = deriveBookingQuote(
    startCheckoutSession(createIdleBookingSession(), stay01, undefined, baseDate),
    baseDate
  )!;
  await ports.reservations.submit({
    quote,
    guestInfo: { fullName: "Khách 3A", phone: "0912345678", email: "guest3a@luxestay.vn" },
    paymentMethod: "hotel",
  });
  const completed = await ports.reservationManager.complete("LX-3A0002", {
    contact: "guest3a@luxestay.vn",
  });
  assert.equal(completed.status, "completed");
  assert.ok(completed.completedAt);

  // 2. HTTP experience & reservation complete adapters enforce contract envelopes
  const httpExp = createHttpPropertyExperiencePort({
    baseUrl: "http://localhost:4000",
    fetchImpl: async (input, init) => {
      assert.equal(init?.credentials, "include");
      const url = String(input);
      if (url.startsWith("http://localhost:4000/api/v1/properties/stay-01/availability")) {
        return new Response(JSON.stringify(buildApiSuccess(cal)), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (url === "http://localhost:4000/api/v1/properties/stay-01/reviews") {
        return new Response(
          JSON.stringify(
            buildApiSuccess({
              review: {
                id: "rev-http-01",
                authorName: "Khách 3A",
                authorAvatar: "https://example.com/a.jpg",
                rating: 5,
                date: "Tháng 11, 2026",
                comment: "Trải nghiệm cực kỳ hài lòng và đúng mô tả!",
                bookingId: "LX-3A0002",
                isVerified: true,
                createdAt: "2026-11-24T12:00:00.000Z",
              },
              propertyRating: 4.96,
              propertyReviewCount: stay01.reviewCount + 1,
            })
          ),
          { status: 201, headers: { "Content-Type": "application/json" } }
        );
      }
      throw new Error(`Unexpected experience request: ${url}`);
    },
  });

  const httpCal = await httpExp.getAvailability("stay-01", { from: "2027-03-10", to: "2027-03-13" });
  assert.equal(httpCal.propertyId, "stay-01");
  assert.equal(httpCal.days.length, 4);

  const reviewRes = await httpExp.submitReview("stay-01", {
    bookingId: "LX-3A0002",
    contact: "guest3a@luxestay.vn",
    rating: 5,
    comment: "Trải nghiệm cực kỳ hài lòng và đúng mô tả!",
  });
  assert.equal(reviewRes.review.isVerified, true);
  assert.equal(reviewRes.propertyReviewCount, stay01.reviewCount + 1);

  const httpManager = createHttpReservationManagerAdapter({
    baseUrl: "http://localhost:4000",
    fetchImpl: async (input, init) => {
      assert.equal(String(input), "http://localhost:4000/api/v1/reservations/LX-3A0002/complete");
      assert.equal(init?.method, "POST");
      assert.equal(init?.credentials, "include");
      return new Response(JSON.stringify(buildApiSuccess(completed)), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    },
  });
  const httpCompleted = await httpManager.complete("LX-3A0002", { contact: "guest3a@luxestay.vn" });
  assert.equal(httpCompleted.status, "completed");
});

test("Phase 3B HostPort supports CRUD, availability overrides, and analytics in mock and strict HTTP contract modes", async () => {
  // 1. Mock HostPort CRUD + analytics
  const mockHost = createMockHostPort({ properties: PROPERTIES.slice(0, 2) });
  const initialList = await mockHost.listProperties();
  assert.equal(initialList.length, 2);

  const created = await mockHost.createProperty({
    title: "Mock Forest Villa",
    subtitle: "Villa nghỉ dưỡng cao cấp tại Đà Lạt",
    propertyType: "villa",
    category: "pine-forest",
    location: {
      city: "Đà Lạt",
      province: "Lâm Đồng",
      address: "Đường Đống Đa, Phường 3",
      distanceToCenter: "Cách trung tâm 2 km",
    },
    images: ["https://images.unsplash.com/photo-1587061949409-02df41d5e562?auto=format&fit=crop&w=1200&q=80"],
    pricePerNight: 2_000_000,
    inventoryCount: 1,
    maxGuests: 4,
    bedrooms: 2,
    beds: 2,
    bathrooms: 2,
    freeCancellation: true,
    breakfastIncluded: false,
    description: "Không gian biệt thự riêng tư có sân vườn rộng và lò sưởi ấm áp giữa rừng thông.",
    amenityIds: ["high-speed-wifi"],
  });
  assert.equal((await mockHost.listProperties()).length, 3);

  const updated = await mockHost.updateProperty(created.id, { pricePerNight: 2_400_000 });
  assert.equal(updated.pricePerNight, 2_400_000);

  const avail = await mockHost.upsertAvailability(created.id, {
    dates: [{ date: "2027-08-10", isBlocked: true, note: "Bảo trì" }],
  });
  assert.equal(avail.days[0]?.isBlocked, true);

  const deleted = await mockHost.deleteProperty(created.id);
  assert.equal(deleted.deleted, true);

  const stats = await mockHost.getAnalytics();
  assert.equal(stats.totalProperties, 2);

  // 2. HTTP HostPort verifies credentials include, contract parsing, and RBAC error propagation
  const httpHost = createHttpHostPort({
    baseUrl: "http://localhost:4000",
    fetchImpl: async (input, init) => {
      assert.equal(init?.credentials, "include");
      const url = String(input);
      if (url === "http://localhost:4000/api/v1/host/properties") {
        return new Response(
          JSON.stringify(buildApiSuccess({ properties: PROPERTIES.slice(0, 1) })),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      if (url === "http://localhost:4000/api/v1/host/analytics") {
        return new Response(JSON.stringify(buildApiSuccess(stats)), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (url === "http://localhost:4000/api/v1/host/properties/stay-07") {
        return new Response(
          JSON.stringify(buildApiError("FORBIDDEN", "Không thuộc quyền quản lý")),
          { status: 403, headers: { "Content-Type": "application/json" } }
        );
      }
      throw new Error(`Unexpected host request: ${url}`);
    },
  });

  assert.equal((await httpHost.listProperties()).length, 1);
  assert.equal((await httpHost.getAnalytics()).totalProperties, 2);
  await assert.rejects(
    httpHost.deleteProperty("stay-07"),
    (err: unknown) => err instanceof HttpApiError && err.status === 403 && err.code === "FORBIDDEN"
  );
});
