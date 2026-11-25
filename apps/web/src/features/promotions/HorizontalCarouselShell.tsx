"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLocale } from "@/features/locale/LocaleContext";
import { cn } from "@/shared/utils/cn";
import {
  computeCarouselScrollState,
  type CarouselScrollState,
} from "./promotionsHelpers";

export interface HorizontalCarouselShellProps {
  children: React.ReactNode;
  itemCount: number;
  prevTestId?: string;
  nextTestId?: string;
  className?: string;
  trackClassName?: string;
}

/** Shared horizontal snap-scroll track with floating circular navigation arrows. */
export function HorizontalCarouselShell({
  children,
  itemCount,
  prevTestId,
  nextTestId,
  className,
  trackClassName,
}: HorizontalCarouselShellProps) {
  const { locale } = useLocale();
  const trackRef = useRef<HTMLDivElement>(null);
  const [scrollState, setScrollState] = useState<CarouselScrollState>({
    canScrollLeft: false,
    canScrollRight: false,
  });

  const measureScroll = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const next = computeCarouselScrollState(el.scrollLeft, el.clientWidth, el.scrollWidth);
    setScrollState((prev) =>
      prev.canScrollLeft === next.canScrollLeft && prev.canScrollRight === next.canScrollRight
        ? prev
        : next
    );
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;

    const rafId = window.requestAnimationFrame(measureScroll);
    el.addEventListener("scroll", measureScroll, { passive: true });
    window.addEventListener("resize", measureScroll);

    const observer =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(measureScroll) : null;
    observer?.observe(el);

    return () => {
      window.cancelAnimationFrame(rafId);
      el.removeEventListener("scroll", measureScroll);
      window.removeEventListener("resize", measureScroll);
      observer?.disconnect();
    };
  }, [measureScroll, itemCount]);

  const scrollByDirection = (direction: "left" | "right") => {
    const el = trackRef.current;
    if (!el) return;
    const step = Math.max(260, Math.round(el.clientWidth * 0.68));
    el.scrollBy({
      left: direction === "left" ? -step : step,
      behavior: "smooth",
    });
  };

  return (
    <div className={cn("relative w-full min-w-0", className)}>
      {scrollState.canScrollLeft && (
        <button
          type="button"
          onClick={() => scrollByDirection("left")}
          data-testid={prevTestId}
          aria-label={locale === "en" ? "Previous items" : "Xem mục trước"}
          className="hidden sm:flex items-center justify-center w-10 h-10 bg-white border border-slate-200 shadow-md hover:shadow-lg hover:border-emerald-300 text-slate-700 hover:text-emerald-700 rounded-full absolute -left-3 top-1/2 -translate-y-1/2 z-20 transition-all cursor-pointer"
        >
          <ChevronLeft className="w-5 h-5" aria-hidden="true" />
        </button>
      )}

      <div
        ref={trackRef}
        className={cn(
          "flex gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory py-1",
          trackClassName
        )}
      >
        {children}
      </div>

      {scrollState.canScrollRight && (
        <button
          type="button"
          onClick={() => scrollByDirection("right")}
          data-testid={nextTestId}
          aria-label={locale === "en" ? "Next items" : "Xem mục tiếp theo"}
          className="hidden sm:flex items-center justify-center w-10 h-10 bg-white border border-slate-200 shadow-md hover:shadow-lg hover:border-emerald-300 text-slate-700 hover:text-emerald-700 rounded-full absolute -right-3 top-1/2 -translate-y-1/2 z-20 transition-all cursor-pointer"
        >
          <ChevronRight className="w-5 h-5" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
