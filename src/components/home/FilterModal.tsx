"use client";

import React from "react";
import { Modal } from "@/components/ui/Modal";
import { useBooking } from "@/context/BookingContext";
import { formatVND } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Check } from "lucide-react";
import { PropertyType } from "@/types";

export function FilterModal() {
  const { filterModalOpen, setFilterModalOpen, filterState, setFilterState, resetFilters } =
    useBooking();

  const propertyTypeOptions: { id: PropertyType; label: string; desc: string }[] = [
    { id: "homestay", label: "Homestay", desc: "Ấm cúng, gần gũi và mộc mạc" },
    { id: "hotel", label: "Khách sạn", desc: "Tiện nghi, dịch vụ lễ tân 24/7" },
    { id: "villa", label: "Villa biệt thự", desc: "Sang trọng, hồ bơi riêng biệt" },
    { id: "resort", label: "Resort 5 Sao", desc: "Nghỉ dưỡng thượng lưu ven biển/núi" },
    { id: "glamping", label: "Glamping", desc: "Cắm trại cao cấp giữa thiên nhiên" },
  ];

  const amenityOptions = [
    "View ngắm mây trọn thung lũng",
    "Hồ bơi vô cực riêng tư tràn bờ",
    "Bồn tắm gỗ ngoài trời",
    "Bữa sáng tự chọn tại phòng",
    "Bếp nướng BBQ sân vườn",
    "Lò sưởi củi ấm áp",
    "Xe đưa đón sân bay",
  ];

  const togglePropertyType = (type: PropertyType) => {
    setFilterState((prev) => {
      const exists = prev.propertyTypes.includes(type);
      return {
        ...prev,
        propertyTypes: exists
          ? prev.propertyTypes.filter((t) => t !== type)
          : [...prev.propertyTypes, type],
      };
    });
  };

  const toggleAmenity = (amenity: string) => {
    setFilterState((prev) => {
      const exists = prev.amenities.includes(amenity);
      return {
        ...prev,
        amenities: exists
          ? prev.amenities.filter((a) => a !== amenity)
          : [...prev.amenities, amenity],
      };
    });
  };

  return (
    <Modal
      isOpen={filterModalOpen}
      onClose={() => setFilterModalOpen(false)}
      title="Bộ lọc nâng cao"
      subtitle="Tìm kiếm chỗ nghỉ chính xác theo tiêu chí của bạn"
      maxWidth="2xl"
    >
      <div className="space-y-6 py-2">
        {/* 1. Khoảng giá (VND/đêm) */}
        <div>
          <h4 className="text-sm font-bold text-slate-800 mb-2">Khoảng giá mỗi đêm</h4>
          <p className="text-xs text-slate-500 mb-4">
            Giá trung bình từ {formatVND(filterState.minPrice)} đến {formatVND(filterState.maxPrice)}
          </p>
          <div className="space-y-3">
            <input
              type="range"
              min={500000}
              max={10000000}
              step={200000}
              value={filterState.maxPrice}
              onChange={(e) =>
                setFilterState((prev) => ({ ...prev, maxPrice: Number(e.target.value) }))
              }
              className="w-full accent-emerald-600 cursor-pointer"
            />
            <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
              <span>{formatVND(500000)}</span>
              <span className="text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                Tối đa: {formatVND(filterState.maxPrice)}
              </span>
              <span>{formatVND(10000000)}+</span>
            </div>
          </div>
        </div>

        <div className="h-px bg-slate-100" />

        {/* 2. Loại hình lưu trú */}
        <div>
          <h4 className="text-sm font-bold text-slate-800 mb-3">Loại hình lưu trú</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {propertyTypeOptions.map((opt) => {
              const isChecked = filterState.propertyTypes.includes(opt.id);
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => togglePropertyType(opt.id)}
                  className={`flex items-start gap-3 p-3 rounded-2xl border text-left transition-all ${
                    isChecked
                      ? "border-emerald-500 bg-emerald-50/40 text-emerald-900 shadow-xs"
                      : "border-slate-200 hover:border-slate-300 bg-white text-slate-700"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-lg border mt-0.5 flex items-center justify-center transition-colors ${
                      isChecked
                        ? "bg-emerald-600 border-emerald-600 text-white"
                        : "border-slate-300 bg-white"
                    }`}
                  >
                    {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                  <div>
                    <div className="text-xs font-bold">{opt.label}</div>
                    <div className="text-[11px] text-slate-500">{opt.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="h-px bg-slate-100" />

        {/* 3. Đánh giá sao */}
        <div>
          <h4 className="text-sm font-bold text-slate-800 mb-3">Đánh giá tối thiểu</h4>
          <div className="flex flex-wrap gap-2">
            {[
              { val: 0, label: "Tất cả" },
              { val: 4.5, label: "★ 4.5+ (Tốt)" },
              { val: 4.8, label: "★ 4.8+ (Rất tốt)" },
              { val: 4.9, label: "★ 4.9+ (Tuyệt phẩm)" },
            ].map((rating) => {
              const isSelected = filterState.minRating === rating.val;
              return (
                <button
                  key={rating.val}
                  type="button"
                  onClick={() =>
                    setFilterState((prev) => ({ ...prev, minRating: rating.val }))
                  }
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all border ${
                    isSelected
                      ? "bg-amber-50 text-amber-900 border-amber-300 shadow-xs"
                      : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                  }`}
                >
                  {rating.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="h-px bg-slate-100" />

        {/* 4. Tiện ích nổi bật */}
        <div>
          <h4 className="text-sm font-bold text-slate-800 mb-3">Tiện ích ưu tiên</h4>
          <div className="flex flex-wrap gap-2">
            {amenityOptions.map((amenity) => {
              const isSelected = filterState.amenities.includes(amenity);
              return (
                <button
                  key={amenity}
                  type="button"
                  onClick={() => toggleAmenity(amenity)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border flex items-center gap-1.5 ${
                    isSelected
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300"
                  }`}
                >
                  {isSelected && <Check className="w-3 h-3" />}
                  <span>{amenity}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="h-px bg-slate-100" />

        {/* 5. Chính sách linh hoạt */}
        <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-200/60">
          <div>
            <span className="text-xs font-bold text-slate-800 block">
              Chỉ hiện chỗ nghỉ Hủy miễn phí
            </span>
            <span className="text-[11px] text-slate-500 block">
              Đổi hoặc hủy phòng không mất phí trước 48h
            </span>
          </div>
          <input
            type="checkbox"
            checked={filterState.freeCancellationOnly}
            onChange={(e) =>
              setFilterState((prev) => ({
                ...prev,
                freeCancellationOnly: e.target.checked,
              }))
            }
            className="w-5 h-5 accent-emerald-600 rounded cursor-pointer"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={resetFilters}
          className="text-xs font-bold text-slate-500 hover:text-slate-800 underline p-2"
        >
          Xóa tất cả bộ lọc
        </button>
        <Button
          variant="primary"
          onClick={() => setFilterModalOpen(false)}
          className="px-6"
        >
          Áp dụng bộ lọc
        </Button>
      </div>
    </Modal>
  );
}
