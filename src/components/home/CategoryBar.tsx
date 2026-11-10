"use client";

import React, { useRef } from "react";
import { motion } from "framer-motion";
import {
  Compass,
  Mountain,
  Waves,
  Home,
  Flame,
  Tent,
  Trees,
  Building2,
  Sparkles,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useBooking } from "@/context/BookingContext";
import { CATEGORIES } from "@/data/categories";

const iconMap: Record<string, React.ReactNode> = {
  Compass: <Compass className="w-5 h-5" />,
  Mountain: <Mountain className="w-5 h-5" />,
  Waves: <Waves className="w-5 h-5" />,
  Home: <Home className="w-5 h-5" />,
  Flame: <Flame className="w-5 h-5" />,
  Tent: <Tent className="w-5 h-5" />,
  Trees: <Trees className="w-5 h-5" />,
  Building2: <Building2 className="w-5 h-5" />,
  Sparkles: <Sparkles className="w-5 h-5" />,
};

export function CategoryBar() {
  const {
    activeCategory,
    setActiveCategory,
    setFilterModalOpen,
    filterState,
  } = useBooking();

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const offset = direction === "left" ? -300 : 300;
      scrollContainerRef.current.scrollBy({ left: offset, behavior: "smooth" });
    }
  };

  // Count active filters (excluding default category)
  let activeFilterCount = 0;
  if (filterState.propertyTypes.length > 0) activeFilterCount += filterState.propertyTypes.length;
  if (filterState.minRating > 0) activeFilterCount += 1;
  if (filterState.amenities.length > 0) activeFilterCount += filterState.amenities.length;
  if (filterState.freeCancellationOnly) activeFilterCount += 1;
  if (filterState.minPrice > 0 || filterState.maxPrice < 10000000) activeFilterCount += 1;

  return (
    <div className="w-full bg-white border-y border-slate-200/80 sticky top-[73px] z-30 shadow-xs py-3">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          {/* Left scroll arrow (desktop) */}
          <button
            onClick={() => scroll("left")}
            className="hidden lg:flex p-1.5 rounded-full border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-500 shadow-xs transition-colors shrink-0"
            aria-label="Cuộn trái"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Categories Horizontal Scroll */}
          <div
            ref={scrollContainerRef}
            className="flex-1 flex items-center gap-3 sm:gap-4 overflow-x-auto no-scrollbar py-1"
          >
            {CATEGORIES.map((cat) => {
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`relative flex flex-col items-center gap-1.5 px-3 py-2 rounded-2xl whitespace-nowrap transition-all duration-200 shrink-0 group ${
                    isActive
                      ? "text-emerald-700 font-bold"
                      : "text-slate-500 hover:text-slate-900 font-medium"
                  }`}
                >
                  <div
                    className={`p-2 rounded-xl transition-all ${
                      isActive
                        ? "bg-emerald-100/70 text-emerald-700 scale-110 shadow-xs"
                        : "text-slate-400 group-hover:text-slate-700 group-hover:bg-slate-100"
                    }`}
                  >
                    {iconMap[cat.iconName] || <Compass className="w-5 h-5" />}
                  </div>
                  <span className="text-xs">{cat.label}</span>

                  {isActive && (
                    <motion.div
                      layoutId="activeCategoryPill"
                      className="absolute bottom-0 left-2 right-2 h-0.5 bg-emerald-600 rounded-full"
                      transition={{ type: "spring", stiffness: 500, damping: 35 }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Right scroll arrow (desktop) */}
          <button
            onClick={() => scroll("right")}
            className="hidden lg:flex p-1.5 rounded-full border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-500 shadow-xs transition-colors shrink-0"
            aria-label="Cuộn phải"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Filter Modal Trigger Button */}
          <div className="pl-2 border-l border-slate-200 shrink-0">
            <button
              onClick={() => setFilterModalOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs shadow-xs transition-all relative"
            >
              <SlidersHorizontal className="w-4 h-4 text-emerald-600" />
              <span className="hidden sm:inline">Bộ lọc</span>
              {activeFilterCount > 0 && (
                <span className="min-w-4 h-4 px-1 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
