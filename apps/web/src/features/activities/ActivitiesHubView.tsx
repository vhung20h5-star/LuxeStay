"use client";

import React, { useMemo, useState } from "react";
import { Car, Clock, Compass, MapPin, Search, SlidersHorizontal, Sparkles } from "lucide-react";
import type {
  ActivitiesCatalogResponse,
  ActivityCategory,
  ActivitySortOption,
  ActivityTimeSlotPeriod,
} from "@luxestay/contracts";
import { filterActivities } from "@luxestay/domain";
import { useLocale } from "@/features/locale/LocaleContext";
import { ActivityCard } from "./ActivityCard";

const CATEGORY_TABS: readonly { value: ActivityCategory | "all"; labelKey: string }[] = [
  { value: "all", labelKey: "activities.category.all" },
  { value: "transfer", labelKey: "activities.category.transfer" },
  { value: "tour", labelKey: "activities.category.tour" },
  { value: "experience", labelKey: "activities.category.experience" },
  { value: "wellness", labelKey: "activities.category.wellness" },
  { value: "culinary", labelKey: "activities.category.culinary" },
];

const PERIOD_OPTIONS: readonly { value: ActivityTimeSlotPeriod | "all"; labelKey: string }[] = [
  { value: "all", labelKey: "activities.period.all" },
  { value: "morning", labelKey: "activities.period.morning" },
  { value: "afternoon", labelKey: "activities.period.afternoon" },
  { value: "evening", labelKey: "activities.period.evening" },
  { value: "flexible", labelKey: "activities.period.flexible" },
];

export function ActivitiesHubView({
  initialCatalog,
}: {
  initialCatalog: ActivitiesCatalogResponse;
}) {
  const { locale, t } = useLocale();
  const [search, setSearch] = useState("");
  const [selectedCity, setSelectedCity] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<ActivityCategory | "all">("all");
  const [selectedPeriod, setSelectedPeriod] = useState<ActivityTimeSlotPeriod | "all">("all");
  const [sortBy, setSortBy] = useState<ActivitySortOption>("popular");

  const filtered = useMemo(
    () =>
      filterActivities(initialCatalog.activities, {
        city: selectedCity || undefined,
        search: search.trim() || undefined,
        category: selectedCategory,
        period: selectedPeriod,
        sortBy,
      }),
    [initialCatalog.activities, search, selectedCategory, selectedCity, selectedPeriod, sortBy]
  );

  const resetAll = () => {
    setSearch("");
    setSelectedCity("");
    setSelectedCategory("all");
    setSelectedPeriod("all");
    setSortBy("popular");
  };

  return (
    <div className="w-full min-w-0 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      {/* Hero Banner */}
      <section className="relative rounded-3xl bg-gradient-to-br from-slate-900 via-emerald-950 to-teal-900 text-white p-6 sm:p-10 overflow-hidden shadow-xl">
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-bold text-emerald-200">
            <Sparkles className="w-3.5 h-3.5" />
            <span>LuxeStay Multi-Service • Phase 5</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
            {t("activities.title")}
          </h1>
          <p className="text-sm sm:text-base text-slate-200/90 leading-relaxed">
            {t("activities.subtitle")}
          </p>
          <div className="flex flex-wrap gap-3 pt-2 text-xs text-emerald-100">
            <span className="inline-flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-full">
              <Car className="w-3.5 h-3.5" />
              {locale === "en" ? "Private Airport Transfers" : "Xe riêng đón tận sảnh"}
            </span>
            <span className="inline-flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-full">
              <Compass className="w-3.5 h-3.5" />
              {locale === "en" ? "Curated Local Tours" : "Tour tuyển chọn bản địa"}
            </span>
            <span className="inline-flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-full">
              <Clock className="w-3.5 h-3.5" />
              {locale === "en" ? "Instant Confirmation" : "Xác nhận tức thì • Hủy linh hoạt"}
            </span>
          </div>
        </div>
      </section>

      {/* Filter Bar */}
      <section className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-6 shadow-sm space-y-5 w-full min-w-0">
        {/* Search + Sort Row */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              data-testid="activities-search-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                locale === "en"
                  ? "Search airport transfer, Da Lat clouds, Hoi An lanterns..."
                  : "Tìm xe sân bay, săn mây Đà Lạt, thuyền Tràng An, Hội An..."
              }
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 bg-slate-50/70 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <SlidersHorizontal className="w-4 h-4 text-slate-400 hidden sm:block" />
            <select
              aria-label="Sắp xếp"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as ActivitySortOption)}
              className="w-full sm:w-auto px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-white text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            >
              <option value="popular">{locale === "en" ? "Most popular" : "Phổ biến nhất"}</option>
              <option value="rating">{locale === "en" ? "Highest rated" : "Đánh giá cao nhất"}</option>
              <option value="price-asc">{locale === "en" ? "Price: Low to High" : "Giá tăng dần"}</option>
              <option value="price-desc">{locale === "en" ? "Price: High to Low" : "Giá giảm dần"}</option>
            </select>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap gap-2">
          {CATEGORY_TABS.map((tab) => {
            const active = selectedCategory === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                data-testid={`activity-category-${tab.value}`}
                onClick={() => setSelectedCategory(tab.value)}
                className={`px-3.5 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                  active
                    ? "bg-emerald-600 text-white shadow-sm shadow-emerald-600/20"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200/80"
                }`}
              >
                {t(tab.labelKey as Parameters<typeof t>[0])}
              </button>
            );
          })}
        </div>

        {/* Destination Cities & Time Period */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-1.5 min-w-0">
            <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 mr-1">
              <MapPin className="w-3.5 h-3.5" />
              {locale === "en" ? "City:" : "Điểm đến:"}
            </span>
            <button
              type="button"
              onClick={() => setSelectedCity("")}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
                selectedCity === ""
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {locale === "en" ? "All" : "Tất cả"}
            </button>
            {initialCatalog.cities.map((city) => (
              <button
                key={city}
                type="button"
                data-testid={`activity-city-${city}`}
                onClick={() => setSelectedCity(city)}
                className={`px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
                  selectedCity === city
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {city}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
            <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 mr-1">
              <Clock className="w-3.5 h-3.5" />
              {locale === "en" ? "Slot:" : "Khung giờ:"}
            </span>
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setSelectedPeriod(opt.value)}
                className={`px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
                  selectedPeriod === opt.value
                    ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                    : "bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100"
                }`}
              >
                {t(opt.labelKey as Parameters<typeof t>[0])}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Results Grid */}
      <section className="space-y-4 w-full min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-slate-600" data-testid="activities-count">
            {locale === "en"
              ? `Showing ${filtered.length} activities & transfers`
              : `Tìm thấy ${filtered.length} hoạt động & dịch vụ đưa đón`}
          </p>
          {(search || selectedCity || selectedCategory !== "all" || selectedPeriod !== "all") && (
            <button
              type="button"
              onClick={resetAll}
              className="text-xs font-bold text-emerald-700 hover:underline cursor-pointer"
            >
              {locale === "en" ? "Clear filters" : "Xóa bộ lọc"}
            </button>
          )}
        </div>

        {filtered.length === 0 ? (
          <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-10 text-center space-y-3">
            <p className="text-slate-700 font-semibold">
              {locale === "en"
                ? "No activities match your filters."
                : "Không tìm thấy trải nghiệm hoặc dịch vụ đưa đón phù hợp."}
            </p>
            <button
              type="button"
              onClick={resetAll}
              className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 cursor-pointer"
            >
              {locale === "en" ? "Show all services" : "Xem tất cả dịch vụ"}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full min-w-0">
            {filtered.map((activity) => (
              <ActivityCard key={activity.id} activity={activity} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
