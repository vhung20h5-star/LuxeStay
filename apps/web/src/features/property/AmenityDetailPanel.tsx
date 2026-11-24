"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
  ArrowLeft,
  CalendarCheck,
  Check,
  CheckCircle2,
  Clock,
  Info,
  MapPin,
  Plus,
  Tag,
} from "lucide-react";
import type { ResolvedPropertyAmenity } from "@luxestay/contracts";
import { describeAmenityPricing } from "@luxestay/domain";
import { Badge } from "@/shared/ui/Badge";
import { Button } from "@/shared/ui/Button";
import { AmenityIcon } from "./AmenityIcon";

export interface AmenityDetailPanelProps {
  amenity: ResolvedPropertyAmenity;
  categoryLabel: string;
  isSelected: boolean;
  onToggleSelect: (amenityId: string) => void;
  onBackMobile?: () => void;
}

export function AmenityDetailPanel({
  amenity,
  categoryLabel,
  isSelected,
  onToggleSelect,
  onBackMobile,
}: AmenityDetailPanelProps) {
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);
  const showFallback = failedImageUrl === amenity.image;

  const pricing = describeAmenityPricing(amenity);
  const heroBadgeClass =
    pricing.tone === "paid"
      ? "bg-amber-500"
      : pricing.tone === "free-reservation"
        ? "bg-teal-600"
        : "bg-emerald-600";

  return (
    <div className="space-y-5">
      {/* Mobile back button */}
      {onBackMobile && (
        <button
          type="button"
          onClick={onBackMobile}
          className="md:hidden inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-3 py-1.5 rounded-full transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Quay lại danh sách tiện ích</span>
        </button>
      )}

      {/* Hero Photo with Fallback */}
      <div className="relative aspect-[16/9] w-full rounded-2xl overflow-hidden bg-gradient-to-br from-emerald-600 via-teal-600 to-slate-800 shadow-sm border border-slate-200/70">
        {!showFallback ? (
          <Image
            src={amenity.image}
            alt={amenity.name}
            fill
            sizes="(max-width: 768px) 100vw, 560px"
            className="object-cover"
            onError={() => setFailedImageUrl(amenity.image)}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white/90 gap-2 p-6">
            <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center">
              <AmenityIcon name={amenity.iconName} className="w-7 h-7 text-white" />
            </div>
            <span className="text-xs font-semibold tracking-wide text-white/85">
              {categoryLabel}
            </span>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-slate-900/20 pointer-events-none" />

        {/* Category Badge */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          <Badge className="bg-white/90 backdrop-blur-md text-slate-800 border-none shadow-xs">
            <AmenityIcon name={amenity.iconName} className="w-3.5 h-3.5 text-emerald-600" />
            <span>{categoryLabel}</span>
          </Badge>
        </div>

        {/* Pricing Badge */}
        <div className="absolute top-3 right-3">
          <Badge className={`${heroBadgeClass} text-white font-bold border-none shadow-xs`}>
            {pricing.heroBadge}
          </Badge>
        </div>
      </div>

      {/* Title & Description */}
      <div>
        <div className="flex items-start justify-between gap-3">
          <h4 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight leading-snug">
            {amenity.name}
          </h4>
          {isSelected && (
            <Badge variant="default" className="shrink-0 font-bold">
              <Check className="w-3 h-3" /> Đã chọn
            </Badge>
          )}
        </div>
        <p className="text-sm text-slate-600 leading-relaxed mt-2">{amenity.description}</p>
      </div>

      {/* 2x2 Structured Info Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
            <Clock className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Giờ hoạt động
            </span>
            <span className="text-xs font-bold text-slate-800 block mt-0.5 leading-snug">
              {amenity.hours}
            </span>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
            <MapPin className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Vị trí / Khu vực
            </span>
            <span className="text-xs font-bold text-slate-800 block mt-0.5 leading-snug">
              {amenity.location}
            </span>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
            <Tag className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Chi phí
            </span>
            <span className="text-xs font-bold text-slate-800 block mt-0.5 leading-snug">
              {pricing.detailPrice}
            </span>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
            <CalendarCheck className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Trạng thái / Đặt trước
            </span>
            <span className="text-xs font-bold text-slate-800 block mt-0.5 leading-snug">
              {pricing.detailStatus}
            </span>
          </div>
        </div>
      </div>

      {/* Guest Notes */}
      {amenity.notes && (
        <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/80 flex items-start gap-3">
          <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="text-xs font-bold text-amber-900 block">Lưu ý cho khách</span>
            <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">{amenity.notes}</p>
          </div>
        </div>
      )}

      {/* Action Area */}
      <div className="pt-1">
        {!pricing.isSelectable ? (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200/80 flex items-center gap-3 text-emerald-900">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <p className="text-xs font-semibold leading-relaxed">{pricing.includedNotice}</p>
          </div>
        ) : (
          <Button
            type="button"
            variant={isSelected ? "outline" : "primary"}
            size="lg"
            onClick={() => onToggleSelect(amenity.id)}
            className={`w-full justify-center text-sm font-bold ${
              isSelected
                ? "border-emerald-600 bg-emerald-50 text-emerald-800 hover:bg-rose-50 hover:border-rose-400 hover:text-rose-700"
                : ""
            }`}
          >
            {isSelected ? (
              <>
                <Check className="w-4 h-4" />
                <span>{pricing.selectedActionLabel}</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <span>{pricing.selectActionLabel}</span>
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
