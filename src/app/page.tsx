import { HeroSection } from "@/components/home/HeroSection";
import { CategoryBar } from "@/components/home/CategoryBar";
import { PropertyList } from "@/components/home/PropertyList";
import { TrendingDestinations } from "@/components/home/TrendingDestinations";
import { PromotionBanner } from "@/components/home/PromotionBanner";
import { TestimonialsSection } from "@/components/home/TestimonialsSection";

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
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
