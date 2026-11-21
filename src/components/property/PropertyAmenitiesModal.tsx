"use client";

import React, { useEffect, useMemo, useReducer } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronRight, Search, SearchX, Sparkles, X } from "lucide-react";
import type { AmenityCategoryId, Property } from "@/types";
import { AMENITY_CATEGORIES } from "@/data/amenities";
import {
  buildSelectedBookingAmenities,
  createAmenitiesModalState,
  filterPropertyAmenities,
  getPropertyAmenityCategories,
  groupAmenitiesByCategory,
  reduceAmenitiesModalState,
  resolvePropertyAmenities,
  type AmenityFeeFilter,
} from "@/lib/amenities";
import { formatVND } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { AmenityIcon } from "./AmenityIcon";
import { AmenityDetailPanel } from "./AmenityDetailPanel";

export interface PropertyAmenitiesModalProps {
  isOpen: boolean;
  property: Property;
  initialAmenityId?: string | null;
  initialCategory?: AmenityCategoryId | "all";
  selectedAmenityIds: string[];
  onToggleAmenity: (amenityId: string) => void;
  onClose: () => void;
}

interface InnerProps extends Omit<PropertyAmenitiesModalProps, "isOpen"> {
  onClose: () => void;
}

function PropertyAmenitiesModalContent({
  property,
  initialAmenityId = null,
  initialCategory = "all",
  selectedAmenityIds,
  onToggleAmenity,
  onClose,
}: InnerProps) {
  const resolvedAmenities = useMemo(() => resolvePropertyAmenities(property), [property]);
  const availableCategories = useMemo(
    () => getPropertyAmenityCategories(resolvedAmenities),
    [resolvedAmenities]
  );

  const [modalState, dispatch] = useReducer(
    reduceAmenitiesModalState,
    {
      initialAmenityId,
      initialCategory,
      fallbackAmenityId: resolvedAmenities[0]?.id ?? null,
    },
    createAmenitiesModalState
  );
  const { activeCategory, searchQuery, feeFilter, activeAmenityId, mobileShowDetail } = modalState;

  // Capture-phase Escape handling so only this modal closes (not PropertyModal underneath)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [onClose]);

  const selectedAmenities = useMemo(
    () => buildSelectedBookingAmenities(resolvedAmenities, selectedAmenityIds),
    [resolvedAmenities, selectedAmenityIds]
  );

  const selectedTotalFee = useMemo(
    () => selectedAmenities.reduce((sum, item) => sum + item.price, 0),
    [selectedAmenities]
  );

  const filteredAmenities = useMemo(
    () =>
      filterPropertyAmenities(resolvedAmenities, {
        query: searchQuery,
        category: activeCategory,
        feeFilter,
        selectedIds: selectedAmenityIds,
      }),
    [resolvedAmenities, searchQuery, activeCategory, feeFilter, selectedAmenityIds]
  );

  const groupedFiltered = useMemo(
    () => groupAmenitiesByCategory(filteredAmenities),
    [filteredAmenities]
  );

  // Auto-fallback to first visible item when active item is filtered out
  const effectiveActiveAmenity = useMemo(
    () => filteredAmenities.find((a) => a.id === activeAmenityId) ?? filteredAmenities[0] ?? null,
    [filteredAmenities, activeAmenityId]
  );

  const categoryLabelMap = useMemo(() => {
    const map = new Map<AmenityCategoryId, string>();
    for (const c of AMENITY_CATEGORIES) {
      map.set(c.id, c.label);
    }
    return map;
  }, []);

  const handleResetFilters = () => {
    dispatch({ type: "RESET_FILTERS" });
  };

  const feeFilterOptions: Array<{ id: AmenityFeeFilter; label: string }> = [
    { id: "all", label: "Tất cả" },
    { id: "free", label: "Miễn phí" },
    { id: "paid", label: "Có phụ phí" },
    { id: "selected", label: `Đã chọn (${selectedAmenities.length})` },
  ];

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-2 sm:p-5 overflow-hidden"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="fixed inset-0 bg-slate-950/65 backdrop-blur-sm"
      />

      {/* Modal Container */}
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="Tất cả tiện ích và dịch vụ"
        initial={{ opacity: 0, scale: 0.96, y: 18 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 14 }}
        transition={{ type: "spring", stiffness: 360, damping: 28 }}
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 w-full max-w-5xl h-[90vh] max-h-[820px] bg-white rounded-3xl shadow-2xl border border-slate-200/80 flex flex-col overflow-hidden"
      >
        {/* Sticky Header */}
        <div className="shrink-0 p-4 sm:px-6 sm:pt-5 sm:pb-4 border-b border-slate-100 bg-white space-y-3.5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                  Tất cả tiện ích &amp; dịch vụ
                </h3>
                <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                  {resolvedAmenities.length} tiện ích
                </span>
              </div>
              <p className="text-xs text-slate-500 truncate mt-0.5">{property.title}</p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
              aria-label="Đóng cửa sổ tiện ích"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search & Quick Fee Filters */}
          <div className="flex flex-col sm:flex-row gap-2.5 sm:items-center">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => dispatch({ type: "SET_SEARCH", query: e.target.value })}
                placeholder="Tìm tiện ích: hồ bơi, gym, spa, đưa đón..."
                className="w-full h-10 pl-10 pr-9 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => dispatch({ type: "SET_SEARCH", query: "" })}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200/70"
                  aria-label="Xóa từ khóa tìm kiếm"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 sm:pb-0">
              {feeFilterOptions.map((opt) => {
                const active = feeFilter === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => dispatch({ type: "SET_FEE_FILTER", feeFilter: opt.id })}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap border transition-all ${
                      active
                        ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                        : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Horizontal Category Tabs (Available Categories Only) */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
            <button
              type="button"
              onClick={() => dispatch({ type: "SET_CATEGORY", category: "all" })}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border transition-all flex items-center gap-1.5 ${
                activeCategory === "all"
                  ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                  : "bg-slate-50 text-slate-700 border-slate-200 hover:border-emerald-300"
              }`}
            >
              <span>Tất cả ({resolvedAmenities.length})</span>
            </button>

            {availableCategories.map(({ category, count }) => {
              const active = activeCategory === category.id;
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => dispatch({ type: "SET_CATEGORY", category: category.id })}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border transition-all flex items-center gap-1.5 ${
                    active
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:border-emerald-300"
                  }`}
                >
                  <AmenityIcon
                    name={category.iconName}
                    className={`w-3.5 h-3.5 ${active ? "text-white" : "text-emerald-600"}`}
                  />
                  <span>
                    {category.shortLabel} ({count})
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Master-Detail Body */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {filteredAmenities.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
                <SearchX className="w-7 h-7" />
              </div>
              <h4 className="text-base font-bold text-slate-800">
                Không tìm thấy tiện ích phù hợp
              </h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mb-5">
                Thử xóa bớt từ khóa tìm kiếm hoặc chọn lại danh mục để xem đầy đủ các tiện ích tại{" "}
                {property.title}.
              </p>
              <Button type="button" variant="outline" size="sm" onClick={handleResetFilters}>
                Đặt lại bộ lọc
              </Button>
            </div>
          ) : (
            <div className="h-full md:grid md:grid-cols-12">
              {/* Left Master List */}
              <div
                className={`h-full md:col-span-5 md:border-r border-slate-100 overflow-y-auto p-3.5 sm:p-4 space-y-5 bg-white ${
                  mobileShowDetail ? "hidden md:block" : "block"
                }`}
              >
                {groupedFiltered.map(({ category, items }) => (
                  <div key={category.id} className="space-y-2">
                    <div className="flex items-center justify-between px-1">
                      <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                        <AmenityIcon
                          name={category.iconName}
                          className="w-3.5 h-3.5 text-emerald-600"
                        />
                        <span>{category.label}</span>
                      </div>
                      <span className="text-[11px] font-semibold text-slate-400">
                        {items.length}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {items.map((item) => {
                        const isActive = effectiveActiveAmenity?.id === item.id;
                        const isItemSelected = selectedAmenityIds.includes(item.id);

                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() =>
                              dispatch({ type: "SELECT_AMENITY", amenityId: item.id })
                            }
                            className={`w-full text-left p-3 rounded-2xl border transition-all flex items-center gap-3 group ${
                              isActive
                                ? "border-emerald-500 bg-emerald-50/60 shadow-xs"
                                : "border-slate-100 bg-slate-50/50 hover:border-slate-200 hover:bg-slate-50"
                            }`}
                          >
                            <div
                              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                                isActive
                                  ? "bg-emerald-600 text-white"
                                  : "bg-white text-emerald-700 border border-slate-200/80 group-hover:border-emerald-200"
                              }`}
                            >
                              <AmenityIcon name={item.iconName} className="w-4 h-4" />
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-bold text-slate-900 line-clamp-1">
                                {item.name}
                              </div>
                              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                {item.pricingType === "paid" ? (
                                  <span className="text-[10px] font-bold text-amber-800 bg-amber-100/90 px-1.5 py-0.5 rounded-md">
                                    +{formatVND(item.price ?? 0)}
                                  </span>
                                ) : item.pricingType === "free-reservation" ? (
                                  <span className="text-[10px] font-semibold text-teal-800 bg-teal-100/80 px-1.5 py-0.5 rounded-md">
                                    Miễn phí • Đặt trước
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100/70 px-1.5 py-0.5 rounded-md">
                                    Miễn phí
                                  </span>
                                )}

                                {isItemSelected && (
                                  <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-white bg-emerald-600 px-1.5 py-0.5 rounded-md">
                                    <Check className="w-2.5 h-2.5" /> Đã chọn
                                  </span>
                                )}
                              </div>
                            </div>

                            <ChevronRight
                              className={`w-4 h-4 shrink-0 transition-transform ${
                                isActive
                                  ? "text-emerald-600 translate-x-0.5"
                                  : "text-slate-300 group-hover:text-slate-500"
                              }`}
                            />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Right Detail Pane */}
              <div
                className={`h-full md:col-span-7 overflow-y-auto p-4 sm:p-6 bg-slate-50/50 ${
                  mobileShowDetail ? "block" : "hidden md:block"
                }`}
              >
                {effectiveActiveAmenity && (
                  <AmenityDetailPanel
                    amenity={effectiveActiveAmenity}
                    categoryLabel={
                      categoryLabelMap.get(effectiveActiveAmenity.category) ?? "Tiện ích"
                    }
                    isSelected={selectedAmenityIds.includes(effectiveActiveAmenity.id)}
                    onToggleSelect={onToggleAmenity}
                    onBackMobile={() => dispatch({ type: "BACK_TO_LIST" })}
                  />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sticky Bottom Footer */}
        <div className="shrink-0 p-3.5 sm:px-6 sm:py-4 border-t border-slate-100 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs">
            {selectedAmenities.length > 0 ? (
              <>
                <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="font-bold text-slate-900">
                    Đã chọn {selectedAmenities.length} dịch vụ đi kèm
                  </span>
                  <span className="text-emerald-700 font-bold ml-1.5">
                    {selectedTotalFee > 0 ? `(+${formatVND(selectedTotalFee)})` : "(Miễn phí 0đ)"}
                  </span>
                </div>
              </>
            ) : (
              <span className="text-slate-500">
                Bấm vào từng tiện ích để xem giờ mở cửa, vị trí, chi phí và đăng ký kèm đơn đặt phòng.
              </span>
            )}
          </div>

          <Button
            type="button"
            variant="primary"
            onClick={onClose}
            className="w-full sm:w-auto justify-center font-bold"
          >
            Xong &amp; quay lại đặt phòng
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

export function PropertyAmenitiesModal({
  isOpen,
  property,
  initialAmenityId = null,
  initialCategory = "all",
  selectedAmenityIds,
  onToggleAmenity,
  onClose,
}: PropertyAmenitiesModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <PropertyAmenitiesModalContent
          key={`${property.id}-${initialAmenityId ?? "none"}-${initialCategory}`}
          property={property}
          initialAmenityId={initialAmenityId}
          initialCategory={initialCategory}
          selectedAmenityIds={selectedAmenityIds}
          onToggleAmenity={onToggleAmenity}
          onClose={onClose}
        />
      )}
    </AnimatePresence>
  );
}
