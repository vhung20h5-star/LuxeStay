"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  createEmptyOverlayStack,
  deriveOverlayStackSnapshot,
  getOverlayLayerPresentation,
  registerOverlay,
  resolveEscapeDismissTarget,
  unregisterOverlay,
} from "./overlayStack";
import type {
  OverlayKind,
  OverlayLayerPresentation,
  OverlayStackState,
} from "./types";

interface OverlayContextValue {
  stack: OverlayStackState;
  register: (
    entry: {
      id: string;
      kind: OverlayKind;
      tier?: number;
      closeOnEscape?: boolean;
    },
    onClose: () => void
  ) => void;
  unregister: (id: string) => void;
}

export interface UseOverlayLayerOptions {
  id: string;
  kind: OverlayKind;
  isOpen: boolean;
  onClose: () => void;
  tier?: number;
  closeOnEscape?: boolean;
}

const OverlayContext = createContext<OverlayContextValue | undefined>(undefined);

export function OverlayProvider({ children }: { children: React.ReactNode }) {
  const [stack, setStack] = useState<OverlayStackState>(() => createEmptyOverlayStack());
  const closeHandlersRef = useRef<Map<string, () => void>>(new Map());
  const previousOverflowRef = useRef<string | null>(null);
  const isBodyLockedRef = useRef(false);

  const register = useCallback(
    (
      entry: {
        id: string;
        kind: OverlayKind;
        tier?: number;
        closeOnEscape?: boolean;
      },
      onClose: () => void
    ) => {
      const normalizedId = entry.id.trim();
      if (!normalizedId) return;
      closeHandlersRef.current.set(normalizedId, onClose);
      setStack((prev) => registerOverlay(prev, { ...entry, id: normalizedId }));
    },
    []
  );

  const unregister = useCallback((id: string) => {
    const normalizedId = id.trim();
    if (!normalizedId) return;
    closeHandlersRef.current.delete(normalizedId);
    setStack((prev) => unregisterOverlay(prev, normalizedId));
  }, []);

  const snapshot = useMemo(() => deriveOverlayStackSnapshot(stack), [stack]);
  const escapeTargetId = useMemo(() => resolveEscapeDismissTarget(stack), [stack]);

  useEffect(() => {
    if (!escapeTargetId || typeof window === "undefined") return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented || e.isComposing) return;
      const onClose = closeHandlersRef.current.get(escapeTargetId);
      if (!onClose) return;
      e.preventDefault();
      onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [escapeTargetId]);

  useEffect(() => {
    if (typeof document === "undefined") return;

    if (snapshot.shouldLockBodyScroll) {
      if (!isBodyLockedRef.current) {
        previousOverflowRef.current = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        isBodyLockedRef.current = true;
      }
    } else if (isBodyLockedRef.current) {
      document.body.style.overflow = previousOverflowRef.current ?? "";
      previousOverflowRef.current = null;
      isBodyLockedRef.current = false;
    }
  }, [snapshot.shouldLockBodyScroll]);

  useEffect(() => {
    return () => {
      if (typeof document !== "undefined" && isBodyLockedRef.current) {
        document.body.style.overflow = previousOverflowRef.current ?? "";
        previousOverflowRef.current = null;
        isBodyLockedRef.current = false;
      }
    };
  }, []);

  const value = useMemo(
    () => ({ stack, register, unregister }),
    [stack, register, unregister]
  );

  return <OverlayContext.Provider value={value}>{children}</OverlayContext.Provider>;
}

export function useOverlayLayer({
  id,
  kind,
  isOpen,
  onClose,
  tier = 0,
  closeOnEscape = true,
}: UseOverlayLayerOptions): OverlayLayerPresentation {
  const context = useContext(OverlayContext);
  if (!context) {
    throw new Error("useOverlayLayer must be used within an OverlayProvider");
  }

  const { stack, register, unregister } = context;
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    return () => {
      unregister(id);
    };
  }, [id, isOpen, unregister]);

  useEffect(() => {
    if (!isOpen) return;
    register({ id, kind, tier, closeOnEscape }, () => onCloseRef.current());
  }, [id, kind, tier, closeOnEscape, isOpen, register]);

  return useMemo(
    () => getOverlayLayerPresentation(stack, id, tier),
    [stack, id, tier]
  );
}
