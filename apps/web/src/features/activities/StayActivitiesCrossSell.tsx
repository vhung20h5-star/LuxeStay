"use client";

import React, { useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { Car, Check, Compass, Plus, Sparkles, Ticket } from "lucide-react";
import type { SelectedBundleActivityInput, TravelActivity } from "@luxestay/contracts";
import { findRecommendedActivitiesForCity } from "@luxestay/domain";
import { useBookingSession } from "@/features/booking/BookingContext";
import { useLocale } from "@/features/locale/LocaleContext";

function toIsoDate(raw: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const dm = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dm) {
    return `${dm[3]}-${dm[2].padStart(2, "0")}-${dm[1].padStart(2, "0")}`;
  }
  const tomorrow = new Date(Date.now() + 86_400_000);
  return `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(
    tomorrow.getDate()
  ).padStart(2, "0")}`;
}

export interface StayActivitiesCrossSellProps {
  city: string;
  checkInDate: string;
  selectedActivities: readonly SelectedBundleActivityInput[];
  onToggleActivity: (item: SelectedBundleActivityInput, activity: TravelActivity) => void;
  compact?: boolean;
}

export function StayActivitiesCrossSell({
  city,
  checkInDate,
  selectedActivities,
  onToggleActivity,
  compact = false,
}: StayActivitiesCrossSellProps) {
  const { activitiesCatalog } = useBookingSession();
  const { locale, formatPrice, t } = useLocale();
  const items = useMemo(
    () => findRecommendedActivitiesForCity(activitiesCatalog, city, compact ? 2 : 3),
    [activitiesCatalog, city, compact]
  );

  if (items.length === 0) return null;

  const normalizedDate = toIsoDate(checkInDate);
  const cityActivitiesHref = `/activities?city=${encodeURIComponent(city)}`;

  return (
    <section
      data-testid="stay-activities-cross-sell"
      className="bg-gradient-to-br from-emerald-50/70 via-white to-sky-50/50 rounded-3xl border border-emerald-200/80 p-4 sm:p-5 space-y-3.5 w-full min-w-0"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 mb-0.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>
              {locale === "en" ? "Smart Stay Bundle" : "Combo tiết kiệm & tiện lợi"}
            </span>
          </div>
          <h3 className="text-sm sm:text-base font-black text-slate-900">
            {t("activities.crossSellTitle", { city })}
          </h3>
          {!compact && (
            <p className="text-xs text-slate-600 mt-0.5">{t("activities.crossSellSubtitle")}</p>
          )}
        </div>
        <Link
          href={cityActivitiesHref}
          data-testid="cross-sell-view-all-city"
          className="text-xs font-bold text-emerald-700 hover:underline shrink-0 whitespace-nowrap"
        >
          {locale === "en" ? `All in ${city} →` : `Xem tất cả tại ${city} →`}
        </Link>
      </div>

      <div className={compact ? "space-y-2.5" : "grid grid-cols-1 gap-3"}>
        {items.map((activity) => {
          const isSelected = selectedActivities.some((s) => s.activityId === activity.id);
          const defaultSlot = activity.slots[0];
          if (!defaultSlot) return null;

          const input: SelectedBundleActivityInput = {
            activityId: activity.id,
            slotId: defaultSlot.id,
            dateIso: normalizedDate,
            quantity: 1,
          };

          const isTransfer = activity.category === "transfer";
          const isAttraction = activity.hubSection === "attractions";

          return (
            <div
              key={activity.id}
              data-testid={`cross-sell-activity-${activity.id}`}
              className={`flex items-center gap-3 p-3 rounded-2xl border transition-all min-w-0 ${
                isSelected
                  ? "bg-emerald-50/90 border-emerald-400 shadow-sm"
                  : "bg-white border-slate-200/90 hover:border-emerald-300"
              }`}
            >
              <div className="relative w-16 h-14 rounded-xl overflow-hidden shrink-0 bg-slate-100">
                <Image
                  src={activity.images[0]}
                  alt={activity.title}
                  fill
                  sizes="64px"
                  className="object-cover"
                />
              </div>

              <div className="flex-1 min-w-0">
                <div
                  className={`flex items-center gap-1 text-[11px] font-bold ${
                    isTransfer
                      ? "text-sky-700"
                      : isAttraction
                        ? "text-rose-700"
                        : "text-emerald-700"
                  }`}
                >
                  {isTransfer ? (
                    <Car className="w-3 h-3 shrink-0" />
                  ) : isAttraction ? (
                    <Ticket className="w-3 h-3 shrink-0" />
                  ) : (
                    <Compass className="w-3 h-3 shrink-0" />
                  )}
                  <span className="truncate">{defaultSlot.label}</span>
                </div>
                <div className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-1">
                  {activity.title}
                </div>
                <div className="text-xs font-extrabold text-emerald-700 mt-0.5">
                  +{formatPrice(activity.pricePerUnit + (defaultSlot.priceModifier ?? 0))}{" "}
                  <span className="font-normal text-slate-500">/ {activity.unitLabel}</span>
                </div>
              </div>

              <button
                type="button"
                data-testid={`toggle-bundle-activity-${activity.id}`}
                onClick={() => onToggleActivity(input, activity)}
                className={`px-3 py-2 rounded-xl text-xs font-bold shrink-0 inline-flex items-center gap-1 cursor-pointer transition-colors ${
                  isSelected
                    ? "bg-emerald-600 text-white hover:bg-emerald-700"
                    : "bg-slate-900 text-white hover:bg-emerald-700"
                }`}
              >
                {isSelected ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Đã thêm</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    <span>Thêm</span>
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
