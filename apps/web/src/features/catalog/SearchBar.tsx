"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  MapPin,
  Calendar,
  Users,
  Sparkles,
  X,
  Plus,
  Minus,
} from "lucide-react";
import { useCatalog } from "@/features/booking/BookingContext";
import {
  formatSearchDateRange,
  getQuickDatePresets,
  QUICK_SEARCH_TRENDS,
} from "@luxestay/domain";
import type { PropertyType, QuickSearchTrend } from "@luxestay/contracts";

const PROPERTY_TYPE_TABS: Array<{ id: PropertyType | "all"; label: string }> = [
  { id: "all", label: "Tất cả chỗ nghỉ" },
  { id: "homestay", label: "🏡 Homestay" },
  { id: "hotel", label: "🏨 Khách sạn" },
  { id: "villa", label: "🏖️ Villa biệt thự" },
  { id: "resort", label: "🏝️ Resort" },
  { id: "glamping", label: "🏕️ Glamping" },
];

export function SearchBar() {
  const {
    searchCriteria,
    catalogResult,
    filteredDestinations,
    setDestination,
    setDates,
    adjustGuests,
    selectPropertyTypeTab,
    applyQuickTrend,
  } = useCatalog();

  const [destinationOpen, setDestinationOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [guestsOpen, setGuestsOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const destinationInputRef = useRef<HTMLInputElement>(null);
  const quickDatePresets = useMemo(() => getQuickDatePresets(), []);

  // Close popovers on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setDestinationOpen(false);
        setDateOpen(false);
        setGuestsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const scrollToProperties = () => {
    const target = document.getElementById("properties-section");
    if (target) {
      target.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleSelectDestination = (destName: string) => {
    setDestination(destName);
    setDestinationOpen(false);
    setDateOpen(true);
  };

  const handleSearchSubmit = () => {
    setDestinationOpen(false);
    setDateOpen(false);
    setGuestsOpen(false);
    scrollToProperties();
  };

  const handleQuickTrendClick = (trend: QuickSearchTrend) => {
    applyQuickTrend(trend);
    setDestinationOpen(false);
    setDateOpen(false);
    setGuestsOpen(false);
    scrollToProperties();
  };

  const activeTab = catalogResult.activePropertyTypeTab;
  const totalGuests = searchCriteria.guests.adults + searchCriteria.guests.children;
  const isoCheckIn = /^\d{4}-\d{2}-\d{2}$/.test(searchCriteria.checkIn)
    ? searchCriteria.checkIn
    : "";
  const isoCheckOut = /^\d{4}-\d{2}-\d{2}$/.test(searchCriteria.checkOut)
    ? searchCriteria.checkOut
    : "";

  return (
    <div ref={containerRef} className="w-full max-w-4xl mx-auto relative z-30">
      {/* Property Type Tabs (2-way synced with Stay Catalog Query) */}
      <div className="flex items-center flex-wrap gap-2 mb-3 px-2">
        {PROPERTY_TYPE_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => selectPropertyTypeTab(tab.id)}
            className={`px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all relative ${activeTab === tab.id
              ? "bg-white text-emerald-900 shadow-md scale-105 ring-1 ring-emerald-200"
              : "bg-white/80 backdrop-blur-sm text-slate-700 hover:bg-white hover:text-slate-900"
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Search Container */}
      <div className="bg-white rounded-3xl p-3 sm:p-4 shadow-xl border border-slate-200/80 transition-all hover:shadow-2xl">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2 sm:gap-3 items-center">
          {/* 1. Typeable Destination Field + Suggestions Dropdown */}
          <div className="md:col-span-4 relative">
            <div
              onClick={() => {
                setDestinationOpen(true);
                setDateOpen(false);
                setGuestsOpen(false);
                destinationInputRef.current?.focus();
              }}
              className="w-full text-left p-3 rounded-2xl hover:bg-slate-50 focus-within:bg-slate-50 focus-within:border-emerald-300 transition-colors flex items-center gap-3 border border-transparent hover:border-slate-200 cursor-text"
            >
              <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl shrink-0">
                <MapPin className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <label
                  htmlFor="search-destination-input"
                  className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider cursor-text"
                >
                  Điểm đến
                </label>
                <input
                  id="search-destination-input"
                  ref={destinationInputRef}
                  type="text"
                  value={searchCriteria.destination}
                  onFocus={() => {
                    setDestinationOpen(true);
                    setDateOpen(false);
                    setGuestsOpen(false);
                  }}
                  onChange={(e) => {
                    setDestination(e.target.value);
                    setDestinationOpen(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleSearchSubmit();
                    }
                  }}
                  placeholder="Bạn muốn đi đâu? (VD: da lat)"
                  className="w-full bg-transparent text-sm font-bold text-slate-800 placeholder:text-slate-400 placeholder:font-semibold focus:outline-none truncate"
                />
              </div>
              {searchCriteria.destination && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDestination("");
                    destinationInputRef.current?.focus();
                  }}
                  aria-label="Xóa điểm đến"
                  className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200/70 rounded-full shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Destination Dropdown */}
            <AnimatePresence>
              {destinationOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.98 }}
                  className="absolute top-full left-0 mt-2 w-full max-w-[calc(100vw-2.5rem)] sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-100 p-4 z-50"
                >
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Điểm đến phổ biến
                    </span>
                    <span className="text-[11px] text-emerald-600 font-semibold">
                      {filteredDestinations.length} gợi ý
                    </span>
                  </div>
                  {filteredDestinations.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto no-scrollbar">
                      {filteredDestinations.map((dest) => (
                        <button
                          key={dest.id}
                          type="button"
                          onClick={() => handleSelectDestination(dest.name)}
                          className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-emerald-50 text-left transition-colors group"
                        >
                          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-emerald-100 group-hover:text-emerald-700 transition-colors shrink-0">
                            <MapPin className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-slate-800 group-hover:text-emerald-700 truncate">
                              {dest.name}
                            </div>
                            <div className="text-[10px] text-slate-400 truncate">
                              {dest.propertiesCount} chỗ nghỉ
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 py-3 text-center">
                      Nhấn <strong>Enter</strong> hoặc nút tìm kiếm để lọc theo{" "}
                      <span className="font-bold text-emerald-700">
                        &ldquo;{searchCriteria.destination}&rdquo;
                      </span>
                    </p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Divider */}
          <div className="hidden md:block h-8 w-px bg-slate-200" />

          {/* 2. Check-In & Check-Out Date */}
          <div className="md:col-span-4 relative">
            <button
              type="button"
              onClick={() => {
                setDateOpen(!dateOpen);
                setDestinationOpen(false);
                setGuestsOpen(false);
              }}
              className="w-full text-left p-3 rounded-2xl hover:bg-slate-50 transition-colors flex items-center gap-3 border border-transparent hover:border-slate-200"
            >
              <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
                <Calendar className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Thời gian lưu trú
                </span>
                <span className="block text-sm font-bold text-slate-800 truncate">
                  {formatSearchDateRange(searchCriteria.checkIn, searchCriteria.checkOut) ||
                    "Chọn ngày nhận & trả phòng"}
                </span>
              </div>
            </button>

            {/* Date Picker Popover */}
            <AnimatePresence>
              {dateOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.98 }}
                  className="absolute top-full left-0 sm:left-auto sm:right-0 md:left-0 mt-2 w-full max-w-[calc(100vw-2.5rem)] sm:w-88 bg-white rounded-2xl shadow-2xl border border-slate-100 p-4 z-50"
                >
                  <span className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                    Chọn lịch trình nhanh
                  </span>
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {quickDatePresets.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          setDates({ checkIn: preset.checkIn, checkOut: preset.checkOut });
                          setDateOpen(false);
                          setGuestsOpen(true);
                        }}
                        className="p-2.5 text-left border border-slate-200 rounded-xl hover:border-emerald-500 hover:bg-emerald-50/50 transition-all text-xs"
                      >
                        <span className="font-semibold text-slate-800 block truncate">
                          {preset.label}
                        </span>
                        <span className="text-[11px] text-emerald-600 block mt-0.5 font-medium">
                          {preset.displayRange}
                        </span>
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                    <input
                      type="date"
                      value={isoCheckIn}
                      aria-label="Ngày nhận phòng"
                      className="text-xs p-2 border border-slate-200 rounded-xl flex-1 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      onChange={(e) => setDates({ checkIn: e.target.value })}
                    />
                    <span className="text-slate-400 text-xs">đến</span>
                    <input
                      type="date"
                      value={isoCheckOut}
                      min={isoCheckIn || undefined}
                      aria-label="Ngày trả phòng"
                      className="text-xs p-2 border border-slate-200 rounded-xl flex-1 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      onChange={(e) => setDates({ checkOut: e.target.value })}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Divider */}
          <div className="hidden md:block h-8 w-px bg-slate-200" />

          {/* 3. Guests & Rooms */}
          <div className="md:col-span-3 relative">
            <button
              type="button"
              onClick={() => {
                setGuestsOpen(!guestsOpen);
                setDestinationOpen(false);
                setDateOpen(false);
              }}
              className="w-full text-left p-3 rounded-2xl hover:bg-slate-50 transition-colors flex items-center gap-3 border border-transparent hover:border-slate-200"
            >
              <div className="p-2.5 bg-teal-50 text-teal-600 rounded-xl">
                <Users className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Số khách &amp; Phòng
                </span>
                <span className="block text-sm font-bold text-slate-800 truncate">
                  {totalGuests} khách • {searchCriteria.guests.rooms} phòng
                </span>
              </div>
            </button>

            {/* Guests Popover */}
            <AnimatePresence>
              {guestsOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.98 }}
                  className="absolute top-full right-0 mt-2 w-full max-w-[calc(100vw-2.5rem)] sm:w-72 bg-white rounded-2xl shadow-2xl border border-slate-100 p-4 z-50 space-y-4"
                >
                  {/* Adults */}
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-bold text-slate-800">Người lớn</div>
                      <div className="text-[11px] text-slate-400">Từ 13 tuổi trở lên</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => adjustGuests("adults", -1)}
                        aria-label="Giảm số người lớn"
                        className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center hover:bg-slate-100 text-slate-600"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-5 text-center text-sm font-bold text-slate-800">
                        {searchCriteria.guests.adults}
                      </span>
                      <button
                        type="button"
                        onClick={() => adjustGuests("adults", 1)}
                        aria-label="Tăng số người lớn"
                        className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center hover:bg-slate-100 text-slate-600"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Children */}
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-bold text-slate-800">Trẻ em</div>
                      <div className="text-[11px] text-slate-400">Từ 2 đến 12 tuổi</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => adjustGuests("children", -1)}
                        aria-label="Giảm số trẻ em"
                        className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center hover:bg-slate-100 text-slate-600"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-5 text-center text-sm font-bold text-slate-800">
                        {searchCriteria.guests.children}
                      </span>
                      <button
                        type="button"
                        onClick={() => adjustGuests("children", 1)}
                        aria-label="Tăng số trẻ em"
                        className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center hover:bg-slate-100 text-slate-600"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Rooms */}
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-bold text-slate-800">Số lượng phòng</div>
                      <div className="text-[11px] text-slate-400">Phòng cần đặt</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => adjustGuests("rooms", -1)}
                        aria-label="Giảm số phòng"
                        className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center hover:bg-slate-100 text-slate-600"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-5 text-center text-sm font-bold text-slate-800">
                        {searchCriteria.guests.rooms}
                      </span>
                      <button
                        type="button"
                        onClick={() => adjustGuests("rooms", 1)}
                        aria-label="Tăng số phòng"
                        className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center hover:bg-slate-100 text-slate-600"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* 4. Action Button */}
          <div className="md:col-span-1 flex justify-center">
            <button
              type="button"
              onClick={handleSearchSubmit}
              className="w-full md:w-14 h-12 md:h-14 bg-gradient-to-tr from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-600/30 hover:scale-105 active:scale-95 transition-all group font-bold"
              aria-label="Tìm kiếm"
            >
              <Search className="w-6 h-6 group-hover:rotate-12 transition-transform" />
              <span className="md:hidden ml-2 text-sm">Tìm kiếm ngay</span>
            </button>
          </div>
        </div>
      </div>

      {/* Structured Quick Search Trends */}
      <div className="flex items-center flex-wrap gap-2 mt-3 px-2 text-xs">
        <span className="text-slate-400 font-medium flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Xu hướng tìm:
        </span>
        {QUICK_SEARCH_TRENDS.map((trend) => (
          <button
            key={trend.id}
            type="button"
            onClick={() => handleQuickTrendClick(trend)}
            className="px-3 py-1 bg-white/70 hover:bg-white text-slate-700 hover:text-emerald-700 rounded-full border border-slate-200/60 shadow-xs transition-colors backdrop-blur-xs"
          >
            {trend.label}
          </button>
        ))}
      </div>
    </div>
  );
}
