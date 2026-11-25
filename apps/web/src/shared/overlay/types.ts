export type OverlayKind =
  | "dialog"
  | "favorites-drawer"
  | "filter-modal"
  | "auth-modal"
  | "property-modal"
  | "property-amenities-modal"
  | "checkout-modal"
  | "booking-success-modal"
  | "activity-lightbox";

export interface OverlayEntry {
  id: string;
  kind: OverlayKind;
  tier: number;
  closeOnEscape: boolean;
}

export interface OverlayStackState {
  entries: readonly OverlayEntry[];
}

export interface OverlayLayerPresentation {
  isRegistered: boolean;
  isTopmost: boolean;
  depth: number;
  zIndex: number;
}

export interface OverlayStackSnapshot {
  entries: readonly OverlayEntry[];
  topmostId: string | null;
  shouldLockBodyScroll: boolean;
  count: number;
}
