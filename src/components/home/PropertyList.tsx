"use client";

import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUpDown, SlidersHorizontal, SearchX } from "lucide-react";
import { PROPERTIES } from "@/data/properties";
import { useBooking } from "@/context/BookingContext";
import { PropertyCard } from "./PropertyCard";
import { Button } from "@/components/ui/Button";

export function PropertyList() {
  const {
    activeCategory,
    searchCriteria,
    filterState,
    resetFilters,
    setFilterModalOpen,
  } = useBooking();

  const [sortBy, setSortBy] = useState<"popular" | "price-asc" | "price-desc" | "rating-desc">(
    "popular"
  );

  // Filter & sort logic
  const filteredProperties = useMemo(() => {
    return PROPERTIES.filter((prop) => {
      // 1. Category
      if (activeCategory !== "all" && prop.category !== activeCategory) {
        return false;
      }

      // 2. Destination
      if (searchCriteria.destination) {
        const destQuery = searchCriteria.destination.toLowerCase().trim();
        const cityMatch = prop.location.city.toLowerCase().includes(destQuery);
        const provMatch = prop.location.province.toLowerCase().includes(destQuery);
        const titleMatch = prop.title.toLowerCase().includes(destQuery);
        if (!cityMatch && !provMatch && !titleMatch) return false;
      }

      // 3. Guests capacity
      const totalGuests = searchCriteria.guests.adults + searchCriteria.guests.children;
      if (prop.maxGuests < totalGuests) return false;

      // 4. Property type
      if (
        filterState.propertyTypes.length > 0 &&
        !filterState.propertyTypes.includes(prop.propertyType)
      ) {
        return false;
      }

      // 5. Price range
      if (prop.pricePerNight > filterState.maxPrice) return false;

      // 6. Rating
      if (filterState.minRating > 0 && prop.rating < filterState.minRating) return false;

      // 7. Free cancellation
      if (filterState.freeCancellationOnly && !prop.freeCancellation) return false;

      // 8. Amenities
      if (
        filterState.amenities.length > 0 &&
        !filterState.amenities.every((a) => prop.amenities.includes(a))
      ) {
        return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === "price-asc") return a.pricePerNight - b.pricePerNight;
      if (sortBy === "price-desc") return b.pricePerNight - a.pricePerNight;
      if (sortBy === "rating-desc") return b.rating - a.rating;
      // Default: popular
      return (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0) || b.rating - a.rating;
    });
  }, [activeCategory, searchCriteria, filterState, sortBy]);

  return (
    <section id="properties-section" className="py-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* List Header with Count & Sort Options */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {searchCriteria.destination ? `Chỗ nghỉ tại ${searchCriteria.destination}` : "Chỗ nghỉ tuyển chọn"}
            </h2>
            <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
              {filteredProperties.length} kết quả
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Không gian nghỉ dưỡng tuyệt đẹp được kiểm định chất lượng nghiêm ngặt
          </p>
        </div>

        {/* Sort & Quick Filters */}
        <div className="flex items-center gap-2.5 self-end sm:self-auto">
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-2xl px-3 py-2 text-xs font-semibold text-slate-700 shadow-xs">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) =>
                setSortBy(
                  e.target.value as "popular" | "price-asc" | "price-desc" | "rating-desc"
                )
              }
              className="bg-transparent focus:outline-none cursor-pointer pr-2"
            >
              <option value="popular">Phổ biến nhất</option>
              <option value="rating-desc">Đánh giá cao nhất</option>
              <option value="price-asc">Giá: Thấp đến Cao</option>
              <option value="price-desc">Giá: Cao đến Thấp</option>
            </select>
          </div>

          <button
            onClick={() => setFilterModalOpen(true)}
            className="flex items-center gap-1.5 bg-slate-900 text-white px-3.5 py-2 rounded-2xl text-xs font-semibold hover:bg-slate-800 transition-colors shadow-xs"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Lọc chi tiết</span>
          </button>
        </div>
      </div>

      {/* Grid of Property Cards */}
      {filteredProperties.length > 0 ? (
        <motion.div
          layout
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
        >
          <AnimatePresence>
            {filteredProperties.map((prop) => (
              <PropertyCard key={prop.id} property={prop} />
            ))}
          </AnimatePresence>
        </motion.div>
      ) : (
        /* Empty State */
        <div className="text-center py-16 px-4 bg-white rounded-3xl border border-dashed border-slate-300 max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-4">
            <SearchX className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">Không tìm thấy chỗ nghỉ phù hợp</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto mb-6">
            Rất tiếc, không có khách sạn hoặc homestay nào khớp với tất cả bộ lọc bạn đã chọn. Hãy thử điều chỉnh hoặc xóa bớt tiêu chí lọc.
          </p>
          <Button variant="primary" onClick={resetFilters}>
            Xóa bộ lọc & Xem tất cả
          </Button>
        </div>
      )}
    </section>
  );
}
