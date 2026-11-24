"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { writeTextToClipboard } from "./promotionsHelpers";

/** Manages temporary copied voucher feedback state with safe timer cleanup. */
export function useCopiedVoucherCode(resetDelayMs = 2500) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const handleCopy = useCallback(
    (code: string) => {
      writeTextToClipboard(code);
      setCopiedCode(code);
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(() => {
        setCopiedCode((current) => (current === code ? null : current));
      }, resetDelayMs);
    },
    [resetDelayMs]
  );

  return { copiedCode, handleCopy };
}
