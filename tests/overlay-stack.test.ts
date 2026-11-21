import test from "node:test";
import assert from "node:assert/strict";
import {
  OVERLAY_BASE_Z_INDEX,
  OVERLAY_Z_STEP,
  OVERLAY_TIER_Z_STRIDE,
  createEmptyOverlayStack,
  registerOverlay,
  unregisterOverlay,
  resolveEscapeDismissTarget,
  deriveOverlayStackSnapshot,
  getOverlayLayerPresentation,
} from "@/lib/overlayStack";

test("empty overlay stack unlocks body scroll and returns null escape target", () => {
  const empty = createEmptyOverlayStack();
  const snapshot = deriveOverlayStackSnapshot(empty);

  assert.equal(snapshot.count, 0);
  assert.equal(snapshot.topmostId, null);
  assert.equal(snapshot.shouldLockBodyScroll, false);
  assert.equal(resolveEscapeDismissTarget(empty), null);
  assert.equal(Object.isFrozen(empty), true);
  assert.equal(Object.isFrozen(empty.entries), true);
});

test("registerOverlay and unregisterOverlay maintain LIFO stack order, deterministic z-index, and ref-counted body scroll lock", () => {
  let stack = createEmptyOverlayStack();
  stack = registerOverlay(stack, { id: "filter-modal", kind: "filter-modal" });
  stack = registerOverlay(stack, { id: "favorites-drawer", kind: "favorites-drawer" });

  let snapshot = deriveOverlayStackSnapshot(stack);
  assert.equal(snapshot.count, 2);
  assert.equal(snapshot.topmostId, "favorites-drawer");
  assert.equal(snapshot.shouldLockBodyScroll, true);

  const filterLayer = getOverlayLayerPresentation(stack, "filter-modal");
  const favLayer = getOverlayLayerPresentation(stack, "favorites-drawer");
  assert.deepEqual(filterLayer, {
    isRegistered: true,
    isTopmost: false,
    depth: 0,
    zIndex: OVERLAY_BASE_Z_INDEX,
  });
  assert.deepEqual(favLayer, {
    isRegistered: true,
    isTopmost: true,
    depth: 1,
    zIndex: OVERLAY_BASE_Z_INDEX + OVERLAY_Z_STEP,
  });

  // Escape targets only topmost overlay
  assert.equal(resolveEscapeDismissTarget(stack), "favorites-drawer");

  // Unregistering topmost keeps body scroll locked while lower overlay remains
  stack = unregisterOverlay(stack, "favorites-drawer");
  snapshot = deriveOverlayStackSnapshot(stack);
  assert.equal(snapshot.count, 1);
  assert.equal(snapshot.topmostId, "filter-modal");
  assert.equal(snapshot.shouldLockBodyScroll, true);
  assert.equal(resolveEscapeDismissTarget(stack), "filter-modal");

  // Unregistering unknown id is a no-op returning same state reference
  assert.equal(unregisterOverlay(stack, "missing-id"), stack);

  // Unregistering last overlay unlocks body scroll
  stack = unregisterOverlay(stack, "filter-modal");
  snapshot = deriveOverlayStackSnapshot(stack);
  assert.equal(snapshot.count, 0);
  assert.equal(snapshot.shouldLockBodyScroll, false);
  assert.equal(resolveEscapeDismissTarget(stack), null);
});

test("tier precedence keeps nested overlays above base overlays with isolated z-index bands even when child registers before parent", () => {
  let stack = createEmptyOverlayStack();
  // Child effect runs first with tier 1
  stack = registerOverlay(stack, {
    id: "property-amenities-modal",
    kind: "property-amenities-modal",
    tier: 1,
  });
  // Multiple tier-0 overlays register afterwards
  stack = registerOverlay(stack, {
    id: "property-modal",
    kind: "property-modal",
    tier: 0,
  });
  stack = registerOverlay(stack, {
    id: "filter-modal",
    kind: "filter-modal",
    tier: 0,
  });

  assert.deepEqual(
    stack.entries.map((entry) => entry.id),
    ["property-modal", "filter-modal", "property-amenities-modal"]
  );
  assert.equal(
    getOverlayLayerPresentation(stack, "property-modal").zIndex,
    OVERLAY_BASE_Z_INDEX
  );
  assert.equal(
    getOverlayLayerPresentation(stack, "filter-modal").zIndex,
    OVERLAY_BASE_Z_INDEX + OVERLAY_Z_STEP
  );
  assert.equal(
    getOverlayLayerPresentation(stack, "property-amenities-modal").zIndex,
    OVERLAY_BASE_Z_INDEX + OVERLAY_TIER_Z_STRIDE
  );
  assert.equal(resolveEscapeDismissTarget(stack), "property-amenities-modal");

  // Negative, fractional, NaN, and Infinity tiers sanitize safely to non-negative integers
  assert.equal(
    registerOverlay(createEmptyOverlayStack(), {
      id: "neg-tier",
      kind: "dialog",
      tier: -3.7,
    }).entries[0].tier,
    0
  );
  assert.equal(
    registerOverlay(createEmptyOverlayStack(), {
      id: "frac-tier",
      kind: "dialog",
      tier: 1.9,
    }).entries[0].tier,
    1
  );
  assert.equal(
    registerOverlay(createEmptyOverlayStack(), {
      id: "nan-tier",
      kind: "dialog",
      tier: Number.NaN,
    }).entries[0].tier,
    0
  );
  assert.equal(
    registerOverlay(createEmptyOverlayStack(), {
      id: "inf-tier",
      kind: "dialog",
      tier: Number.POSITIVE_INFINITY,
    }).entries[0].tier,
    0
  );
});

test("re-registering an existing overlay updates metadata in place without jumping above higher layers", () => {
  let stack = createEmptyOverlayStack();
  stack = registerOverlay(stack, { id: "property-modal", kind: "property-modal", tier: 0 });
  stack = registerOverlay(stack, {
    id: "property-amenities-modal",
    kind: "property-amenities-modal",
    tier: 1,
  });

  // Identical re-register returns same reference
  const same = registerOverlay(stack, { id: "property-modal", kind: "property-modal", tier: 0 });
  assert.equal(same, stack);

  // Updating closeOnEscape in place preserves position beneath child
  const updated = registerOverlay(stack, {
    id: "property-modal",
    kind: "property-modal",
    tier: 0,
    closeOnEscape: false,
  });
  assert.deepEqual(
    updated.entries.map((e) => e.id),
    ["property-modal", "property-amenities-modal"]
  );
  assert.equal(updated.entries[0].closeOnEscape, false);

  // Changing tier repositions entry into its new tier group
  const promoted = registerOverlay(updated, {
    id: "property-modal",
    kind: "property-modal",
    tier: 2,
    closeOnEscape: true,
  });
  assert.deepEqual(
    promoted.entries.map((e) => e.id),
    ["property-amenities-modal", "property-modal"]
  );
});

test("resolveEscapeDismissTarget blocks Escape from leaking to lower overlays when topmost has closeOnEscape: false", () => {
  let stack = createEmptyOverlayStack();
  stack = registerOverlay(stack, {
    id: "property-modal",
    kind: "property-modal",
    closeOnEscape: true,
  });
  stack = registerOverlay(stack, {
    id: "checkout-modal",
    kind: "checkout-modal",
    closeOnEscape: false,
  });

  assert.equal(resolveEscapeDismissTarget(stack), null);
});

test("getOverlayLayerPresentation preserves non-colliding zIndex before mount and during same-tier or nested exit fade-out", () => {
  let stack = createEmptyOverlayStack();
  stack = registerOverlay(stack, { id: "property-modal", kind: "property-modal", tier: 0 });
  stack = registerOverlay(stack, { id: "favorites-drawer", kind: "favorites-drawer", tier: 0 });

  // Unregistered tier-0 overlay (mounting or exiting above 2 open tier-0 overlays) sits above both (70 > 60 > 50)
  const exitingSameTier = getOverlayLayerPresentation(stack, "filter-modal", 0);
  assert.deepEqual(exitingSameTier, {
    isRegistered: false,
    isTopmost: false,
    depth: -1,
    zIndex: OVERLAY_BASE_Z_INDEX + 2 * OVERLAY_Z_STEP,
  });

  // Unregistered tier-1 overlay (mounting or exiting over 2+ tier-0 overlays) stays cleanly in tier-1 band (150)
  const exitingNested = getOverlayLayerPresentation(stack, "property-amenities-modal", 1);
  assert.deepEqual(exitingNested, {
    isRegistered: false,
    isTopmost: false,
    depth: -1,
    zIndex: OVERLAY_BASE_Z_INDEX + OVERLAY_TIER_Z_STRIDE,
  });

  // Single overlay exiting alone returns base z-index (50)
  const exitingAlone = getOverlayLayerPresentation(createEmptyOverlayStack(), "filter-modal", 0);
  assert.equal(exitingAlone.zIndex, OVERLAY_BASE_Z_INDEX);
});

test("registerOverlay, unregisterOverlay, and getOverlayLayerPresentation normalize padded and whitespace-only IDs consistently", () => {
  const empty = createEmptyOverlayStack();

  // Whitespace-only IDs are ignored safely
  assert.equal(registerOverlay(empty, { id: "   ", kind: "dialog" }), empty);
  assert.equal(unregisterOverlay(empty, "   "), empty);

  const registered = registerOverlay(empty, { id: " modal-a ", kind: "dialog" });
  assert.equal(registered.entries.length, 1);
  assert.equal(registered.entries[0].id, "modal-a");

  // Lookup with padded ID resolves the registered layer
  const presentation = getOverlayLayerPresentation(registered, " modal-a ");
  assert.equal(presentation.isRegistered, true);
  assert.equal(presentation.isTopmost, true);
  assert.equal(presentation.depth, 0);

  // Unregistering with padded ID removes the layer and unlocks body scroll
  const cleaned = unregisterOverlay(registered, " modal-a ");
  assert.equal(deriveOverlayStackSnapshot(cleaned).count, 0);
  assert.equal(deriveOverlayStackSnapshot(cleaned).shouldLockBodyScroll, false);
});
