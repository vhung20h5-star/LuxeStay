import React from "react";
import { AuthProvider } from "@/features/auth/AuthContext";
import { AuthModal } from "@/features/auth/AuthModal";
import { BookingProvider } from "@/features/booking/BookingContext";
import { BookingCheckoutModal } from "@/features/booking/BookingCheckoutModal";
import { BookingSuccessModal } from "@/features/booking/BookingSuccessModal";
import { FilterModal } from "@/features/catalog/FilterModal";
import { FavoritesDrawer } from "@/features/favorites/FavoritesDrawer";
import { LocaleProvider } from "@/features/locale/LocaleContext";
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
    <LocaleProvider>
      <AuthProvider dataMode={dataMode} apiBaseUrl={publicApiBaseUrl}>
        <BookingProvider
          initialCatalog={catalog}
          dataMode={dataMode}
          apiBaseUrl={publicApiBaseUrl}
        >
          <Navbar />
          <main className="flex-1 w-full min-w-0">{children}</main>
          <Footer />

          {/* Global Modals & Drawers */}
          <AuthModal />
          <FavoritesDrawer />
          <FilterModal />
          <PropertyModal />
          <BookingCheckoutModal />
          <BookingSuccessModal />
        </BookingProvider>
      </AuthProvider>
    </LocaleProvider>
  );
}
