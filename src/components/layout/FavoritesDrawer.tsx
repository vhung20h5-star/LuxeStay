"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Heart, Trash2, ArrowRight } from "lucide-react";
import Image from "next/image";
import { useBooking } from "@/context/BookingContext";
import { PROPERTIES } from "@/data/properties";
import { formatVND } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

export function FavoritesDrawer() {
  const {
    favorites,
    toggleFavorite,
    favoritesDrawerOpen,
    setFavoritesDrawerOpen,
    setSelectedProperty,
  } = useBooking();

  const savedProperties = PROPERTIES.filter((p) => favorites.includes(p.id));

  return (
    <AnimatePresence>
      {favoritesDrawerOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setFavoritesDrawerOpen(false)}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
          />

          {/* Drawer Panel */}
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="w-screen max-w-md bg-white shadow-2xl flex flex-col"
            >
              {/* Header */}
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                    <Heart className="w-5 h-5 fill-rose-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Danh sách yêu thích</h3>
                    <p className="text-xs text-slate-500">
                      {savedProperties.length} chỗ nghỉ đã lưu
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setFavoritesDrawerOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {savedProperties.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center py-12 px-4">
                    <div className="w-16 h-16 rounded-full bg-rose-50 flex items-center justify-center text-rose-400 mb-4">
                      <Heart className="w-8 h-8" />
                    </div>
                    <h4 className="text-base font-bold text-slate-800">Chưa có chỗ nghỉ nào</h4>
                    <p className="text-xs text-slate-500 mt-1 max-w-xs mb-6">
                      Bấm vào biểu tượng trái tim ở bất kỳ khách sạn hoặc homestay nào để lưu lại danh sách chuyến đi của bạn.
                    </p>
                    <Button
                      variant="primary"
                      onClick={() => setFavoritesDrawerOpen(false)}
                    >
                      Khám phá ngay
                    </Button>
                  </div>
                ) : (
                  savedProperties.map((prop) => (
                    <motion.div
                      key={prop.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="group relative flex gap-3.5 p-3 rounded-2xl border border-slate-100 hover:border-emerald-200 hover:shadow-md transition-all bg-white"
                    >
                      {/* Thumbnail */}
                      <div className="relative w-24 h-24 rounded-xl overflow-hidden flex-shrink-0">
                        <Image
                          src={prop.images[0]}
                          alt={prop.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider">
                              {prop.location.city}
                            </span>
                            <button
                              onClick={() => toggleFavorite(prop.id)}
                              className="text-slate-300 hover:text-rose-600 p-1 transition-colors"
                              title="Xóa khỏi yêu thích"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <h5
                            onClick={() => {
                              setSelectedProperty(prop);
                              setFavoritesDrawerOpen(false);
                            }}
                            className="text-sm font-bold text-slate-900 truncate hover:text-emerald-700 cursor-pointer mt-0.5"
                          >
                            {prop.title}
                          </h5>
                          <p className="text-xs text-slate-500 truncate mt-0.5">
                            ★ {prop.rating} ({prop.reviewCount})
                          </p>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <span className="text-sm font-bold text-emerald-700">
                            {formatVND(prop.pricePerNight)}
                            <span className="text-[11px] font-normal text-slate-500">/đêm</span>
                          </span>
                          <button
                            onClick={() => {
                              setSelectedProperty(prop);
                              setFavoritesDrawerOpen(false);
                            }}
                            className="text-xs font-semibold text-emerald-600 hover:text-emerald-800 flex items-center gap-1"
                          >
                            Xem phòng
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>

              {/* Footer */}
              {savedProperties.length > 0 && (
                <div className="p-6 border-t border-slate-100 bg-slate-50 space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Tổng số chỗ nghỉ đã lưu:</span>
                    <span className="font-bold text-slate-800">{savedProperties.length}</span>
                  </div>
                  <Button
                    variant="primary"
                    className="w-full"
                    onClick={() => {
                      setSelectedProperty(savedProperties[0]);
                      setFavoritesDrawerOpen(false);
                    }}
                  >
                    Xem chi tiết chỗ nghỉ đầu tiên
                  </Button>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
