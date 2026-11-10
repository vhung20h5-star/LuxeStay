"use client";

import React, { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  X,
  MapPin,
  Star,
  Heart,
  Share2,
  Sparkles,
  Check,
  Users,
  Bed,
  Bath,
  ArrowRight,
  MessageCircle,
} from "lucide-react";
import { useBooking } from "@/context/BookingContext";
import { formatVND } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

export function PropertyModal() {
  const {
    selectedProperty,
    setSelectedProperty,
    setCheckoutProperty,
    isFavorite,
    toggleFavorite,
  } = useBooking();

  const [activePhoto, setActivePhoto] = useState(0);
  const [nights, setNights] = useState(2);
  const [adults, setAdults] = useState(2);
  const [showShareToast, setShowShareToast] = useState(false);

  if (!selectedProperty) return null;

  const isFav = isFavorite(selectedProperty.id);
  const baseTotal = selectedProperty.pricePerNight * nights;
  const cleaningFee = 150000;
  const serviceDiscount = 100000;
  const grandTotal = baseTotal + cleaningFee - serviceDiscount;

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setShowShareToast(true);
      setTimeout(() => setShowShareToast(false), 2000);
    }
  };

  const handleProceedBooking = () => {
    const propToBook = { ...selectedProperty };
    setSelectedProperty(null);
    setCheckoutProperty(propToBook);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => setSelectedProperty(null)}
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-md"
      />

      {/* Modal Dialog */}
      <div className="min-h-full flex items-center justify-center p-3 sm:p-6 my-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-5xl bg-white rounded-3xl shadow-2xl overflow-hidden z-10 my-auto"
        >
          {/* Top Bar with actions */}
          <div className="sticky top-0 z-20 flex items-center justify-between p-4 sm:px-6 bg-white/95 backdrop-blur-md border-b border-slate-100">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <span className="uppercase text-emerald-700 tracking-wider">
                {selectedProperty.propertyType}
              </span>
              <span>•</span>
              <span>{selectedProperty.location.city}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleShare}
                className="p-2 rounded-full hover:bg-slate-100 text-slate-600 transition-colors relative"
                aria-label="Chia sẻ"
              >
                <Share2 className="w-5 h-5" />
                {showShareToast && (
                  <span className="absolute -bottom-8 right-0 bg-slate-900 text-white text-[10px] px-2 py-1 rounded-md whitespace-nowrap shadow-md">
                    Đã sao chép liên kết!
                  </span>
                )}
              </button>

              <button
                onClick={() => toggleFavorite(selectedProperty.id)}
                className="p-2 rounded-full hover:bg-rose-50 text-slate-600 transition-colors"
                aria-label="Lưu yêu thích"
              >
                <Heart
                  className={`w-5 h-5 ${
                    isFav ? "fill-rose-500 text-rose-500" : "text-slate-600"
                  }`}
                />
              </button>

              <button
                onClick={() => setSelectedProperty(null)}
                className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                aria-label="Đóng"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Modal Body */}
          <div className="p-4 sm:p-8 space-y-8 max-h-[82vh] overflow-y-auto">
            {/* Header Title & Rating */}
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                {selectedProperty.isSuperhost && (
                  <Badge variant="luxury">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600 fill-amber-500" /> Chủ nhà siêu cấp
                    (Superhost)
                  </Badge>
                )}
                {selectedProperty.freeCancellation && (
                  <Badge variant="success">Hủy miễn phí trước 48h</Badge>
                )}
                {selectedProperty.breakfastIncluded && (
                  <Badge variant="warning">Miễn phí bữa sáng</Badge>
                )}
              </div>

              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {selectedProperty.title}
              </h2>

              <div className="flex flex-wrap items-center gap-4 mt-2 text-xs sm:text-sm text-slate-600">
                <div className="flex items-center gap-1 font-bold text-slate-900">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  <span>{selectedProperty.rating}</span>
                  <span className="text-slate-400 font-normal">
                    ({selectedProperty.reviewCount} đánh giá xác thực)
                  </span>
                </div>
                <span>•</span>
                <div className="flex items-center gap-1 text-slate-600">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                  <span>{selectedProperty.location.address}, {selectedProperty.location.city}</span>
                </div>
                <span>•</span>
                <span className="text-emerald-700 font-medium">
                  {selectedProperty.location.distanceToCenter}
                </span>
              </div>
            </div>

            {/* Photo Gallery Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {/* Main large photo */}
              <div className="md:col-span-3 relative h-72 sm:h-96 rounded-2xl overflow-hidden shadow-sm">
                <Image
                  src={selectedProperty.images[activePhoto]}
                  alt={selectedProperty.title}
                  fill
                  className="object-cover"
                  priority
                />
              </div>

              {/* Thumbnails column */}
              <div className="grid grid-cols-3 md:grid-cols-1 gap-2.5">
                {selectedProperty.images.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActivePhoto(idx)}
                    className={`relative h-20 md:h-[7.2rem] rounded-xl overflow-hidden border-2 transition-all ${
                      idx === activePhoto
                        ? "border-emerald-600 scale-102 shadow-md"
                        : "border-transparent opacity-75 hover:opacity-100"
                    }`}
                  >
                    <Image src={img} alt="Thumb" fill className="object-cover" />
                  </button>
                ))}
              </div>
            </div>

            {/* Main Content Split: Details on Left, Booking Calculator on Right */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left Column (8 cols): Info, Amenities, Description, Reviews */}
              <div className="lg:col-span-7 space-y-8">
                {/* Host Card */}
                <div className="flex items-center justify-between p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-3.5">
                    <div className="relative">
                      <Image
                        src={selectedProperty.host.avatar}
                        alt={selectedProperty.host.name}
                        width={54}
                        height={54}
                        className="rounded-full object-cover border-2 border-emerald-500"
                      />
                      {selectedProperty.host.isSuperhost && (
                        <div className="absolute -bottom-1 -right-1 bg-amber-500 text-white rounded-full p-0.5">
                          <Sparkles className="w-3 h-3" />
                        </div>
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm sm:text-base">
                        Chủ nhà: {selectedProperty.host.name}
                      </h4>
                      <p className="text-xs text-slate-500">
                        {selectedProperty.host.joinedDate} • {selectedProperty.host.responseRate}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => alert(`Kết nối với chủ nhà ${selectedProperty.host.name}`)}
                    className="p-2.5 bg-white border border-slate-200 hover:border-emerald-500 rounded-xl text-slate-700 hover:text-emerald-700 transition-colors shadow-xs"
                    title="Nhắn tin cho chủ nhà"
                  >
                    <MessageCircle className="w-4 h-4" />
                  </button>
                </div>

                {/* Key Capacity Badges */}
                <div className="grid grid-cols-3 gap-3 p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100 text-center">
                  <div>
                    <Users className="w-5 h-5 mx-auto text-emerald-700 mb-1" />
                    <span className="block text-xs font-bold text-slate-800">
                      Tối đa {selectedProperty.maxGuests} khách
                    </span>
                    <span className="block text-[10px] text-slate-500">Thích hợp nhóm & gia đình</span>
                  </div>
                  <div>
                    <Bed className="w-5 h-5 mx-auto text-emerald-700 mb-1" />
                    <span className="block text-xs font-bold text-slate-800">
                      {selectedProperty.bedrooms} phòng ngủ ({selectedProperty.beds} giường)
                    </span>
                    <span className="block text-[10px] text-slate-500">Nệm cao cấp êm ái</span>
                  </div>
                  <div>
                    <Bath className="w-5 h-5 mx-auto text-emerald-700 mb-1" />
                    <span className="block text-xs font-bold text-slate-800">
                      {selectedProperty.bathrooms} phòng tắm riêng
                    </span>
                    <span className="block text-[10px] text-slate-500">Nước nóng 24/7</span>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">Về chỗ nghỉ này</h3>
                  <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-line">
                    {selectedProperty.description}
                  </p>
                </div>

                {/* Amenities List */}
                <div>
                  <h3 className="text-lg font-bold text-slate-900 mb-3">Tiện nghi nổi bật</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {selectedProperty.amenities.map((amenity, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs font-medium text-slate-700"
                      >
                        <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{amenity}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Customer Reviews */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-slate-900">
                      Đánh giá từ khách hàng ({selectedProperty.reviewCount})
                    </h3>
                    <div className="flex items-center gap-1 text-sm font-bold text-amber-600">
                      <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
                      <span>{selectedProperty.rating} / 5</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {selectedProperty.reviews.map((rev) => (
                      <div
                        key={rev.id}
                        className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <Image
                              src={rev.authorAvatar}
                              alt={rev.authorName}
                              width={36}
                              height={36}
                              className="rounded-full object-cover"
                            />
                            <div>
                              <div className="text-xs font-bold text-slate-900">
                                {rev.authorName}
                              </div>
                              <div className="text-[10px] text-slate-400">{rev.date}</div>
                            </div>
                          </div>
                          <div className="flex text-amber-400">
                            {[...Array(rev.rating)].map((_, i) => (
                              <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                            ))}
                          </div>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed italic">
                          &ldquo;{rev.comment}&rdquo;
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column (5 cols): Sticky Price Calculator & Booking Widget */}
              <div className="lg:col-span-5 sticky top-24">
                <div className="p-6 rounded-3xl bg-white border-2 border-slate-200 shadow-xl space-y-5">
                  {/* Price Header */}
                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="text-2xl font-black text-slate-900">
                        {formatVND(selectedProperty.pricePerNight)}
                      </span>
                      <span className="text-xs text-slate-500 font-normal"> /đêm</span>
                    </div>
                    {selectedProperty.originalPrice && (
                      <span className="text-xs text-slate-400 line-through">
                        {formatVND(selectedProperty.originalPrice)}
                      </span>
                    )}
                  </div>

                  {/* Booking Selector Inputs */}
                  <div className="rounded-2xl border border-slate-200 overflow-hidden divide-y divide-slate-200">
                    <div className="p-3 bg-slate-50 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Số đêm lưu trú
                        </span>
                        <span className="text-xs font-bold text-slate-800">
                          {nights} đêm nghỉ dưỡng
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setNights(Math.max(1, nights - 1))}
                          className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center font-bold text-slate-600 hover:bg-slate-100"
                        >
                          -
                        </button>
                        <span className="w-4 text-center text-xs font-bold">{nights}</span>
                        <button
                          type="button"
                          onClick={() => setNights(nights + 1)}
                          className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center font-bold text-slate-600 hover:bg-slate-100"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Số khách
                        </span>
                        <span className="text-xs font-bold text-slate-800">{adults} khách</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setAdults(Math.max(1, adults - 1))}
                          className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center font-bold text-slate-600 hover:bg-slate-100"
                        >
                          -
                        </button>
                        <span className="w-4 text-center text-xs font-bold">{adults}</span>
                        <button
                          type="button"
                          onClick={() => setAdults(Math.min(selectedProperty.maxGuests, adults + 1))}
                          className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center font-bold text-slate-600 hover:bg-slate-100"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Price Calculation Breakdown */}
                  <div className="space-y-2.5 text-xs text-slate-600">
                    <div className="flex justify-between">
                      <span>
                        {formatVND(selectedProperty.pricePerNight)} x {nights} đêm
                      </span>
                      <span className="font-semibold text-slate-800">{formatVND(baseTotal)}</span>
                    </div>

                    <div className="flex justify-between">
                      <span>Phí dọn dẹp & vệ sinh tiêu chuẩn</span>
                      <span className="font-semibold text-slate-800">{formatVND(cleaningFee)}</span>
                    </div>

                    <div className="flex justify-between text-emerald-700 font-semibold">
                      <span>Ưu đãi thành viên LuxeStay</span>
                      <span>-{formatVND(serviceDiscount)}</span>
                    </div>

                    <div className="pt-3 border-t border-slate-200 flex justify-between items-baseline text-sm">
                      <span className="font-bold text-slate-900">Tổng thanh toán</span>
                      <span className="text-xl font-black text-emerald-700">
                        {formatVND(grandTotal)}
                      </span>
                    </div>
                  </div>

                  {/* CTA */}
                  <Button
                    variant="primary"
                    size="lg"
                    className="w-full justify-center shadow-lg shadow-emerald-600/30 font-bold"
                    onClick={handleProceedBooking}
                  >
                    Tiến hành đặt phòng ngay
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>

                  <p className="text-[11px] text-center text-slate-400">
                    Bạn chưa bị trừ tiền ở bước này. Có thể hủy phòng miễn phí trước 48h.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
