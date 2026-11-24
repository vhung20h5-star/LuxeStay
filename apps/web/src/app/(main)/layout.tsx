import React from "react";
import { BookingProvider } from "@/features/booking/BookingContext";
import { BookingCheckoutModal } from "@/features/booking/BookingCheckoutModal";
import { BookingSuccessModal } from "@/features/booking/BookingSuccessModal";
import { FilterModal } from "@/features/catalog/FilterModal";
import { FavoritesDrawer } from "@/features/favorites/FavoritesDrawer";
import { PropertyModal } from "@/features/property/PropertyModal";
import { Footer } from "@/shared/layout/Footer";
import { Navbar } from "@/shared/layout/Navbar";
import { loadInitialCatalog } from "@/shared/ports/catalogPort";

export const dynamic = "force-dynamic";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { catalog, dataMode, publicApiBaseUrl } = await loadInitialCatalog();

  return (
    <BookingProvider
      initialCatalog={catalog}
      dataMode={dataMode}
      apiBaseUrl={publicApiBaseUrl}
    >
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />

      {/* Global Modals & Drawers */}
      <FavoritesDrawer />
      <FilterModal />
      <PropertyModal />
      <BookingCheckoutModal />
      <BookingSuccessModal />
    </BookingProvider>
  );
}
