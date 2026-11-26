import { Suspense } from "react";
import type { ActivitiesCatalogResponse, DealsHub } from "@luxestay/contracts";
import {
  HomeThingsToDoTeaser,
  type ActivitiesLoadError,
} from "@/features/activities/HomeThingsToDoTeaser";
import { CatalogUrlSync } from "@/features/catalog/CatalogUrlSync";
import { CategoryBar } from "@/features/catalog/CategoryBar";
import { HeroSection } from "@/features/catalog/HeroSection";
import { PropertyList } from "@/features/catalog/PropertyList";
import { TestimonialsSection } from "@/features/catalog/TestimonialsSection";
import { TrendingDestinations } from "@/features/catalog/TrendingDestinations";
import {
  PromotionsHub,
  type DealsLoadError,
} from "@/features/promotions/PromotionsHub";
import { loadActivitiesCatalog } from "@/shared/ports/activitiesPort";
import { loadDealsHub } from "@/shared/ports/dealsPort";
import { HttpApiError } from "@/shared/ports/errors";

export default async function HomePage() {
  const nowIso = new Date().toISOString();
  let dealsHub: DealsHub | null = null;
  let dealsError: DealsLoadError | null = null;
  let activitiesCatalog: ActivitiesCatalogResponse | null = null;
  let activitiesError: ActivitiesLoadError | null = null;

  const [dealsResult, activitiesResult] = await Promise.allSettled([
    loadDealsHub(),
    loadActivitiesCatalog(),
  ]);

  if (dealsResult.status === "fulfilled") {
    dealsHub = dealsResult.value;
  } else {
    const err = dealsResult.reason;
    dealsError =
      err instanceof HttpApiError
        ? { code: err.code, message: err.message, requestId: err.requestId }
        : {
            code: "INTERNAL_ERROR",
            message: "Không thể tải danh sách ưu đãi lúc này. Vui lòng thử lại.",
          };
  }

  if (activitiesResult.status === "fulfilled") {
    activitiesCatalog = activitiesResult.value;
  } else {
    const err = activitiesResult.reason;
    activitiesError =
      err instanceof HttpApiError
        ? { code: err.code, message: err.message, requestId: err.requestId }
        : {
            code: "INTERNAL_ERROR",
            message: "Không thể tải danh sách hoạt động & vui chơi lúc này. Vui lòng thử lại.",
          };
  }

  return (
    <div className="flex flex-col min-h-screen w-full min-w-0">
      <Suspense fallback={null}>
        <CatalogUrlSync />
      </Suspense>

      {/* 1. Hero Section with dynamic Search Bar */}
      <HeroSection />

      {/* 2. 3-Tier Traveloka-inspired Promotions Hub */}
      <PromotionsHub initialDeals={dealsHub} error={dealsError} nowIso={nowIso} />

      {/* 3. Interactive Sticky Categories Bar */}
      <CategoryBar />

      {/* 4. Filterable Property Grid (Hotels & Homestays) */}
      <PropertyList />

      {/* 5. Trending Destinations */}
      <TrendingDestinations />

      {/* 6. Vietnam Things to Do & Travel Essentials Teaser (Phase 5B) */}
      <HomeThingsToDoTeaser initialCatalog={activitiesCatalog} error={activitiesError} />

      {/* 7. Customer Testimonials & Reviews */}
      <TestimonialsSection />
    </div>
  );
}
