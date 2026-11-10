import type { Metadata } from "next";
import "./globals.css";
import { BookingProvider } from "@/context/BookingContext";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { FavoritesDrawer } from "@/components/layout/FavoritesDrawer";
import { FilterModal } from "@/components/home/FilterModal";
import { PropertyModal } from "@/components/property/PropertyModal";
import { BookingCheckoutModal } from "@/components/booking/BookingCheckoutModal";
import { BookingSuccessModal } from "@/components/booking/BookingSuccessModal";

export const metadata: Metadata = {
  title: "LuxeStay - Đặt Phòng Khách Sạn & Homestay Du Lịch Đẳng Cấp",
  description:
    "Khám phá và đặt phòng khách sạn 5 sao, resort ven biển, villa và homestay phong cách vintage tuyệt đẹp tại Đà Lạt, Phú Quốc, Sa Pa, Đà Nẵng, Hội An, Ninh Bình.",
  keywords: [
    "đặt phòng khách sạn",
    "homestay đà lạt",
    "resort phú quốc",
    "villa nghỉ dưỡng",
    "du lịch việt nam",
    "booking homestay",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className="h-full antialiased scroll-smooth">
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 font-sans">
        <BookingProvider>
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
      </body>
    </html>
  );
}
