"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  Briefcase,
  Compass,
  Landmark,
  Sparkles,
  Ticket,
} from "lucide-react";
import type { ActivitiesCatalogResponse, ActivityHubSection, TravelActivity } from "@luxestay/contracts";
import { useLocale } from "@/features/locale/LocaleContext";
import { ActivityCard } from "./ActivityCard";

export interface ActivitiesLoadError {
  code: string;
  message: string;
  requestId?: string;
}

const SECTION_SHORTCUTS: readonly {
  section: ActivityHubSection;
  labelKey:
    | "activities.section.attractions"
    | "activities.section.tours"
    | "activities.section.essentials"
    | "activities.section.entertainment";
  descVi: string;
  descEn: string;
  accent: string;
  Icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    section: "attractions",
    labelKey: "activities.section.attractions",
    descVi: "Bà Nà Hills, VinWonders, Fansipan, Đại Nội Huế...",
    descEn: "Ba Na Hills, VinWonders, Fansipan, Hue Citadel...",
    accent: "bg-rose-50 text-rose-700 border-rose-200/80 hover:border-rose-400",
    Icon: Landmark,
  },
  {
    section: "tours",
    labelKey: "activities.section.tours",
    descVi: "Hạ Long, Tràng An, Săn mây Đà Lạt, Lặn san hô...",
    descEn: "Ha Long, Trang An, Da Lat Clouds, Snorkeling...",
    accent: "bg-emerald-50 text-emerald-700 border-emerald-200/80 hover:border-emerald-400",
    Icon: Compass,
  },
  {
    section: "essentials",
    labelKey: "activities.section.essentials",
    descVi: "Xe đón sân bay, eSIM 4G/5G & Fast-Track VIP",
    descEn: "Airport Transfers, 4G/5G eSIM & VIP Fast-Track",
    accent: "bg-sky-50 text-sky-700 border-sky-200/80 hover:border-sky-400",
    Icon: Briefcase,
  },
  {
    section: "entertainment",
    labelKey: "activities.section.entertainment",
    descVi: "Ký Ức Hội An, Múa Rối Nước, Kiss of the Sea, Spa",
    descEn: "Hoi An Memories, Water Puppets, Kiss of the Sea, Spa",
    accent: "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200/80 hover:border-fuchsia-400",
    Icon: Ticket,
  },
];

function selectBalancedTeaserActivities(
  activities: readonly TravelActivity[]
): readonly TravelActivity[] {
  const sections: ActivityHubSection[] = ["attractions", "tours", "essentials", "entertainment"];
  const picked: TravelActivity[] = [];
  const usedIds = new Set<string>();

  for (const sec of sections) {
    const match = activities
      .filter((a) => a.isActive && a.hubSection === sec)
      .sort(
        (a, b) =>
          Number(b.isFeatured) - Number(a.isFeatured) ||
          b.reviewCount - a.reviewCount ||
          b.rating - a.rating
      )[0];
    if (match) {
      picked.push(match);
      usedIds.add(match.id);
    }
  }

  for (const item of activities) {
    if (picked.length >= 4) break;
    if (item.isActive && !usedIds.has(item.id)) {
      picked.push(item);
      usedIds.add(item.id);
    }
  }

  return picked;
}

export function HomeThingsToDoTeaser({
  initialCatalog,
  error,
}: {
  initialCatalog: ActivitiesCatalogResponse | null;
  error: ActivitiesLoadError | null;
}) {
  const { locale, t } = useLocale();
  const featured = useMemo(
    () => (initialCatalog ? selectBalancedTeaserActivities(initialCatalog.activities) : []),
    [initialCatalog]
  );

  return (
    <section
      id="activities-teaser-section"
      data-testid="home-things-to-do-teaser"
      className="py-14 sm:py-16 bg-white w-full min-w-0"
    >
      <div className="w-full min-w-0 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{t("activities.homeTeaserBadge")}</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
              {t("activities.homeTeaserTitle")}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1.5 max-w-2xl">
              {t("activities.homeTeaserSubtitle")}
            </p>
          </div>
          <Link
            href="/activities"
            data-testid="home-things-to-do-cta"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-slate-900 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold transition-colors shrink-0"
          >
            <span>
              {t("activities.homeTeaserCta", {
                count: initialCatalog?.activities.length ?? 56,
              })}
            </span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* 4 Quick Section Shortcuts */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 w-full min-w-0">
          {SECTION_SHORTCUTS.map((item) => {
            const Icon = item.Icon;
            return (
              <Link
                key={item.section}
                href={`/activities?section=${item.section}`}
                data-testid={`home-activity-shortcut-${item.section}`}
                className={`group flex items-start gap-3 p-4 rounded-2xl border transition-all min-w-0 ${item.accent}`}
              >
                <div className="w-10 h-10 rounded-xl bg-white/90 shadow-xs flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-sm text-slate-900 group-hover:underline">
                    {t(item.labelKey)}
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5 line-clamp-2">
                    {locale === "en" ? item.descEn : item.descVi}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Structured Error or 4 Balanced Highlight Cards */}
        {error ? (
          <div
            role="alert"
            className="p-5 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-sm text-rose-800"
          >
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold">{error.message}</div>
              <div className="text-xs text-rose-600 mt-0.5">
                Mã lỗi: {error.code}
                {error.requestId ? ` • Request ID: ${error.requestId}` : ""}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 w-full min-w-0">
            {featured.map((activity) => (
              <ActivityCard key={activity.id} activity={activity} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
