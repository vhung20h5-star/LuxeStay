import test from "node:test";
import assert from "node:assert/strict";
import { PROPERTIES } from "@/data/properties";
import {
  createIdleBookingSession,
  deriveBookingQuote,
  processServerReservationIntent,
  startCheckoutSession,
} from "@/lib/bookingSession";
import {
  DEFAULT_FAVORITE_IDS,
  FAVORITES_STORAGE_KEY,
  sanitizeFavoriteIds,
  toggleFavoriteId,
  createBrowserFavoritesAdapter,
  createInMemoryFavoritesAdapter,
  createBrowserReservationAdapter,
  createHttpReservationAdapter,
  createInMemoryReservationAdapter,
  createBrowserAppPorts,
  createInMemoryAppPorts,
} from "@/lib/persistencePort";
import type { StorageEventLike, StorageEventTargetLike, StorageLike } from "@/types";

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

  // Unknown or blank ID returns exact same reference
  assert.equal(toggleFavoriteId(initial, "unknown-stay", VALID_IDS), initial);
  assert.equal(toggleFavoriteId(initial, "   ", VALID_IDS), initial);

  // Adds valid trimmed ID
  const added = toggleFavoriteId(initial, " stay-02 ", VALID_IDS);
  assert.deepEqual(added, ["stay-01", "stay-02"]);
  assert.equal(Object.isFrozen(added), true);

  // Removes existing ID
  const removed = toggleFavoriteId(added, "stay-01", VALID_IDS);
  assert.deepEqual(removed, ["stay-02"]);
});

test("createBrowserFavoritesAdapter distinguishes absent vs explicit empty, handles corrupted JSON, and keeps snapshot referentially stable", () => {
  const fake = createFakeStorage();
  const repo = createBrowserFavoritesAdapter({
    storage: fake.storage,
    validPropertyIds: VALID_IDS,
  });

  // Server snapshot always matches defaults and does not touch storage
  assert.deepEqual(repo.getServerSnapshot(), DEFAULT_FAVORITE_IDS);
  assert.equal(repo.getServerSnapshot(), repo.getServerSnapshot());

  // Absent key (null) -> falls back to defaults with referential stability
  const firstSnap = repo.getSnapshot();
  assert.deepEqual(firstSnap, DEFAULT_FAVORITE_IDS);
  assert.equal(repo.getSnapshot(), firstSnap);

  // Explicit empty array "[]" is respected (never resurrected to defaults)
  fake.map.set(FAVORITES_STORAGE_KEY, "[]");
  const emptySnap = repo.getSnapshot();
  assert.deepEqual(emptySnap, []);
  assert.equal(repo.getSnapshot(), emptySnap);

  // Corrupted JSON or non-array falls back safely to defaults with referential stability
  fake.map.set(FAVORITES_STORAGE_KEY, "{broken-json");
  const brokenSnap = repo.getSnapshot();
  assert.deepEqual(brokenSnap, DEFAULT_FAVORITE_IDS);
  assert.equal(repo.getSnapshot(), brokenSnap);

  fake.map.set(FAVORITES_STORAGE_KEY, JSON.stringify({ not: "an-array" }));
  const nonArraySnap = repo.getSnapshot();
  assert.deepEqual(nonArraySnap, DEFAULT_FAVORITE_IDS);
  assert.equal(repo.getSnapshot(), nonArraySnap);

  // Valid JSON with stale/duplicate entries is sanitized
  fake.map.set(FAVORITES_STORAGE_KEY, JSON.stringify(["stay-05", "ghost-id", "stay-05", "stay-02"]));
  const sanitizedSnap = repo.getSnapshot();
  assert.deepEqual(sanitizedSnap, ["stay-05", "stay-02"]);
  assert.equal(repo.getSnapshot(), sanitizedSnap);

  // Custom defaultIds are sanitized (deduped, invalid dropped) and empty defaultIds is respected
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

  // toggle called before getSnapshot reads pre-populated storage first
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

  // Toggle writes to storage and notifies subscriber
  const afterRemove = repo.toggle("stay-01");
  assert.deepEqual(afterRemove, ["stay-02"]);
  assert.equal(fake.map.get(FAVORITES_STORAGE_KEY), JSON.stringify(["stay-02"]));
  assert.equal(notifications, 1);

  // No-op setAll or invalid toggle does not write or notify
  const prevSetCalls = fake.getSetCalls();
  repo.toggle("non-existent-stay");
  repo.setAll(["stay-02"]);
  assert.equal(fake.getSetCalls(), prevSetCalls);
  assert.equal(notifications, 1);

  // Cross-tab storage event for unrelated key is ignored
  events.dispatch("other_key");
  assert.equal(notifications, 1);

  // Cross-tab storage event for FAVORITES_STORAGE_KEY refreshes snapshot & notifies
  fake.map.set(FAVORITES_STORAGE_KEY, JSON.stringify(["stay-04", "stay-08"]));
  events.dispatch(FAVORITES_STORAGE_KEY);
  assert.equal(notifications, 2);
  assert.deepEqual(repo.getSnapshot(), ["stay-04", "stay-08"]);

  // Write error (QuotaExceededError / private mode) keeps in-memory state working with stable snapshot
  fake.setThrowOnSet(true);
  const afterRestrictedToggle = repo.toggle("stay-03");
  assert.deepEqual(afterRestrictedToggle, ["stay-04", "stay-08", "stay-03"]);
  assert.equal(repo.getSnapshot(), afterRestrictedToggle);
  assert.equal(notifications, 3);

  // Read error (SecurityError) never throws, keeps snapshot referentially stable, and survives storage event
  fake.setThrowOnGet(true);
  assert.equal(repo.getSnapshot(), afterRestrictedToggle);
  events.dispatch(FAVORITES_STORAGE_KEY);
  assert.equal(repo.getSnapshot(), afterRestrictedToggle);

  // Once storage becomes readable again, cross-tab event (even matching prior raw value or key:null clear) re-syncs cleanly
  fake.setThrowOnGet(false);
  fake.setThrowOnSet(false);
  // Storage still holds ["stay-04", "stay-08"] from before the failed write; event must re-sync back from diverged in-memory state
  events.dispatch(FAVORITES_STORAGE_KEY);
  assert.deepEqual(repo.getSnapshot(), ["stay-04", "stay-08"]);
  assert.equal(notifications, 4);

  // Cross-tab localStorage.clear() fires event with key: null and resets back to defaults
  fake.map.clear();
  events.dispatch(null);
  assert.deepEqual(repo.getSnapshot(), DEFAULT_FAVORITE_IDS);
  assert.equal(notifications, 5);

  // Multiple subscribers & idempotent double-unsubscribe
  let secondNotifications = 0;
  const unsubSecond = repo.subscribe(() => {
    secondNotifications += 1;
  });
  assert.equal(events.listenerCount(), 1);
  unsub();
  assert.equal(events.listenerCount(), 1);
  // Double unsubscribe on first handle must not remove the active target listener
  unsub();
  assert.equal(events.listenerCount(), 1);
  repo.toggle("stay-01");
  assert.equal(secondNotifications, 1);

  unsubSecond();
  assert.equal(events.listenerCount(), 0);
  // Idempotent double unsubscribe when already empty
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

test("Reservation adapters and AppPorts factories provide working browser and in-memory ports", async () => {
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

  // In-memory ports bundle records submitted bookings deterministically
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
  assert.equal(memPorts.reservations.getSubmittedBookings()[0].bookingId, "LX-PORT01");

  // BookingDetails receipt and nested owned records are deeply frozen & isolated from caller mutation
  assert.equal(Object.isFrozen(booking), true);
  assert.equal(Object.isFrozen(booking.guests), true);
  assert.equal(Object.isFrozen(booking.pricing), true);
  assert.equal(Object.isFrozen(booking.selectedAmenities), true);
  assert.equal(Object.isFrozen(booking.guestInfo), true);
  request.guestInfo.fullName = "MUTATED";
  assert.equal(memPorts.reservations.getSubmittedBookings()[0].guestInfo.fullName, "Nguyễn Văn A");

  // Browser reservation adapter sanitizes invalid delayMs and supports completion & AbortSignal cancellation
  const browserAdapter = createBrowserReservationAdapter(-50);
  const completed = await browserAdapter.submit(request);
  assert.ok(completed.bookingId?.startsWith("LX-"));
  assert.equal(Object.isFrozen(completed), true);

  const nanDelayAdapter = createBrowserReservationAdapter(Number.NaN);
  const nanController = new AbortController();
  const nanPromise = nanDelayAdapter.submit(request, { signal: nanController.signal });
  nanController.abort();
  await assert.rejects(nanPromise, (err: unknown) => err instanceof Error && err.name === "AbortError");

  const slowAdapter = createBrowserReservationAdapter(500);
  const controller = new AbortController();
  const abortedPromise = slowAdapter.submit(request, { signal: controller.signal });
  controller.abort();
  await assert.rejects(abortedPromise, (err: unknown) => err instanceof Error && err.name === "AbortError");

  // Browser app ports instantiate safely without window (SSR-safe)
  const ssrPorts = createBrowserAppPorts({ validPropertyIds: VALID_IDS });
  assert.deepEqual(ssrPorts.favorites.getServerSnapshot(), DEFAULT_FAVORITE_IDS);
  assert.deepEqual(ssrPorts.favorites.getSnapshot(), DEFAULT_FAVORITE_IDS);

  // In-memory reservation adapter honors pre-aborted signal
  const preAborted = new AbortController();
  preAborted.abort();
  await assert.rejects(
    createInMemoryReservationAdapter().submit(request, { signal: preAborted.signal }),
    (err: unknown) => err instanceof Error && err.name === "AbortError"
  );

  // HTTP reservation adapter sends ServerReservationIntent (stripping client pricing) and returns frozen BookingDetails
  let capturedBody: unknown = null;
  const httpAdapter = createHttpReservationAdapter({
    endpoint: "/api/reservations",
    fetchImpl: async (_input, init) => {
      capturedBody = JSON.parse(String(init?.body));
      const serverResult = processServerReservationIntent(
        capturedBody as Parameters<typeof processServerReservationIntent>[0],
        PROPERTIES,
        { bookingId: "LX-HTTP01", createdAt: "2026-11-22T12:00:00.000Z", fallbackBaseDate: baseDate }
      );
      return new Response(JSON.stringify(serverResult), {
        status: serverResult.ok ? 201 : serverResult.status,
        headers: { "Content-Type": "application/json" },
      });
    },
  });

  // Even if client quote.pricing.total was tampered to 0, server recalculates real total
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
