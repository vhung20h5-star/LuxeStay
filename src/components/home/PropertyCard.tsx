"use client";

import React, { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  Heart,
  Star,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Sparkles,
  Check,
} from "lucide-react";
import { Property } from "@/types";
import { useBooking } from "@/context/BookingContext";
import { formatVND } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";

export interface PropertyCardProps {
  property: Property;
}

export function PropertyCard({ property }: PropertyCardProps) {
  const { isFavorite, toggleFavorite, setSelectedProperty, setCheckoutProperty } = useBooking();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const isFav = isFavorite(property.id);

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev + 1) % property.images.length);
  };

  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev - 1 + property.images.length) % property.images.length);
  };

  const discountPercent =
    property.originalPrice && property.originalPrice > property.pricePerNight
      ? Math.round(((property.originalPrice - property.pricePerNight) / property.originalPrice) * 100)
      : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.4 }}
      className="group relative flex flex-col bg-white rounded-3xl border border-slate-200/80 hover:border-emerald-300/80 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden cursor-pointer"
      onClick={() => setSelectedProperty(property)}
    >
      {/* Image Carousel Container */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100">
        <Image
          src={property.images[currentImageIndex]}
          alt={property.title}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover group-hover:scale-105 transition-transform duration-500"
          priority={false}
        />

        {/* Gradient Overlay at top for badge legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/30 pointer-events-none" />

        {/* Badges on Image */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 z-10 pointer-events-none">
          {property.isSuperhost && (
            <Badge variant="luxury" className="bg-white/90 backdrop-blur-md text-amber-900 border-none shadow-xs">
              <Sparkles className="w-3 h-3 text-amber-600 fill-amber-500" /> Superhost
            </Badge>
          )}
          {discountPercent > 0 && (
            <Badge className="bg-rose-600 text-white font-bold border-none shadow-xs">
              -{discountPercent}% Deal
            </Badge>
          )}
        </div>

        {/* Heart Wishlist Button */}
        <motion.button
          whileTap={{ scale: 0.8 }}
          onClick={(e) => {
            e.stopPropagation();
            toggleFavorite(property.id);
          }}
          className="absolute top-3 right-3 z-10 p-2.5 rounded-full bg-white/80 backdrop-blur-md text-slate-700 hover:bg-white shadow-sm transition-all"
          aria-label="Lưu vào danh sách yêu thích"
        >
          <motion.div
            animate={{ scale: isFav ? [1, 1.3, 1] : 1 }}
            transition={{ duration: 0.3 }}
          >
            <Heart
              className={`w-4 h-4 transition-colors ${
                isFav ? "fill-rose-500 text-rose-500" : "text-slate-700 hover:text-rose-500"
              }`}
            />
          </motion.div>
        </motion.button>

        {/* Carousel Prev/Next Buttons (Appear on hover) */}
        {property.images.length > 1 && (
          <div className="absolute inset-x-2 top-1/2 -translate-y-1/2 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
            <button
              onClick={prevImage}
              className="p-1.5 rounded-full bg-white/85 text-slate-800 hover:bg-white shadow-md hover:scale-110 transition-all"
              aria-label="Ảnh trước"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={nextImage}
              className="p-1.5 rounded-full bg-white/85 text-slate-800 hover:bg-white shadow-md hover:scale-110 transition-all"
              aria-label="Ảnh tiếp"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Dot Pagination Indicator */}
        {property.images.length > 1 && (
          <div className="absolute bottom-2.5 inset-x-0 flex items-center justify-center gap-1.5 z-10">
            {property.images.map((_, idx) => (
              <span
                key={idx}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  idx === currentImageIndex ? "w-5 bg-white shadow-sm" : "w-1.5 bg-white/60"
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Card Info Content */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Location & Rating */}
          <div className="flex items-center justify-between gap-2 text-xs mb-1.5">
            <div className="flex items-center gap-1 text-slate-500 font-medium truncate">
              <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="truncate">{property.location.city}, {property.location.province}</span>
            </div>
            <div className="flex items-center gap-1 font-bold text-slate-900 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200/60 shrink-0">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
              <span>{property.rating}</span>
              <span className="text-slate-400 font-normal text-[11px]">({property.reviewCount})</span>
            </div>
          </div>

          {/* Title */}
          <h3 className="font-bold text-base text-slate-900 group-hover:text-emerald-700 transition-colors line-clamp-1 leading-snug">
            {property.title}
          </h3>

          {/* Subtitle / Key Highlight */}
          <p className="text-xs text-slate-500 mt-1 line-clamp-1 leading-relaxed">
            {property.subtitle}
          </p>

          {/* Specs: Capacity & Bedrooms */}
          <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-400 font-medium">
            <span>Tối đa {property.maxGuests} khách</span>
            <span>•</span>
            <span>{property.bedrooms} phòng ngủ</span>
            <span>•</span>
            <span>{property.bathrooms} phòng tắm</span>
          </div>

          {/* Key tags (breakfast / free cancel) */}
          <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
            {property.freeCancellation && (
              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md flex items-center gap-1">
                <Check className="w-3 h-3 text-emerald-600" /> Hủy miễn phí
              </span>
            )}
            {property.breakfastIncluded && (
              <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
                Bao gồm bữa sáng
              </span>
            )}
          </div>
        </div>

        {/* Pricing & CTA */}
        <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-between">
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-black text-slate-900">
                {formatVND(property.pricePerNight)}
              </span>
              <span className="text-xs text-slate-500 font-normal">/đêm</span>
            </div>
            {property.originalPrice && (
              <span className="text-xs text-slate-400 line-through">
                {formatVND(property.originalPrice)}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setCheckoutProperty(property);
            }}
            className="px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors hover:scale-105"
          >
            Đặt ngay
          </button>
        </div>
      </div>
    </motion.div>
  );
}
