"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import type { BookingPricing, NightlyPriceReason } from "@luxestay/contracts";
import { formatVND } from "@luxestay/domain";

export interface SeasonalPricingSummaryProps {
  pricing: BookingPricing;
  nights: number;
  rooms?: number;
}

const REASON_LABELS: Record<NightlyPriceReason, { label: string; badgeClass: string }> = {
  base: { label: "Giá chuẩn", badgeClass: "bg-slate-100 text-slate-600" },
  weekend: { label: "Cuối tuần +20%", badgeClass: "bg-amber-100 text-amber-800" },
  holiday: { label: "Ngày lễ +30%", badgeClass: "bg-rose-100 text-rose-700" },
  override: { label: "Giá đặc biệt", badgeClass: "bg-sky-100 text-sky-700" },
};

function formatShortDate(isoDate: string): string {
  const parts = isoDate.split("-");
  if (parts.length !== 3) return isoDate;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export function SeasonalPricingSummary({
  pricing,
  nights,
  rooms = 1,
}: SeasonalPricingSummaryProps) {
  const [expanded, setExpanded] = useState(false);

  const surcharge = pricing.seasonalSurcharge ?? 0;
  const baseStayTotal = pricing.nightsTotal - surcharge;
  const hasBreakdown = Boolean(pricing.nightlyBreakdown && pricing.nightlyBreakdown.length > 0);
  const roomsLabel = rooms > 1 ? ` × ${rooms} phòng` : "";

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-slate-600">
        <span>
          {formatVND(pricing.basePrice)} × {nights} đêm{roomsLabel}
        </span>
        <span className="font-semibold text-slate-800">{formatVND(baseStayTotal)}</span>
      </div>

      {surcharge !== 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <span
                className={`font-semibold inline-flex items-center gap-1 ${
                  surcharge > 0 ? "text-amber-700" : "text-emerald-700"
                }`}
              >
                <Sparkles className="w-3 h-3" />
                {surcharge > 0 ? "Phụ thu cuối tuần / ngày lễ" : "Điều chỉnh giá theo ngày"}
              </span>
              {hasBreakdown && (
                <button
                  type="button"
                  onClick={() => setExpanded((prev) => !prev)}
                  className="inline-flex items-center gap-0.5 text-[10px] font-bold text-slate-500 hover:text-emerald-700 underline underline-offset-2"
                >
                  {expanded ? "Ẩn chi tiết" : "Xem từng đêm"}
                  {expanded ? (
                    <ChevronUp className="w-3 h-3" />
                  ) : (
                    <ChevronDown className="w-3 h-3" />
                  )}
                </button>
              )}
            </div>
            <span
              className={`font-bold ${
                surcharge > 0 ? "text-amber-700" : "text-emerald-700"
              }`}
            >
              {surcharge > 0 ? `+${formatVND(surcharge)}` : formatVND(surcharge)}
            </span>
          </div>

          {expanded && pricing.nightlyBreakdown && (
            <div className="p-2.5 rounded-xl bg-amber-50/60 border border-amber-200/70 space-y-1 text-[11px]">
              {pricing.nightlyBreakdown.map((night) => {
                const meta = REASON_LABELS[night.reason];
                return (
                  <div key={night.date} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-semibold text-slate-700">
                        {formatShortDate(night.date)}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${meta.badgeClass}`}
                      >
                        {meta.label}
                      </span>
                    </div>
                    <span className="font-bold text-slate-800">
                      {formatVND(night.effectivePrice * rooms)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
