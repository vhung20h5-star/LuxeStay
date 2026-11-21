"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUpDown, SlidersHorizontal, SearchX, X } from "lucide-react";
import { useBooking } from "@/context/BookingContext";
import { PropertyCard } from "./PropertyCard";
import { Button } from "@/components/ui/Button";
import type { SortOption } from "@/types";

export function PropertyList() {
  const {
    searchCriteria,
    filterState,
    catalogResult,
    setSortBy,
    removeFilterChip,
    resetFilters,
    setFilterModalOpen,
  } = useBooking();

  const { items: filteredProperties, activeChips, activeFilterCount } = catalogResult;

  return (
    <section id="properties-section" className="py-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* List Header with Count & Sort Options */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {searchCriteria.destination.trim()
                ? `Chỗ nghỉ tại ${searchCriteria.destination.trim()}`
                : "Chỗ nghỉ tuyển chọn"}
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
              value={filterState.sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              aria-label="Sắp xếp chỗ nghỉ"
              className="bg-transparent focus:outline-none cursor-pointer pr-2"
            >
              <option value="popular">Phổ biến nhất</option>
              <option value="rating-desc">Đánh giá cao nhất</option>
              <option value="price-asc">Giá: Thấp đến Cao</option>
              <option value="price-desc">Giá: Cao đến Thấp</option>
            </select>
          </div>

          <button
            type="button"
            onClick={() => setFilterModalOpen(true)}
            className="flex items-center gap-1.5 bg-slate-900 text-white px-3.5 py-2 rounded-2xl text-xs font-semibold hover:bg-slate-800 transition-colors shadow-xs"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Lọc chi tiết</span>
            {activeFilterCount > 0 && (
              <span className="min-w-4 h-4 px-1 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Removable Active Filter Chips Bar */}
      {activeChips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-6 p-3 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <span className="text-xs font-bold text-slate-500 mr-1">Đang lọc:</span>
          {activeChips.map((chip) => (
            <button
              key={chip.id}
              type="button"
              onClick={() => removeFilterChip(chip)}
              aria-label={`Gỡ bộ lọc ${chip.label}`}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/80 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 transition-colors"
            >
              <span>{chip.label}</span>
              <X className="w-3 h-3" />
            </button>
          ))}
          <button
            type="button"
            onClick={resetFilters}
            className="ml-auto text-xs font-bold text-slate-500 hover:text-slate-900 underline px-2 py-1"
          >
            Xóa tất cả
          </button>
        </div>
      )}

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
            Xóa bộ lọc &amp; Xem tất cả
          </Button>
        </div>
      )}
    </section>
  );
}
