"use client";

import React, { useSyncExternalStore } from "react";
import { useLocale } from "@/features/locale/LocaleContext";
import { cn } from "@/shared/utils/cn";
import { computeCountdownParts, formatCountdownUnit } from "./promotionsHelpers";

const clockListeners = new Set<() => void>();
let clockInterval: ReturnType<typeof setInterval> | null = null;
let currentNowMs = 0;

function readAlignedNowMs(): number {
  return Math.floor(Date.now() / 1000) * 1000;
}

function notifyClockListeners(): void {
  currentNowMs = readAlignedNowMs();
  for (const listener of [...clockListeners]) {
    listener();
  }
}

function subscribeClock(listener: () => void): () => void {
  clockListeners.add(listener);
  if (currentNowMs === 0) {
    currentNowMs = readAlignedNowMs();
  }
  if (clockInterval === null && typeof window !== "undefined") {
    clockInterval = setInterval(notifyClockListeners, 1000);
  }
  return () => {
    clockListeners.delete(listener);
    if (clockListeners.size === 0) {
      if (clockInterval !== null) {
        clearInterval(clockInterval);
        clockInterval = null;
      }
      currentNowMs = 0;
    }
  };
}

function getClientClockSnapshot(): number | null {
  if (typeof window === "undefined") return null;
  if (currentNowMs === 0) {
    currentNowMs = readAlignedNowMs();
  }
  return currentNowMs;
}

function getServerClockSnapshot(): number | null {
  return null;
}

export interface CampaignCountdownProps {
  endsAt: string;
  compact?: boolean;
  className?: string;
}

/** Hydration-safe client countdown timer ticking every second until campaign expiration. */
export function CampaignCountdown({
  endsAt,
  compact = false,
  className,
}: CampaignCountdownProps) {
  const { t } = useLocale();
  const nowMs = useSyncExternalStore(
    subscribeClock,
    getClientClockSnapshot,
    getServerClockSnapshot
  );

  const parts = computeCountdownParts(endsAt, nowMs);
  const showDays = parts.mounted && !parts.isExpired && (parts.days ?? 0) > 0;

  const segments: Array<{ key: string; value: string; label: string }> = [
    ...(showDays
      ? [{ key: "days", value: formatCountdownUnit(parts.days), label: t("deals.days") }]
      : []),
    { key: "hours", value: formatCountdownUnit(parts.hours), label: t("deals.hours") },
    { key: "minutes", value: formatCountdownUnit(parts.minutes), label: t("deals.minutes") },
    { key: "seconds", value: formatCountdownUnit(parts.seconds), label: t("deals.seconds") },
  ];

  return (
    <div
      data-testid="campaign-countdown"
      aria-live="off"
      className={cn("inline-flex items-center gap-1.5 sm:gap-2 font-mono font-bold", className)}
    >
      {segments.map((segment, index) => (
        <React.Fragment key={segment.key}>
          {index > 0 && (
            <span className="text-amber-300 font-black select-none" aria-hidden="true">
              :
            </span>
          )}
          <div
            className={cn(
              "bg-white/15 backdrop-blur-md border border-white/20 text-center tabular-nums",
              compact
                ? "min-w-10 px-2 py-1 rounded-lg"
                : "min-w-12 sm:min-w-13 px-2.5 sm:px-3 py-1.5 rounded-xl"
            )}
          >
            <span
              className={cn(
                "block leading-none text-white",
                compact ? "text-sm" : "text-base sm:text-lg"
              )}
            >
              {segment.value}
            </span>
            <span
              className={cn(
                "block font-sans font-semibold uppercase tracking-wide text-slate-200/85 mt-1",
                compact ? "text-[8px]" : "text-[9px]"
              )}
            >
              {segment.label}
            </span>
          </div>
        </React.Fragment>
      ))}
    </div>
  );
}
