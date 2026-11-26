"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowRight,
  Briefcase,
  ChevronDown,
  ChevronUp,
  Clock,
  Compass,
  Landmark,
  MapPin,
  Search,
  SlidersHorizontal,
  Sparkles,
  Ticket,
} from "lucide-react";
import type {
  ActivitiesCatalogResponse,
  ActivitiesQueryParams,
  ActivityHubSection,
  ActivitySortOption,
  ActivitySubcategory,
  ActivityTimeSlotPeriod,
  TravelActivity,
} from "@luxestay/contracts";
import {
  filterActivities,
  getSubcategoriesForSection,
  resolveHubSectionForSubcategory,
  serializeActivitiesQueryToSearchParams,
} from "@luxestay/domain";
import { useLocale } from "@/features/locale/LocaleContext";
import { ActivityCard } from "./ActivityCard";

const INITIAL_VISIBLE_ACTIVITIES = 12;
const LOAD_MORE_STEP = 12;

type HubTabValue = ActivityHubSection | "explore";

const HUB_SECTION_TABS: readonly {
  value: HubTabValue;
  labelKey:
    | "activities.section.explore"
    | "activities.section.attractions"
    | "activities.section.tours"
    | "activities.section.essentials"
    | "activities.section.entertainment";
  Icon: React.ComponentType<{ className?: string }>;
}[] = [
  { value: "explore", labelKey: "activities.section.explore", Icon: Sparkles },
  { value: "attractions", labelKey: "activities.section.attractions", Icon: Landmark },
  { value: "tours", labelKey: "activities.section.tours", Icon: Compass },
  { value: "essentials", labelKey: "activities.section.essentials", Icon: Briefcase },
  { value: "entertainment", labelKey: "activities.section.entertainment", Icon: Ticket },
];

const CURATED_EXPLORE_BANDS: readonly {
  section: ActivityHubSection;
  titleVi: string;
  titleEn: string;
  subtitleVi: string;
  subtitleEn: string;
  badgeClass: string;
}[] = [
  {
    section: "attractions",
    titleVi: "Điểm tham quan & Cáp treo Biểu tượng Việt Nam",
    titleEn: "Iconic Vietnam Theme Parks & Heritage Sites",
    subtitleVi: "Cầu Vàng Bà Nà Hills, VinWonders, Fansipan 3.143m, Đại Nội Huế, Văn Miếu...",
    subtitleEn: "Ba Na Hills Golden Bridge, VinWonders, Fansipan Peak, Hue Citadel & more",
    badgeClass: "bg-rose-50 text-rose-700",
  },
  {
    section: "tours",
    titleVi: "Tour Bản địa & Khám phá Thiên nhiên",
    titleEn: "Curated Day Tours & Outdoor Adventures",
    subtitleVi: "Du thuyền Hạ Long, Thuyền Tràng An, Săn mây Đà Lạt, Lặn san hô & Địa đạo Củ Chi",
    subtitleEn: "Ha Long Cruise, Trang An Boats, Da Lat Clouds, Snorkeling & Mekong Delta",
    badgeClass: "bg-emerald-50 text-emerald-700",
  },
  {
    section: "essentials",
    titleVi: "Cần thiết cho Chuyến đi Suôn sẻ",
    titleEn: "Seamless Travel Essentials",
    subtitleVi: "Xe riêng đón tận sảnh 7 sân bay lớn, eSIM 4G/5G QR tức thì & VIP Fast-Track",
    subtitleEn: "Private airport transfers nationwide, instant QR 4G/5G eSIMs & VIP Fast-Track",
    badgeClass: "bg-sky-50 text-sky-700",
  },
  {
    section: "entertainment",
    titleVi: "Show diễn Đẳng cấp, Spa & Du thuyền Đêm",
    titleEn: "Live Shows, Mineral Spas & Dinner Cruises",
    subtitleVi: "Ký Ức Hội An, Múa Rối Nước Thăng Long, Pháo hoa Phú Quốc & Du thuyền Sông Sài Gòn",
    subtitleEn: "Hoi An Memories, Water Puppetry, Kiss of the Sea Fireworks & Saigon Cruise",
    badgeClass: "bg-fuchsia-50 text-fuchsia-700",
  },
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
  initialQuery = {},
}: {
  initialCatalog: ActivitiesCatalogResponse;
  initialQuery?: ActivitiesQueryParams;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { locale, t } = useLocale();

  const [selectedSection, setSelectedSection] = useState<HubTabValue>(
    initialQuery.section ?? "explore"
  );
  const [selectedSubcategory, setSelectedSubcategory] = useState<ActivitySubcategory | "all">(
    initialQuery.subcategory ?? "all"
  );
  const [search, setSearch] = useState(initialQuery.search ?? "");
  const [selectedCity, setSelectedCity] = useState<string>(initialQuery.city ?? "");
  const [selectedPeriod, setSelectedPeriod] = useState<ActivityTimeSlotPeriod | "all">(
    initialQuery.period ?? "all"
  );
  const [sortBy, setSortBy] = useState<ActivitySortOption>(initialQuery.sortBy ?? "popular");

  const didMountRef = useRef(false);
  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    const params = serializeActivitiesQueryToSearchParams({
      section: selectedSection,
      subcategory: selectedSubcategory,
      city: selectedCity || undefined,
      period: selectedPeriod,
      search: search.trim() || undefined,
      sortBy,
    });
    const qs = params.toString();
    const nextUrl = qs ? `${pathname}?${qs}` : pathname;
    router.replace(nextUrl, { scroll: false });
  }, [
    pathname,
    router,
    search,
    selectedCity,
    selectedPeriod,
    selectedSection,
    selectedSubcategory,
    sortBy,
  ]);

  const sectionCounts = useMemo(() => {
    const counts: Record<HubTabValue, number> = {
      explore: initialCatalog.activities.filter((a) => a.isActive).length,
      attractions: 0,
      tours: 0,
      essentials: 0,
      entertainment: 0,
    };
    for (const item of initialCatalog.activities) {
      if (!item.isActive) continue;
      counts[item.hubSection] = (counts[item.hubSection] ?? 0) + 1;
    }
    return counts;
  }, [initialCatalog.activities]);

  const visibleSubcategories = useMemo(
    () => getSubcategoriesForSection(selectedSection),
    [selectedSection]
  );

  const filtered = useMemo(
    () =>
      filterActivities(initialCatalog.activities, {
        section: selectedSection,
        subcategory: selectedSubcategory,
        city: selectedCity || undefined,
        search: search.trim() || undefined,
        period: selectedPeriod,
        sortBy,
      }),
    [
      initialCatalog.activities,
      search,
      selectedCity,
      selectedPeriod,
      selectedSection,
      selectedSubcategory,
      sortBy,
    ]
  );

  const filterSignature = `${selectedSection}|${selectedSubcategory}|${selectedCity}|${selectedPeriod}|${search.trim()}|${sortBy}`;
  const [paginationState, setPaginationState] = useState<{
    signature: string;
    visibleCount: number;
  }>({
    signature: filterSignature,
    visibleCount: INITIAL_VISIBLE_ACTIVITIES,
  });

  const visibleCount =
    paginationState.signature === filterSignature
      ? paginationState.visibleCount
      : INITIAL_VISIBLE_ACTIVITIES;
  const visibleActivities = useMemo(
    () => filtered.slice(0, visibleCount),
    [filtered, visibleCount]
  );
  const remainingCount = Math.max(0, filtered.length - visibleActivities.length);

  const hasActiveFilters =
    selectedSection !== "explore" ||
    selectedSubcategory !== "all" ||
    Boolean(selectedCity) ||
    Boolean(search.trim()) ||
    selectedPeriod !== "all" ||
    sortBy !== "popular";

  const showCuratedExploreBands = !hasActiveFilters;

  const curatedBySection = useMemo(() => {
    const map = new Map<ActivityHubSection, readonly TravelActivity[]>();
    for (const band of CURATED_EXPLORE_BANDS) {
      const items = filterActivities(initialCatalog.activities, {
        section: band.section,
        sortBy: "popular",
      }).slice(0, 3);
      map.set(band.section, items);
    }
    return map;
  }, [initialCatalog.activities]);

  const handleSelectSection = (nextSection: HubTabValue) => {
    setSelectedSection(nextSection);
    if (
      nextSection !== "explore" &&
      selectedSubcategory !== "all" &&
      resolveHubSectionForSubcategory(selectedSubcategory) !== nextSection
    ) {
      setSelectedSubcategory("all");
    }
  };

  const handleSelectSubcategory = (nextSub: ActivitySubcategory | "all") => {
    setSelectedSubcategory(nextSub);
    if (nextSub !== "all") {
      setSelectedSection(resolveHubSectionForSubcategory(nextSub));
    }
  };

  const resetAll = () => {
    setSelectedSection("explore");
    setSelectedSubcategory("all");
    setSearch("");
    setSelectedCity("");
    setSelectedPeriod("all");
    setSortBy("popular");
  };

  return (
    <div className="w-full min-w-0 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8">
      {/* Hero Banner */}
      <section className="relative rounded-3xl bg-gradient-to-br from-slate-900 via-emerald-950 to-teal-900 text-white p-6 sm:p-10 overflow-hidden shadow-xl w-full min-w-0">
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-bold text-emerald-200">
            <Sparkles className="w-3.5 h-3.5" />
            <span>
              {locale === "en"
                ? `LuxeStay Things to Do • ${initialCatalog.activities.length} Experiences · ${initialCatalog.cities.length} Cities`
                : `LuxeStay Hoạt động & Vui chơi • ${initialCatalog.activities.length} dịch vụ · ${initialCatalog.cities.length} thành phố`}
            </span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
            {t("activities.title")}
          </h1>
          <p className="text-sm sm:text-base text-slate-200/90 leading-relaxed">
            {t("activities.subtitle")}
          </p>
          <div className="flex flex-wrap gap-2.5 pt-2 text-xs text-emerald-100">
            <span className="inline-flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-full">
              <Landmark className="w-3.5 h-3.5" />
              {locale === "en" ? "Iconic Attractions & QR Entry" : "Điểm tham quan & Vào cổng QR"}
            </span>
            <span className="inline-flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-full">
              <Compass className="w-3.5 h-3.5" />
              {locale === "en" ? "Day Tours & Local Crafts" : "Tour bản địa & Thiên nhiên"}
            </span>
            <span className="inline-flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-full">
              <Briefcase className="w-3.5 h-3.5" />
              {locale === "en" ? "Transfers, eSIM & Fast-Track" : "Xe sân bay, eSIM 4G & Fast-Track"}
            </span>
          </div>
        </div>
      </section>

      {/* Tier 1: Hub Section Tabs + Tier 2: Detailed Subcategories + Search/City/Slot Filter */}
      <section className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-6 shadow-sm space-y-5 w-full min-w-0">
        {/* Tier 1: 5 Hub Section Tabs */}
        <div
          role="tablist"
          aria-label="Mục Hoạt động và Vui chơi"
          className="flex flex-wrap gap-2 pb-4 border-b border-slate-100"
        >
          {HUB_SECTION_TABS.map((tab) => {
            const active = selectedSection === tab.value;
            const Icon = tab.Icon;
            return (
              <button
                key={tab.value}
                type="button"
                role="tab"
                aria-selected={active}
                data-testid={`activity-section-${tab.value}`}
                onClick={() => handleSelectSection(tab.value)}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  active
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200/80"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{t(tab.labelKey)}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[11px] font-extrabold ${
                    active ? "bg-white/20 text-white" : "bg-white text-slate-500"
                  }`}
                >
                  {sectionCounts[tab.value]}
                </span>
              </button>
            );
          })}
        </div>

        {/* Tier 2: Detailed Subcategory Chips */}
        <div className="space-y-2">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            {locale === "en" ? "Specific Category" : "Danh mục chi tiết"}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              data-testid="activity-sub-all"
              onClick={() => handleSelectSubcategory("all")}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer border ${
                selectedSubcategory === "all"
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-700 border-slate-200 hover:border-emerald-400"
              }`}
            >
              {t("activities.sub.all")}
            </button>
            {visibleSubcategories.map((sub) => {
              const active = selectedSubcategory === sub.id;
              return (
                <button
                  key={sub.id}
                  type="button"
                  data-testid={`activity-sub-${sub.id}`}
                  onClick={() => handleSelectSubcategory(sub.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer border ${
                    active
                      ? "bg-emerald-50 text-emerald-800 border-emerald-500 shadow-xs"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:border-emerald-300 hover:bg-white"
                  }`}
                >
                  {locale === "en" ? sub.labelEn : sub.labelVi}
                </button>
              );
            })}
          </div>
        </div>

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
                  ? "Search Ba Na Hills, VinWonders, eSIM 4G, Ha Long cruise, airport transfer..."
                  : "Tìm Bà Nà Hills, VinWonders, Fansipan, eSIM 4G, Ký Ức Hội An, xe sân bay..."
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

        {/* Destination Cities & Time Period */}
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 pt-3 border-t border-slate-100">
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

      {/* Curated "Khám phá" Thematic Showcase Strips (only on default Explore tab with no filters) */}
      {showCuratedExploreBands && (
        <div data-testid="activities-explore-showcase" className="space-y-8 w-full min-w-0">
          {CURATED_EXPLORE_BANDS.map((band) => {
            const bandItems = curatedBySection.get(band.section) ?? [];
            if (bandItems.length === 0) return null;
            return (
              <section
                key={band.section}
                data-testid={`explore-band-${band.section}`}
                className="space-y-4 w-full min-w-0"
              >
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
                  <div className="min-w-0">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold mb-1.5 ${band.badgeClass}`}
                    >
                      {t(
                        `activities.section.${band.section}` as Parameters<typeof t>[0]
                      )}
                    </span>
                    <h2 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight">
                      {locale === "en" ? band.titleEn : band.titleVi}
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                      {locale === "en" ? band.subtitleEn : band.subtitleVi}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSelectSection(band.section)}
                    className="inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-emerald-700 hover:text-emerald-800 hover:underline shrink-0 cursor-pointer self-start sm:self-end"
                  >
                    <span>
                      {locale === "en"
                        ? `See all (${sectionCounts[band.section]})`
                        : `Xem tất cả (${sectionCounts[band.section]})`}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 w-full min-w-0">
                  {bandItems.map((item) => (
                    <ActivityCard key={`band-${band.section}-${item.id}`} activity={item} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* Full Filterable Grid with Progressive Load More / Collapse */}
      <section id="activities-all-grid" className="space-y-4 w-full min-w-0 pt-2">
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200/70 pt-6">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900">
              {selectedSection === "explore"
                ? locale === "en"
                  ? "All Activities & Travel Services in Vietnam"
                  : "Tất cả Hoạt động & Dịch vụ Du lịch Việt Nam"
                : t(`activities.section.${selectedSection}` as Parameters<typeof t>[0])}
            </h2>
            <p className="text-sm font-semibold text-slate-600 mt-0.5" data-testid="activities-count">
              {t("activities.showingCount", {
                shown: visibleActivities.length,
                total: filtered.length,
              })}
            </p>
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              data-testid="activities-clear-filters"
              onClick={resetAll}
              className="text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl cursor-pointer transition-colors"
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
                : "Không tìm thấy hoạt động hoặc dịch vụ du lịch phù hợp."}
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
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full min-w-0">
              {visibleActivities.map((activity) => (
                <ActivityCard key={activity.id} activity={activity} />
              ))}
            </div>

            {filtered.length > INITIAL_VISIBLE_ACTIVITIES && (
              <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
                {remainingCount > 0 && (
                  <button
                    type="button"
                    data-testid="activities-load-more"
                    onClick={() =>
                      setPaginationState({
                        signature: filterSignature,
                        visibleCount: visibleCount + LOAD_MORE_STEP,
                      })
                    }
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-900 hover:bg-emerald-700 text-white text-sm font-bold shadow-sm cursor-pointer transition-colors"
                  >
                    <span>
                      {t("activities.loadMore", {
                        count: Math.min(LOAD_MORE_STEP, remainingCount),
                      })}
                    </span>
                    <ChevronDown className="w-4 h-4" />
                  </button>
                )}
                {visibleActivities.length > INITIAL_VISIBLE_ACTIVITIES && (
                  <button
                    type="button"
                    data-testid="activities-collapse"
                    onClick={() =>
                      setPaginationState({
                        signature: filterSignature,
                        visibleCount: INITIAL_VISIBLE_ACTIVITIES,
                      })
                    }
                    className="inline-flex items-center gap-1.5 px-5 py-3 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-sm font-bold cursor-pointer transition-colors"
                  >
                    <span>{t("activities.collapse")}</span>
                    <ChevronUp className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
