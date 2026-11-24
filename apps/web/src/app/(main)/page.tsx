import { Suspense } from "react";
import { CatalogUrlSync } from "@/features/catalog/CatalogUrlSync";
import { CategoryBar } from "@/features/catalog/CategoryBar";
import { HeroSection } from "@/features/catalog/HeroSection";
import { PromotionBanner } from "@/features/catalog/PromotionBanner";
import { PropertyList } from "@/features/catalog/PropertyList";
import { TestimonialsSection } from "@/features/catalog/TestimonialsSection";
import { TrendingDestinations } from "@/features/catalog/TrendingDestinations";

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Suspense fallback={null}>
        <CatalogUrlSync />
      </Suspense>

      {/* 1. Hero Section with dynamic Search Bar */}
      <HeroSection />

      {/* 2. Interactive Sticky Categories Bar */}
      <CategoryBar />

      {/* 3. Filterable Property Grid (Hotels & Homestays) */}
      <PropertyList />

      {/* 4. Flash Sale Promotion Banner with Countdown */}
      <PromotionBanner />

      {/* 5. Trending Destinations */}
      <TrendingDestinations />

      {/* 6. Customer Testimonials & Reviews */}
      <TestimonialsSection />
    </div>
  );
}
