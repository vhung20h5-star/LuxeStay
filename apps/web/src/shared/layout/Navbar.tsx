"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  Compass,
  Heart,
  Globe,
  LogOut,
  Menu,
  X,
  Sparkles,
  User,
  ShieldCheck,
  Ticket,
} from "lucide-react";
import { isHostOrAdmin } from "@luxestay/domain";
import { useAuth } from "@/features/auth/AuthContext";
import { useFavorites } from "@/features/booking/BookingContext";
import { useLocale } from "@/features/locale/LocaleContext";
import { Button } from "@/shared/ui/Button";

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "LS";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, setAuthModalOpen, logout } = useAuth();
  const { favorites, setFavoritesDrawerOpen } = useFavorites();
  const { locale, currency, setLocale, setCurrency, t } = useLocale();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const isStaff = Boolean(user && isHostOrAdmin(user.role));

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 40);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    if (pathname !== "/") {
      router.push(`/#${id}`);
      return;
    }
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      setMobileMenuOpen(false);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <header
      className={`sticky top-0 z-40 w-full transition-all duration-300 print:hidden ${
        isScrolled
          ? "bg-white/85 backdrop-blur-md shadow-sm border-b border-slate-200/60 py-3"
          : "bg-white/95 backdrop-blur-sm border-b border-slate-100 py-4"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-3">
          {/* Logo */}
          <Link
            href="/"
            onClick={() => {
              if (pathname === "/") {
                window.scrollTo({ top: 0, behavior: "smooth" });
              }
            }}
            className="flex items-center gap-2.5 cursor-pointer group select-none shrink-0"
          >
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-emerald-400 flex items-center justify-center text-white shadow-md shadow-emerald-500/25 group-hover:scale-105 transition-transform">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-black tracking-tight text-slate-900 group-hover:text-emerald-700 transition-colors">
                Luxe<span className="text-emerald-600">Stay</span>
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-600 -mt-1">
                Hotels &amp; Homestays
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-1.5">
            <button
              onClick={() => scrollToSection("properties-section")}
              className="px-3 py-2 text-sm font-medium text-slate-600 hover:text-emerald-700 hover:bg-slate-50 rounded-xl transition-colors"
            >
              {t("nav.explore")}
            </button>
            <button
              onClick={() => scrollToSection("destinations-section")}
              className="px-3 py-2 text-sm font-medium text-slate-600 hover:text-emerald-700 hover:bg-slate-50 rounded-xl transition-colors"
            >
              {t("nav.destinations")}
            </button>
            <button
              onClick={() => scrollToSection("deals-section")}
              className="px-3 py-2 text-sm font-medium text-amber-700 hover:text-amber-800 hover:bg-amber-50/80 rounded-xl transition-colors flex items-center gap-1.5 font-semibold"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
              {t("nav.deals")}
            </button>
            <Link
              href="/bookings"
              className={`px-3 py-2 text-sm font-medium rounded-xl transition-colors flex items-center gap-1.5 ${
                pathname.startsWith("/bookings")
                  ? "text-emerald-700 bg-emerald-50 font-semibold"
                  : "text-slate-600 hover:text-emerald-700 hover:bg-slate-50"
              }`}
            >
              <Ticket className="w-4 h-4 text-emerald-600" />
              {user ? t("nav.myBookings") : t("nav.lookupBooking")}
            </Link>
            <Link
              href="/host"
              className={`px-3 py-2 text-sm font-medium rounded-xl transition-colors flex items-center gap-1.5 ${
                pathname.startsWith("/host")
                  ? "text-indigo-700 bg-indigo-50 font-semibold"
                  : isStaff
                    ? "text-indigo-700 hover:bg-indigo-50 font-semibold"
                    : "text-slate-600 hover:text-emerald-700 hover:bg-slate-50"
              }`}
            >
              <Building2 className="w-4 h-4 text-indigo-600" />
              {t("nav.hostPortal")}
            </Link>
          </nav>

          {/* Right Action Icons & Controls */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Interactive Currency & Language Switcher */}
            <div className="hidden lg:flex items-center gap-1 p-1 text-xs font-bold text-slate-600 bg-slate-100 rounded-full border border-slate-200/70">
              <button
                type="button"
                onClick={() => setCurrency(currency === "VND" ? "USD" : "VND")}
                data-testid="currency-toggle"
                aria-label="Chuyển đổi tiền tệ"
                className="px-2 py-1 rounded-full hover:bg-white hover:text-emerald-700 transition-colors"
              >
                {currency === "VND" ? "VNĐ" : "USD"}
              </button>
              <span className="text-slate-300">|</span>
              <button
                type="button"
                onClick={() => setLocale(locale === "vi" ? "en" : "vi")}
                data-testid="locale-toggle"
                aria-label="Chuyển đổi ngôn ngữ"
                className="inline-flex items-center gap-1 px-2 py-1 rounded-full hover:bg-white hover:text-emerald-700 transition-colors"
              >
                <Globe className="w-3.5 h-3.5 text-emerald-600" />
                <span>{locale === "vi" ? "VI" : "EN"}</span>
              </button>
            </div>

            {/* Wishlist Button with Badge */}
            <button
              onClick={() => setFavoritesDrawerOpen(true)}
              className="relative p-2.5 text-slate-700 hover:text-rose-600 hover:bg-rose-50/70 rounded-full transition-all duration-200"
              aria-label={t("nav.favorites")}
            >
              <Heart
                className={`w-5 h-5 ${favorites.length > 0 ? "fill-rose-500 text-rose-500" : ""}`}
              />
              {favorites.length > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-0.5 -right-0.5 min-w-5 h-5 px-1 bg-rose-500 text-white text-[11px] font-bold rounded-full flex items-center justify-center shadow-sm"
                >
                  {favorites.length}
                </motion.span>
              )}
            </button>

            {/* User Sign in / Authenticated Profile */}
            {user ? (
              <div className="hidden sm:flex items-center gap-2 pl-2 pr-2 py-1 rounded-full border border-emerald-200 bg-emerald-50/60">
                <Link
                  href={isStaff ? "/host" : "/bookings"}
                  className="flex items-center gap-2 pr-1 text-left group"
                  title={`${user.fullName} (${user.email})`}
                >
                  <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-[11px]">
                    {getInitials(user.fullName)}
                  </div>
                  <div className="leading-tight">
                    <span className="block text-xs font-bold text-slate-800 max-w-24 truncate group-hover:text-emerald-700">
                      {user.fullName}
                    </span>
                    {isStaff && (
                      <span className="block text-[9px] font-extrabold uppercase text-indigo-700">
                        {user.role}
                      </span>
                    )}
                  </div>
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="p-1.5 rounded-full text-slate-500 hover:text-rose-600 hover:bg-white transition-colors"
                  title={t("nav.logout")}
                  aria-label={t("nav.logout")}
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setAuthModalOpen(true)}
                className="hidden sm:flex items-center gap-2.5 pl-2 pr-3.5 py-1.5 rounded-full border border-slate-200 hover:border-emerald-500 bg-white shadow-sm hover:shadow transition-all group"
              >
                <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                  <User className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-slate-700 group-hover:text-emerald-700">
                  {t("nav.login")}
                </span>
              </button>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
              aria-label="Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-slate-100 bg-white/95 backdrop-blur-md px-4 py-4 space-y-2"
          >
            {user && (
              <div className="px-4 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-900 truncate">{user.fullName}</div>
                  <div className="text-[11px] text-slate-500 truncate">
                    {user.email} • {user.role}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="text-xs font-bold text-rose-600 hover:text-rose-700 px-2 py-1"
                >
                  {t("nav.logout")}
                </button>
              </div>
            )}

            {/* Mobile Locale & Currency Switcher */}
            <div className="flex items-center gap-2 px-2 py-1">
              <button
                type="button"
                onClick={() => setCurrency(currency === "VND" ? "USD" : "VND")}
                className="flex-1 py-2 rounded-xl bg-slate-100 text-xs font-bold text-slate-700"
              >
                {currency === "VND" ? "Tiền tệ: VNĐ" : "Currency: USD"}
              </button>
              <button
                type="button"
                onClick={() => setLocale(locale === "vi" ? "en" : "vi")}
                className="flex-1 py-2 rounded-xl bg-slate-100 text-xs font-bold text-slate-700"
              >
                {locale === "vi" ? "Ngôn ngữ: Tiếng Việt" : "Language: English"}
              </button>
            </div>

            <button
              onClick={() => scrollToSection("properties-section")}
              className="w-full text-left px-4 py-2.5 rounded-xl text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 font-medium text-sm flex items-center justify-between"
            >
              <span>{t("nav.explore")}</span>
              <Compass className="w-4 h-4 text-emerald-600" />
            </button>
            <button
              onClick={() => scrollToSection("destinations-section")}
              className="w-full text-left px-4 py-2.5 rounded-xl text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 font-medium text-sm flex items-center justify-between"
            >
              <span>{t("nav.destinations")}</span>
              <Globe className="w-4 h-4 text-emerald-600" />
            </button>
            <Link
              href="/bookings"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-left px-4 py-2.5 rounded-xl text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 font-medium text-sm flex items-center justify-between"
            >
              <span>{user ? t("nav.myBookings") : t("nav.lookupBooking")}</span>
              <Ticket className="w-4 h-4 text-emerald-600" />
            </Link>
            <Link
              href="/host"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-left px-4 py-2.5 rounded-xl text-indigo-700 bg-indigo-50/60 hover:bg-indigo-100/70 font-semibold text-sm flex items-center justify-between"
            >
              <span>{t("nav.hostPortal")}</span>
              <Building2 className="w-4 h-4 text-indigo-600" />
            </Link>
            <button
              onClick={() => scrollToSection("testimonials-section")}
              className="w-full text-left px-4 py-2.5 rounded-xl text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 font-medium text-sm flex items-center justify-between"
            >
              <span>Đánh giá khách hàng</span>
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
            </button>
            <div className="pt-2 border-t border-slate-100 flex gap-2">
              <Button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setFavoritesDrawerOpen(true);
                }}
                variant="outline"
                className="flex-1"
              >
                <Heart className="w-4 h-4 text-rose-500 mr-2" />
                {t("nav.favorites")} ({favorites.length})
              </Button>
              {!user && (
                <Button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setAuthModalOpen(true);
                  }}
                  variant="primary"
                  className="flex-1"
                >
                  {t("nav.login")}
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
