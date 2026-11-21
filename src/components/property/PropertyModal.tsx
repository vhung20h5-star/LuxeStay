"use client";

import React, { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Bath,
  Bed,
  Check,
  ChevronRight,
  Heart,
  LayoutGrid,
  MapPin,
  MessageCircle,
  Share2,
  Sparkles,
  Star,
  Users,
  X,
} from "lucide-react";
import type { AmenityCategoryId, BookingQuote } from "@/types";
import { useBooking } from "@/context/BookingContext";
import { useOverlayLayer } from "@/context/OverlayContext";
import {
  describeAmenityPricing,
  describeSelectedAmenity,
  formatAmenitiesFeeSummary,
  projectPropertyAmenities,
} from "@/lib/amenities";
import { formatVND } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { AmenityIcon } from "./AmenityIcon";
import { PropertyAmenitiesModal } from "./PropertyAmenitiesModal";

interface AmenitiesModalState {
  isOpen: boolean;
  initialAmenityId: string | null;
  initialCategory: AmenityCategoryId | "all";
}

function PropertyModalContent({ quote }: { quote: BookingQuote }) {
  const {
    setSelectedProperty,
    proceedToCheckout,
    isFavorite,
    toggleFavorite,
    setDraftNights,
    setDraftAdults,
    toggleBookingAmenity,
    removeBookingAmenity,
  } = useBooking();

  const { property, selectedAmenities, selectedAmenityIds, pricing, nights, guests } = quote;

  const [activePhoto, setActivePhoto] = useState(0);
  const [showShareToast, setShowShareToast] = useState(false);
  const [amenitiesModal, setAmenitiesModal] = useState<AmenitiesModalState>({
    isOpen: false,
    initialAmenityId: null,
    initialCategory: "all",
  });

  const overlayLayer = useOverlayLayer({
    id: "property-modal",
    kind: "property-modal",
    isOpen: true,
    onClose: () => setSelectedProperty(null),
  });

  const {
    totalCount: amenityCount,
    categories: categorySummaries,
    featured: featuredAmenities,
  } = projectPropertyAmenities(property);

  const isFav = isFavorite(property.id);

  const openAmenitiesModal = (opts?: {
    initialAmenityId?: string | null;
    initialCategory?: AmenityCategoryId | "all";
  }) => {
    setAmenitiesModal({
      isOpen: true,
      initialAmenityId: opts?.initialAmenityId ?? null,
      initialCategory: opts?.initialCategory ?? "all",
    });
  };

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setShowShareToast(true);
      setTimeout(() => setShowShareToast(false), 2000);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 overflow-y-auto"
        style={{ zIndex: overlayLayer.zIndex }}
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setSelectedProperty(null)}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-md"
          aria-hidden="true"
        />

        {/* Modal Dialog */}
        <div className="min-h-full flex items-center justify-center p-3 sm:p-6 my-4">
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={property.title}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-5xl bg-white rounded-3xl shadow-2xl overflow-hidden z-10 my-auto"
          >
            {/* Top Bar with actions */}
            <div className="sticky top-0 z-20 flex items-center justify-between p-4 sm:px-6 bg-white/95 backdrop-blur-md border-b border-slate-100">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                <span className="uppercase text-emerald-700 tracking-wider">
                  {property.propertyType}
                </span>
                <span>•</span>
                <span>{property.location.city}</span>
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
                  onClick={() => toggleFavorite(property.id)}
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
                  {property.isSuperhost && (
                    <Badge variant="luxury">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600 fill-amber-500" /> Chủ nhà siêu cấp
                      (Superhost)
                    </Badge>
                  )}
                  {property.freeCancellation && (
                    <Badge variant="success">Hủy miễn phí trước 48h</Badge>
                  )}
                  {property.breakfastIncluded && (
                    <Badge variant="warning">Miễn phí bữa sáng</Badge>
                  )}
                </div>

                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  {property.title}
                </h2>

                <div className="flex flex-wrap items-center gap-4 mt-2 text-xs sm:text-sm text-slate-600">
                  <div className="flex items-center gap-1 font-bold text-slate-900">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                    <span>{property.rating}</span>
                    <span className="text-slate-400 font-normal">
                      ({property.reviewCount} đánh giá xác thực)
                    </span>
                  </div>
                  <span>•</span>
                  <div className="flex items-center gap-1 text-slate-600">
                    <MapPin className="w-4 h-4 text-emerald-600" />
                    <span>
                      {property.location.address}, {property.location.city}
                    </span>
                  </div>
                  <span>•</span>
                  <span className="text-emerald-700 font-medium">
                    {property.location.distanceToCenter}
                  </span>
                </div>
              </div>

              {/* Photo Gallery Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                {/* Main large photo */}
                <div className="md:col-span-3 relative h-72 sm:h-96 rounded-2xl overflow-hidden shadow-sm">
                  <Image
                    src={property.images[activePhoto]}
                    alt={property.title}
                    fill
                    className="object-cover"
                    priority
                  />
                </div>

                {/* Thumbnails column */}
                <div className="grid grid-cols-3 md:grid-cols-1 gap-2.5">
                  {property.images.map((img, idx) => (
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
                {/* Left Column (7 cols): Info, Amenities, Description, Reviews */}
                <div className="lg:col-span-7 space-y-8">
                  {/* Host Card */}
                  <div className="flex items-center justify-between p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-3.5">
                      <div className="relative">
                        <Image
                          src={property.host.avatar}
                          alt={property.host.name}
                          width={54}
                          height={54}
                          className="rounded-full object-cover border-2 border-emerald-500"
                        />
                        {property.host.isSuperhost && (
                          <div className="absolute -bottom-1 -right-1 bg-amber-500 text-white rounded-full p-0.5">
                            <Sparkles className="w-3 h-3" />
                          </div>
                        )}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm sm:text-base">
                          Chủ nhà: {property.host.name}
                        </h4>
                        <p className="text-xs text-slate-500">
                          {property.host.joinedDate} • {property.host.responseRate}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => alert(`Kết nối với chủ nhà ${property.host.name}`)}
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
                        Tối đa {property.maxGuests} khách
                      </span>
                      <span className="block text-[10px] text-slate-500">
                        Thích hợp nhóm &amp; gia đình
                      </span>
                    </div>
                    <div>
                      <Bed className="w-5 h-5 mx-auto text-emerald-700 mb-1" />
                      <span className="block text-xs font-bold text-slate-800">
                        {property.bedrooms} phòng ngủ ({property.beds} giường)
                      </span>
                      <span className="block text-[10px] text-slate-500">Nệm cao cấp êm ái</span>
                    </div>
                    <div>
                      <Bath className="w-5 h-5 mx-auto text-emerald-700 mb-1" />
                      <span className="block text-xs font-bold text-slate-800">
                        {property.bathrooms} phòng tắm riêng
                      </span>
                      <span className="block text-[10px] text-slate-500">Nước nóng 24/7</span>
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2">Về chỗ nghỉ này</h3>
                    <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-line">
                      {property.description}
                    </p>
                  </div>

                  {/* Interactive Resort Amenities & Services Section */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <h3 className="text-lg font-bold text-slate-900">
                          Tiện ích &amp; dịch vụ tại chỗ nghỉ
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Bấm vào từng tiện ích hoặc danh mục để xem giờ mở cửa, vị trí, chi phí &amp; đăng ký kèm phòng
                        </p>
                      </div>
                      <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-full shrink-0">
                        {amenityCount} tiện ích
                      </span>
                    </div>

                    {/* Clickable Category Overview Pills */}
                    <div className="flex flex-wrap gap-1.5">
                      {categorySummaries.map(({ category, count }) => (
                        <button
                          key={category.id}
                          type="button"
                          onClick={() =>
                            openAmenitiesModal({
                              initialCategory: category.id,
                              initialAmenityId: null,
                            })
                          }
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200 hover:border-emerald-300 transition-colors"
                        >
                          <AmenityIcon
                            name={category.iconName}
                            className="w-3.5 h-3.5 text-emerald-600"
                          />
                          <span>{category.shortLabel}</span>
                          <span className="text-[10px] font-bold text-slate-400">({count})</span>
                        </button>
                      ))}
                    </div>

                    {/* 6 Clickable Featured Highlights */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {featuredAmenities.map((item) => {
                        const isItemSelected = selectedAmenityIds.includes(item.id);
                        const pricingDesc = describeAmenityPricing(item);
                        const badgeToneClass =
                          pricingDesc.tone === "paid"
                            ? "font-bold text-amber-700"
                            : pricingDesc.tone === "free-reservation"
                              ? "font-semibold text-teal-700"
                              : "font-semibold text-slate-500";
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() =>
                              openAmenitiesModal({
                                initialAmenityId: item.id,
                                initialCategory: "all",
                              })
                            }
                            className={`text-left flex items-center gap-3 p-3 rounded-2xl border transition-all group ${
                              isItemSelected
                                ? "bg-emerald-50/70 border-emerald-400 shadow-xs"
                                : "bg-slate-50/80 border-slate-100 hover:border-emerald-300 hover:bg-white hover:shadow-xs"
                            }`}
                          >
                            <div
                              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                                isItemSelected
                                  ? "bg-emerald-600 text-white"
                                  : "bg-white text-emerald-700 border border-slate-200/70 group-hover:border-emerald-200"
                              }`}
                            >
                              <AmenityIcon name={item.iconName} className="w-4 h-4" />
                            </div>

                            <div className="flex-1 min-w-0">
                              <span className="block text-xs font-bold text-slate-800 group-hover:text-emerald-800 line-clamp-1">
                                {item.name}
                              </span>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                {isItemSelected ? (
                                  <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700">
                                    <Check className="w-3 h-3" /> Đã chọn
                                  </span>
                                ) : (
                                  <span className={`text-[10px] ${badgeToneClass}`}>
                                    {pricingDesc.compactBadge}
                                  </span>
                                )}
                              </div>
                            </div>

                            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all shrink-0" />
                          </button>
                        );
                      })}
                    </div>

                    {/* Prominent View All Amenities CTA */}
                    <Button
                      type="button"
                      variant="outline"
                      size="md"
                      onClick={() => openAmenitiesModal()}
                      className="w-full justify-center font-bold border-slate-300 hover:border-emerald-600"
                    >
                      <LayoutGrid className="w-4 h-4 text-emerald-600" />
                      <span>Xem tất cả {amenityCount} tiện ích &amp; dịch vụ</span>
                      {selectedAmenities.length > 0 && (
                        <span className="ml-1 text-[11px] font-bold bg-emerald-600 text-white px-2 py-0.5 rounded-full">
                          {selectedAmenities.length} đã chọn
                        </span>
                      )}
                    </Button>
                  </div>

                  {/* Customer Reviews */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-slate-900">
                        Đánh giá từ khách hàng ({property.reviewCount})
                      </h3>
                      <div className="flex items-center gap-1 text-sm font-bold text-amber-600">
                        <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
                        <span>{property.rating} / 5</span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {property.reviews.map((rev) => (
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
                                <Star
                                  key={i}
                                  className="w-3.5 h-3.5 fill-amber-400 text-amber-400"
                                />
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
                          {formatVND(property.pricePerNight)}
                        </span>
                        <span className="text-xs text-slate-500 font-normal"> /đêm</span>
                      </div>
                      {property.originalPrice && (
                        <span className="text-xs text-slate-400 line-through">
                          {formatVND(property.originalPrice)}
                        </span>
                      )}
                    </div>

                    {/* Booking Selector Inputs */}
                    <div className="rounded-2xl border border-slate-200 overflow-hidden divide-y divide-slate-200">
                      <div className="p-3 bg-slate-50 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            Số đêm lưu trú ({quote.checkIn} → {quote.checkOut})
                          </span>
                          <span className="text-xs font-bold text-slate-800">
                            {nights} đêm nghỉ dưỡng
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setDraftNights(nights - 1)}
                            disabled={nights <= 1}
                            aria-label="Giảm số đêm"
                            className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            -
                          </button>
                          <span className="w-4 text-center text-xs font-bold">{nights}</span>
                          <button
                            type="button"
                            onClick={() => setDraftNights(nights + 1)}
                            disabled={nights >= 30}
                            aria-label="Tăng số đêm"
                            className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
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
                          <span className="text-xs font-bold text-slate-800">
                            {guests.adults} người lớn
                            {guests.children > 0 ? `, ${guests.children} trẻ em` : ""}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setDraftAdults(guests.adults - 1)}
                            disabled={guests.adults <= 1}
                            aria-label="Giảm số khách"
                            className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            -
                          </button>
                          <span className="w-4 text-center text-xs font-bold">{guests.adults}</span>
                          <button
                            type="button"
                            onClick={() => setDraftAdults(guests.adults + 1)}
                            disabled={guests.adults >= property.maxGuests}
                            aria-label="Tăng số khách"
                            className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Selected Add-on Services Summary */}
                    {selectedAmenities.length > 0 && (
                      <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-800">
                            Dịch vụ đi kèm đã chọn ({selectedAmenities.length})
                          </span>
                          <button
                            type="button"
                            onClick={() => openAmenitiesModal()}
                            className="text-[11px] font-bold text-emerald-700 hover:underline"
                          >
                            Chỉnh sửa
                          </button>
                        </div>

                        <div className="space-y-1.5">
                          {selectedAmenities.map((item) => {
                            const display = describeSelectedAmenity(item);
                            return (
                              <div
                                key={item.id}
                                className="flex items-center justify-between gap-2 text-xs bg-white/90 px-2.5 py-1.5 rounded-xl border border-emerald-100"
                              >
                                <span className="font-medium text-slate-800 truncate">
                                  {item.name}
                                </span>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span
                                    className={`font-bold text-[11px] ${
                                      display.tone === "paid" ? "text-amber-700" : "text-teal-700"
                                    }`}
                                  >
                                    {display.compactFee}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => removeBookingAmenity(item.id)}
                                    className="p-0.5 rounded-full text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                    aria-label={`Gỡ ${item.name}`}
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Price Calculation Breakdown */}
                    <div className="space-y-2.5 text-xs text-slate-600">
                      <div className="flex justify-between">
                        <span>
                          {formatVND(property.pricePerNight)} x {nights} đêm
                        </span>
                        <span className="font-semibold text-slate-800">
                          {formatVND(pricing.nightsTotal)}
                        </span>
                      </div>

                      <div className="flex justify-between">
                        <span>Phí dọn dẹp &amp; vệ sinh tiêu chuẩn</span>
                        <span className="font-semibold text-slate-800">
                          {formatVND(pricing.cleaningFee)}
                        </span>
                      </div>

                      {selectedAmenities.length > 0 && (
                        <div className="flex justify-between">
                          <span>Dịch vụ &amp; tiện ích đi kèm ({selectedAmenities.length})</span>
                          <span className="font-semibold text-slate-800">
                            {formatAmenitiesFeeSummary(pricing.amenitiesFee)}
                          </span>
                        </div>
                      )}

                      <div className="flex justify-between text-emerald-700 font-semibold">
                        <span>Ưu đãi thành viên LuxeStay</span>
                        <span>-{formatVND(pricing.discount)}</span>
                      </div>

                      <div className="pt-3 border-t border-slate-200 flex justify-between items-baseline text-sm">
                        <span className="font-bold text-slate-900">Tổng thanh toán</span>
                        <span className="text-xl font-black text-emerald-700">
                          {formatVND(pricing.total)}
                        </span>
                      </div>
                    </div>

                    {/* CTA */}
                    <Button
                      variant="primary"
                      size="lg"
                      className="w-full justify-center shadow-lg shadow-emerald-600/30 font-bold"
                      onClick={proceedToCheckout}
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

      {/* Stacked All-Amenities Master-Detail Modal (managed by OverlayStack tier 1) */}
      <PropertyAmenitiesModal
        isOpen={amenitiesModal.isOpen}
        property={property}
        initialAmenityId={amenitiesModal.initialAmenityId}
        initialCategory={amenitiesModal.initialCategory}
        selectedAmenities={selectedAmenities}
        onToggleAmenity={toggleBookingAmenity}
        onClose={() =>
          setAmenitiesModal((prev) => ({
            ...prev,
            isOpen: false,
          }))
        }
      />
    </>
  );
}

export function PropertyModal() {
  const { selectedProperty, bookingQuote } = useBooking();

  if (!selectedProperty || !bookingQuote) return null;

  return <PropertyModalContent key={selectedProperty.id} quote={bookingQuote} />;
}
