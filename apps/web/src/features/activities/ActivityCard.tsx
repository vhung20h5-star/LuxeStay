"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Car,
  Clock,
  Compass,
  Landmark,
  MapPin,
  Mountain,
  Plane,
  Smartphone,
  Sparkles,
  Star,
  Ticket,
  Utensils,
  Waves,
} from "lucide-react";
import type { ActivitySubcategory, TravelActivity } from "@luxestay/contracts";
import { useLocale } from "@/features/locale/LocaleContext";

const SUBCATEGORY_BADGE_META: Record<
  ActivitySubcategory,
  {
    labelVi: string;
    labelEn: string;
    badgeClass: string;
    Icon: React.ComponentType<{ className?: string }>;
  }
> = {
  "theme-park": {
    labelVi: "Công viên & Cáp treo",
    labelEn: "Theme Park",
    badgeClass: "bg-rose-600/90 text-white",
    Icon: Ticket,
  },
  "heritage-culture": {
    labelVi: "Di sản & Văn hóa",
    labelEn: "Heritage",
    badgeClass: "bg-amber-700/90 text-white",
    Icon: Landmark,
  },
  "island-sea": {
    labelVi: "Tour đảo & Biển",
    labelEn: "Island & Sea",
    badgeClass: "bg-cyan-600/90 text-white",
    Icon: Waves,
  },
  "mountain-nature": {
    labelVi: "Săn mây & Núi",
    labelEn: "Nature & Peaks",
    badgeClass: "bg-emerald-600/90 text-white",
    Icon: Mountain,
  },
  "local-workshop": {
    labelVi: "Trải nghiệm bản địa",
    labelEn: "Local Experience",
    badgeClass: "bg-violet-600/90 text-white",
    Icon: Compass,
  },
  "airport-transfer": {
    labelVi: "Đưa đón sân bay",
    labelEn: "Airport Transfer",
    badgeClass: "bg-sky-600/90 text-white",
    Icon: Car,
  },
  "sim-wifi": {
    labelVi: "eSIM / SIM 4G",
    labelEn: "eSIM & 4G SIM",
    badgeClass: "bg-indigo-600/90 text-white",
    Icon: Smartphone,
  },
  "fast-track": {
    labelVi: "Fast-Track VIP",
    labelEn: "VIP Fast-Track",
    badgeClass: "bg-slate-800/90 text-white",
    Icon: Plane,
  },
  "live-show": {
    labelVi: "Show diễn",
    labelEn: "Live Show",
    badgeClass: "bg-fuchsia-600/90 text-white",
    Icon: Sparkles,
  },
  "spa-wellness": {
    labelVi: "Spa & Tắm bùn",
    labelEn: "Spa & Wellness",
    badgeClass: "bg-teal-600/90 text-white",
    Icon: Waves,
  },
  "dining-cruise": {
    labelVi: "Ẩm thực & Du thuyền",
    labelEn: "Dining & Cruise",
    badgeClass: "bg-orange-600/90 text-white",
    Icon: Utensils,
  },
};

export function ActivityCard({ activity }: { activity: TravelActivity }) {
  const { locale, formatPrice } = useLocale();
  const meta =
    SUBCATEGORY_BADGE_META[activity.subcategory] ?? SUBCATEGORY_BADGE_META["local-workshop"];
  const Icon = meta.Icon;

  return (
    <Link
      href={`/activities/${activity.slug}`}
      data-testid={`activity-card-${activity.id}`}
      className="group flex flex-col w-full min-w-0 bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-sm hover:shadow-xl hover:border-emerald-200 transition-all duration-300"
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-100">
        <Image
          src={activity.images[0]}
          alt={activity.title}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-x-3 top-3 flex items-center justify-between gap-2">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold backdrop-blur-sm shadow-sm ${meta.badgeClass}`}
          >
            <Icon className="w-3.5 h-3.5 shrink-0" />
            {locale === "en" ? meta.labelEn : meta.labelVi}
          </span>
          {activity.freeCancellation && (
            <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-white/90 text-emerald-700 backdrop-blur-sm shadow-sm shrink-0">
              {locale === "en" ? "Free cancel" : "Hủy miễn phí"}
            </span>
          )}
        </div>
      </div>

      <div className="p-4 sm:p-5 flex-1 flex flex-col gap-2.5 min-w-0">
        <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1 font-medium text-slate-600 truncate">
            <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            {activity.destinationCity}
          </span>
          <span className="inline-flex items-center gap-1 font-semibold text-slate-700 shrink-0">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            {activity.rating.toFixed(2)}
            <span className="text-slate-400 font-normal">({activity.reviewCount})</span>
          </span>
        </div>

        <h3 className="text-base font-bold text-slate-900 group-hover:text-emerald-700 transition-colors line-clamp-2 leading-snug">
          {activity.title}
        </h3>

        <p className="text-xs sm:text-sm text-slate-500 line-clamp-2 flex-1">
          {activity.subtitle}
        </p>

        <div className="flex items-center gap-2 text-xs text-slate-500 pt-1">
          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="truncate">{activity.durationLabel}</span>
          {activity.transferDetails && (
            <span className="ml-auto text-[11px] font-semibold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-full shrink-0">
              {activity.transferDetails.maxPassengers} chỗ
            </span>
          )}
          {!activity.transferDetails && activity.attractionDetails && (
            <span className="ml-auto text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full shrink-0">
              {locale === "en" ? "QR Entry" : "Vào cổng QR"}
            </span>
          )}
          {!activity.transferDetails && activity.essentialDetails && (
            <span className="ml-auto text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full shrink-0">
              {locale === "en" ? "Instant" : "Tức thì"}
            </span>
          )}
        </div>

        <div className="pt-3 mt-1 border-t border-slate-100 flex items-end justify-between gap-2">
          <div className="min-w-0">
            {activity.originalPrice && activity.originalPrice > activity.pricePerUnit && (
              <div className="text-xs text-slate-400 line-through">
                {formatPrice(activity.originalPrice)}
              </div>
            )}
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-black text-emerald-700">
                {formatPrice(activity.pricePerUnit)}
              </span>
              <span className="text-xs text-slate-500">/ {activity.unitLabel}</span>
            </div>
          </div>
          <span className="text-xs font-bold text-emerald-700 group-hover:translate-x-0.5 transition-transform shrink-0">
            {locale === "en" ? "Details →" : "Xem chi tiết →"}
          </span>
        </div>
      </div>
    </Link>
  );
}
