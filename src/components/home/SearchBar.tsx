"use client";

import React, { useState, useRef, useEffect } from "react";
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
import { useBooking } from "@/context/BookingContext";
import { DESTINATIONS } from "@/data/destinations";
import { PropertyType } from "@/types";

export function SearchBar() {
  const { searchCriteria, setSearchCriteria, setFilterState } = useBooking();

  const [activeTab, setActiveTab] = useState<string>("all");
  const [destinationOpen, setDestinationOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [guestsOpen, setGuestsOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

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

  const handleSelectDestination = (destName: string) => {
    setSearchCriteria((prev) => ({ ...prev, destination: destName }));
    setDestinationOpen(false);
    setDateOpen(true);
  };

  const handleGuestCountChange = (type: "adults" | "children" | "rooms", delta: number) => {
    setSearchCriteria((prev) => {
      const current = prev.guests[type];
      const min = type === "adults" || type === "rooms" ? 1 : 0;
      const next = Math.max(min, current + delta);
      return {
        ...prev,
        guests: {
          ...prev.guests,
          [type]: next,
        },
      };
    });
  };

  const handleSearchSubmit = () => {
    setDestinationOpen(false);
    setDateOpen(false);
    setGuestsOpen(false);

    // Apply tab to filter if specific type
    if (activeTab !== "all") {
      setFilterState((prev) => ({
        ...prev,
        propertyTypes: [activeTab as PropertyType],
      }));
    } else {
      setFilterState((prev) => ({
        ...prev,
        propertyTypes: [],
      }));
    }

    const target = document.getElementById("properties-section");
    if (target) {
      target.scrollIntoView({ behavior: "smooth" });
    }
  };

  const totalGuests = searchCriteria.guests.adults + searchCriteria.guests.children;

  return (
    <div ref={containerRef} className="w-full max-w-4xl mx-auto relative z-30">
      {/* Property Type Tabs */}
      <div className="flex items-center gap-2 mb-3 px-2">
        {[
          { id: "all", label: "Tất cả chỗ nghỉ" },
          { id: "homestay", label: "🏡 Homestay" },
          { id: "hotel", label: "🏨 Khách sạn" },
          { id: "villa", label: "🏖️ Villa biệt thự" },
          { id: "glamping", label: "🏕️ Glamping" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all relative ${
              activeTab === tab.id
                ? "bg-white text-emerald-900 shadow-md scale-105"
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
          {/* 1. Destination Field */}
          <div className="md:col-span-4 relative">
            <button
              type="button"
              onClick={() => {
                setDestinationOpen(!destinationOpen);
                setDateOpen(false);
                setGuestsOpen(false);
              }}
              className="w-full text-left p-3 rounded-2xl hover:bg-slate-50 transition-colors flex items-center gap-3 border border-transparent hover:border-slate-200"
            >
              <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                <MapPin className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Điểm đến
                </span>
                <span className="block text-sm font-bold text-slate-800 truncate">
                  {searchCriteria.destination || "Bạn muốn đi đâu?"}
                </span>
              </div>
              {searchCriteria.destination && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSearchCriteria((prev) => ({ ...prev, destination: "" }));
                  }}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-full"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </button>

            {/* Destination Dropdown */}
            <AnimatePresence>
              {destinationOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.98 }}
                  className="absolute top-full left-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-100 p-4 z-50"
                >
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Điểm đến phổ biến
                    </span>
                    <span className="text-[11px] text-emerald-600 font-semibold">Gợi ý hôm nay</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto no-scrollbar">
                    {DESTINATIONS.map((dest) => (
                      <button
                        key={dest.id}
                        type="button"
                        onClick={() => handleSelectDestination(dest.name)}
                        className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-emerald-50 text-left transition-colors group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-emerald-100 group-hover:text-emerald-700 transition-colors">
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
                  {searchCriteria.checkIn && searchCriteria.checkOut
                    ? `${searchCriteria.checkIn} - ${searchCriteria.checkOut}`
                    : "Chọn ngày nhận & trả phòng"}
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
                  className="absolute top-full left-0 sm:left-auto sm:right-0 md:left-0 mt-2 w-80 sm:w-88 bg-white rounded-2xl shadow-2xl border border-slate-100 p-4 z-50"
                >
                  <span className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                    Chọn lịch trình nhanh
                  </span>
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {[
                      { label: "Cuối tuần này (T7 - CN)", in: "14/11", out: "15/11" },
                      { label: "3 ngày 2 đêm (T6 - CN)", in: "20/11", out: "22/11" },
                      { label: "Giữa tuần thư giãn", in: "18/11", out: "20/11" },
                      { label: "Kỳ nghỉ cuối năm", in: "25/12", out: "28/12" },
                    ].map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setSearchCriteria((prev) => ({
                            ...prev,
                            checkIn: preset.in,
                            checkOut: preset.out,
                          }));
                          setDateOpen(false);
                          setGuestsOpen(true);
                        }}
                        className="p-2.5 text-left border border-slate-200 rounded-xl hover:border-emerald-500 hover:bg-emerald-50/50 transition-all text-xs"
                      >
                        <span className="font-semibold text-slate-800 block truncate">
                          {preset.label}
                        </span>
                        <span className="text-[11px] text-emerald-600 block mt-0.5 font-medium">
                          {preset.in} → {preset.out}
                        </span>
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                    <input
                      type="date"
                      className="text-xs p-2 border border-slate-200 rounded-xl flex-1 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      onChange={(e) =>
                        setSearchCriteria((prev) => ({ ...prev, checkIn: e.target.value }))
                      }
                    />
                    <span className="text-slate-400 text-xs">đến</span>
                    <input
                      type="date"
                      className="text-xs p-2 border border-slate-200 rounded-xl flex-1 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      onChange={(e) =>
                        setSearchCriteria((prev) => ({ ...prev, checkOut: e.target.value }))
                      }
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
                  Số khách & Phòng
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
                  className="absolute top-full right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-100 p-4 z-50 space-y-4"
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
                        onClick={() => handleGuestCountChange("adults", -1)}
                        className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center hover:bg-slate-100 text-slate-600"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-5 text-center text-sm font-bold text-slate-800">
                        {searchCriteria.guests.adults}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleGuestCountChange("adults", 1)}
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
                        onClick={() => handleGuestCountChange("children", -1)}
                        className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center hover:bg-slate-100 text-slate-600"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-5 text-center text-sm font-bold text-slate-800">
                        {searchCriteria.guests.children}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleGuestCountChange("children", 1)}
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
                        onClick={() => handleGuestCountChange("rooms", -1)}
                        className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center hover:bg-slate-100 text-slate-600"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-5 text-center text-sm font-bold text-slate-800">
                        {searchCriteria.guests.rooms}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleGuestCountChange("rooms", 1)}
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

      {/* Popular quick tags underneath search bar */}
      <div className="flex items-center flex-wrap gap-2 mt-3 px-2 text-xs">
        <span className="text-slate-400 font-medium flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Xu hướng tìm:
        </span>
        {["Đà Lạt săn mây", "Phú Quốc resort", "Sa Pa view núi", "Đà Nẵng gần biển", "Hội An phố cổ"].map(
          (tag, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                const cityName = tag.split(" ")[0];
                handleSelectDestination(cityName);
              }}
              className="px-3 py-1 bg-white/70 hover:bg-white text-slate-700 hover:text-emerald-700 rounded-full border border-slate-200/60 shadow-xs transition-colors backdrop-blur-xs"
            >
              {tag}
            </button>
          )
        )}
      </div>
    </div>
  );
}
