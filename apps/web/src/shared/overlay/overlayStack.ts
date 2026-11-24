import type {
  OverlayEntry,
  OverlayKind,
  OverlayLayerPresentation,
  OverlayStackSnapshot,
  OverlayStackState,
} from "./types";

export const OVERLAY_BASE_Z_INDEX = 50;
export const OVERLAY_Z_STEP = 10;
export const OVERLAY_TIER_Z_STRIDE = 100;

const EMPTY_STACK: OverlayStackState = Object.freeze({
  entries: Object.freeze([] as OverlayEntry[]),
});

function normalizeOverlayId(id: string): string {
  return id.trim();
}

function sanitizeTier(tier: number | undefined): number {
  return typeof tier === "number" && Number.isFinite(tier) && tier > 0
    ? Math.floor(tier)
    : 0;
}

function computeLayerZIndex(tier: number, depthWithinTier: number): number {
  return OVERLAY_BASE_Z_INDEX + tier * OVERLAY_TIER_Z_STRIDE + depthWithinTier * OVERLAY_Z_STEP;
}

function insertByTier(entries: readonly OverlayEntry[], nextEntry: OverlayEntry): OverlayStackState {
  const nextEntries = [...entries];
  const insertAt = nextEntries.findIndex((item) => item.tier > nextEntry.tier);
  if (insertAt === -1) {
    nextEntries.push(nextEntry);
  } else {
    nextEntries.splice(insertAt, 0, nextEntry);
  }
  return Object.freeze({
    entries: Object.freeze(nextEntries),
  });
}

export function createEmptyOverlayStack(): OverlayStackState {
  return EMPTY_STACK;
}

export function registerOverlay(
  state: OverlayStackState,
  input: {
    id: string;
    kind: OverlayKind;
    tier?: number;
    closeOnEscape?: boolean;
  }
): OverlayStackState {
  const id = normalizeOverlayId(input.id);
  if (!id) return state;

  const tier = sanitizeTier(input.tier);
  const closeOnEscape = input.closeOnEscape ?? true;
  const nextEntry: OverlayEntry = Object.freeze({
    id,
    kind: input.kind,
    tier,
    closeOnEscape,
  });

  const existingIndex = state.entries.findIndex((entry) => entry.id === id);
  if (existingIndex === -1) {
    return insertByTier(state.entries, nextEntry);
  }

  const existing = state.entries[existingIndex];
  if (existing.tier === tier) {
    if (existing.kind === nextEntry.kind && existing.closeOnEscape === nextEntry.closeOnEscape) {
      return state;
    }
    const updated = [...state.entries];
    updated[existingIndex] = nextEntry;
    return Object.freeze({
      entries: Object.freeze(updated),
    });
  }

  const withoutExisting = state.entries.filter((entry) => entry.id !== id);
  return insertByTier(withoutExisting, nextEntry);
}

export function unregisterOverlay(state: OverlayStackState, id: string): OverlayStackState {
  const normalizedId = normalizeOverlayId(id);
  if (!normalizedId) return state;

  const existingIndex = state.entries.findIndex((entry) => entry.id === normalizedId);
  if (existingIndex === -1) return state;

  const nextEntries = state.entries.filter((entry) => entry.id !== normalizedId);
  if (nextEntries.length === 0) {
    return EMPTY_STACK;
  }
  return Object.freeze({
    entries: Object.freeze(nextEntries),
  });
}

export function resolveEscapeDismissTarget(state: OverlayStackState): string | null {
  if (state.entries.length === 0) return null;
  const topmost = state.entries[state.entries.length - 1];
  return topmost.closeOnEscape ? topmost.id : null;
}

export function deriveOverlayStackSnapshot(state: OverlayStackState): OverlayStackSnapshot {
  const count = state.entries.length;
  const topmostId = count > 0 ? state.entries[count - 1].id : null;
  return {
    entries: state.entries,
    topmostId,
    shouldLockBodyScroll: count > 0,
    count,
  };
}

export function getOverlayLayerPresentation(
  state: OverlayStackState,
  id: string,
  fallbackTier = 0
): OverlayLayerPresentation {
  const normalizedId = normalizeOverlayId(id);
  const depth = normalizedId
    ? state.entries.findIndex((entry) => entry.id === normalizedId)
    : -1;

  if (depth === -1) {
    const safeFallbackTier = sanitizeTier(fallbackTier);
    const sameTierCount = state.entries.filter((entry) => entry.tier === safeFallbackTier).length;
    return {
      isRegistered: false,
      isTopmost: false,
      depth: -1,
      zIndex: computeLayerZIndex(safeFallbackTier, sameTierCount),
    };
  }

  const target = state.entries[depth];
  let depthWithinTier = 0;
  for (let i = 0; i < depth; i += 1) {
    if (state.entries[i].tier === target.tier) {
      depthWithinTier += 1;
    }
  }

  return {
    isRegistered: true,
    isTopmost: depth === state.entries.length - 1,
    depth,
    zIndex: computeLayerZIndex(target.tier, depthWithinTier),
  };
}
