"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Compass,
  Heart,
  Globe,
  Menu,
  X,
  Sparkles,
  User,
  ShieldCheck,
} from "lucide-react";
import { useBooking } from "@/context/BookingContext";
import { Button } from "@/components/ui/Button";

export function Navbar() {
  const { favorites, setFavoritesDrawerOpen } = useBooking();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 40);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <>
      <header
        className={`sticky top-0 z-40 w-full transition-all duration-300 ${
          isScrolled
            ? "bg-white/85 backdrop-blur-md shadow-sm border-b border-slate-200/60 py-3"
            : "bg-white/95 backdrop-blur-sm border-b border-slate-100 py-4"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4">
            {/* Logo */}
            <div
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="flex items-center gap-2.5 cursor-pointer group select-none"
            >
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-emerald-400 flex items-center justify-center text-white shadow-md shadow-emerald-500/25 group-hover:scale-105 transition-transform">
                <Sparkles className="w-5 h-5 animate-pulse" />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-black tracking-tight text-slate-900 group-hover:text-emerald-700 transition-colors">
                  Luxe<span className="text-emerald-600">Stay</span>
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-600 -mt-1">
                  Khách sạn & Homestay
                </span>
              </div>
            </div>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1 lg:gap-2">
              <button
                onClick={() => scrollToSection("properties-section")}
                className="px-3.5 py-2 text-sm font-medium text-slate-600 hover:text-emerald-700 hover:bg-slate-50 rounded-xl transition-colors"
              >
                Khám phá chỗ nghỉ
              </button>
              <button
                onClick={() => scrollToSection("destinations-section")}
                className="px-3.5 py-2 text-sm font-medium text-slate-600 hover:text-emerald-700 hover:bg-slate-50 rounded-xl transition-colors"
              >
                Điểm đến hot
              </button>
              <button
                onClick={() => scrollToSection("deals-section")}
                className="px-3.5 py-2 text-sm font-medium text-amber-700 hover:text-amber-800 hover:bg-amber-50/80 rounded-xl transition-colors flex items-center gap-1.5 font-semibold"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                </span>
                Flash Deals
              </button>
              <button
                onClick={() => scrollToSection("testimonials-section")}
                className="px-3.5 py-2 text-sm font-medium text-slate-600 hover:text-emerald-700 hover:bg-slate-50 rounded-xl transition-colors"
              >
                Đánh giá khách hàng
              </button>
            </nav>

            {/* Right Action Icons & Controls */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Currency & Language */}
              <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200/70 rounded-full transition-colors cursor-pointer">
                <Globe className="w-3.5 h-3.5 text-emerald-600" />
                <span>VNĐ • Tiếng Việt</span>
              </div>

              {/* Wishlist Button with Badge */}
              <button
                onClick={() => setFavoritesDrawerOpen(true)}
                className="relative p-2.5 text-slate-700 hover:text-rose-600 hover:bg-rose-50/70 rounded-full transition-all duration-200"
                aria-label="Danh sách yêu thích"
              >
                <Heart className={`w-5 h-5 ${favorites.length > 0 ? "fill-rose-500 text-rose-500" : ""}`} />
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

              {/* User Sign in button */}
              <button
                onClick={() => setAuthModalOpen(true)}
                className="hidden sm:flex items-center gap-2.5 pl-2 pr-3.5 py-1.5 rounded-full border border-slate-200 hover:border-emerald-500 bg-white shadow-sm hover:shadow transition-all group"
              >
                <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                  <User className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-slate-700 group-hover:text-emerald-700">
                  Tài khoản
                </span>
              </button>

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
              <button
                onClick={() => scrollToSection("properties-section")}
                className="w-full text-left px-4 py-2.5 rounded-xl text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 font-medium text-sm flex items-center justify-between"
              >
                <span>Khám phá chỗ nghỉ</span>
                <Compass className="w-4 h-4 text-emerald-600" />
              </button>
              <button
                onClick={() => scrollToSection("destinations-section")}
                className="w-full text-left px-4 py-2.5 rounded-xl text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 font-medium text-sm flex items-center justify-between"
              >
                <span>Điểm đến thịnh hành</span>
                <Globe className="w-4 h-4 text-emerald-600" />
              </button>
              <button
                onClick={() => scrollToSection("deals-section")}
                className="w-full text-left px-4 py-2.5 rounded-xl text-amber-700 bg-amber-50/60 font-semibold text-sm flex items-center justify-between"
              >
                <span>Ưu đãi Flash Sale</span>
                <Sparkles className="w-4 h-4 text-amber-600" />
              </button>
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
                  Yêu thích ({favorites.length})
                </Button>
                <Button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setAuthModalOpen(true);
                  }}
                  variant="primary"
                  className="flex-1"
                >
                  Đăng nhập
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Simple Demo Auth Dialog */}
      <AnimatePresence>
        {authModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setAuthModalOpen(false)}
              className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl z-10 text-center"
            >
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Chào mừng đến với LuxeStay</h3>
              <p className="text-xs text-slate-500 mt-1 mb-6">
                Đăng nhập để nhận ưu đãi thành viên giảm tới 25% cho chuyến đi tiếp theo
              </p>
              <div className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-center"
                  onClick={() => setAuthModalOpen(false)}
                >
                  Tiếp tục với Google
                </Button>
                <Button
                  variant="primary"
                  className="w-full justify-center"
                  onClick={() => setAuthModalOpen(false)}
                >
                  Tiếp tục với Số điện thoại
                </Button>
              </div>
              <button
                onClick={() => setAuthModalOpen(false)}
                className="mt-4 text-xs font-medium text-slate-400 hover:text-slate-600"
              >
                Để sau, xem phòng trước
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
