"use client";

import React, { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
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
  ShieldCheck,
  Sparkles,
  Star,
  Trash2,
  Users,
} from "lucide-react";
import type { AmenityCategoryId, Property } from "@luxestay/contracts";
import {
  createIdleBookingSession,
  deriveBookingQuote,
  describeAmenityPricing,
  describeSelectedAmenity,
  formatAmenitiesFeeSummary,
  formatVND,
  openPropertySession,
  projectPropertyAmenities,
  removeSessionAmenity,
  toggleSessionAmenity,
  updateSessionAdults,
  updateSessionCheckIn,
  updateSessionNights,
} from "@luxestay/domain";
import {
  useBookingSession,
  useCatalog,
  useFavorites,
} from "@/features/booking/BookingContext";
import { AmenityIcon } from "@/features/property/AmenityIcon";
import { AvailabilityCalendar } from "@/features/property/AvailabilityCalendar";
import { PropertyAmenitiesModal } from "@/features/property/PropertyAmenitiesModal";
import { SeasonalPricingSummary } from "@/features/property/SeasonalPricingSummary";
import { Badge } from "@/shared/ui/Badge";
import { Button } from "@/shared/ui/Button";

interface AmenitiesModalState {
  isOpen: boolean;
  initialAmenityId: string | null;
  initialCategory: AmenityCategoryId | "all";
}

export function StayDetailView({ property }: { property: Property }) {
  const { searchCriteria } = useCatalog();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { startCheckoutWithDraft } = useBookingSession();

  const [draftSession, setDraftSession] = useState(() =>
    openPropertySession(createIdleBookingSession(), property, searchCriteria)
  );
  const [activePhoto, setActivePhoto] = useState(0);
  const [showShareToast, setShowShareToast] = useState(false);
  const [amenitiesModal, setAmenitiesModal] = useState<AmenitiesModalState>({
    isOpen: false,
    initialAmenityId: null,
    initialCategory: "all",
  });

  const quote = useMemo(() => deriveBookingQuote(draftSession)!, [draftSession]);
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
    if (typeof window !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(`${window.location.origin}/stays/${property.id}`);
      setShowShareToast(true);
      setTimeout(() => setShowShareToast(false), 2000);
    }
  };

  const handleCheckout = () => {
    startCheckoutWithDraft(property, {
      nights: quote.nights,
      adults: quote.guests.adults,
      selectedAmenityIds: quote.selectedAmenityIds,
      checkInSeed: draftSession.checkInSeed || quote.checkIn,
    });
  };

  return (
    <div className="bg-slate-50 min-h-screen py-6 sm:py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Breadcrumb & Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <Link
              href="/"
              className="inline-flex items-center gap-1 text-slate-600 hover:text-emerald-700 font-semibold"
            >
              <ArrowLeft className="w-4 h-4" />
              Trang chủ
            </Link>
            <span>/</span>
            <span>{property.location.city}</span>
            <span>/</span>
            <span className="text-slate-900 font-semibold truncate max-w-[200px] sm:max-w-xs">
              {property.title}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:border-emerald-300 hover:text-emerald-700 transition-colors"
            >
              <Share2 className="w-4 h-4" />
              {showShareToast ? "Đã sao chép link!" : "Chia sẻ"}
            </button>
            <button
              type="button"
              onClick={() => toggleFavorite(property.id)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:border-rose-300 transition-colors"
            >
              <Heart
                className={`w-4 h-4 ${isFav ? "fill-rose-500 text-rose-500" : "text-slate-600"}`}
              />
              {isFav ? "Đã lưu" : "Lưu yêu thích"}
            </button>
          </div>
        </div>

        {/* Title Header */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="default">{property.location.city}</Badge>
            {property.isSuperhost && <Badge variant="luxury">★ Superhost</Badge>}
            {property.freeCancellation && <Badge variant="success">Hủy miễn phí</Badge>}
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
            {property.title}
          </h1>
          <p className="text-sm text-slate-600">{property.subtitle}</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm text-slate-600 pt-1">
            <span className="inline-flex items-center gap-1 font-bold text-slate-900">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              {property.rating} ({property.reviewCount} đánh giá)
            </span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="w-4 h-4 text-emerald-600" />
              {property.location.address} • {property.location.distanceToCenter}
            </span>
          </div>
        </div>

        {/* Photo Gallery */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          <div className="lg:col-span-8 relative h-72 sm:h-[420px] rounded-3xl overflow-hidden bg-slate-200 shadow-sm">
            <Image
              src={property.images[activePhoto] ?? property.images[0]}
              alt={property.title}
              fill
              priority
              className="object-cover"
            />
          </div>
          <div className="lg:col-span-4 grid grid-cols-3 lg:grid-cols-2 gap-3">
            {property.images.map((img, idx) => (
              <button
                key={`${img}-${idx}`}
                type="button"
                onClick={() => setActivePhoto(idx)}
                className={`relative h-24 sm:h-32 lg:h-[132px] rounded-2xl overflow-hidden border-2 transition-all ${
                  activePhoto === idx
                    ? "border-emerald-600 ring-2 ring-emerald-500/30"
                    : "border-transparent opacity-85 hover:opacity-100"
                }`}
              >
                <Image
                  src={img}
                  alt={`${property.title} - ảnh ${idx + 1}`}
                  fill
                  className="object-cover"
                />
              </button>
            ))}
          </div>
        </div>

        {/* Main 2-Column Content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Details, Amenities, Host, Reviews */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-8">
            {/* Specs Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-5 rounded-3xl border border-slate-200/80">
              <div className="flex items-center gap-2.5">
                <Users className="w-5 h-5 text-emerald-600" />
                <div>
                  <div className="text-xs text-slate-500">Sức chứa</div>
                  <div className="text-sm font-bold text-slate-900">
                    Tối đa {property.maxGuests} khách
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <Bed className="w-5 h-5 text-emerald-600" />
                <div>
                  <div className="text-xs text-slate-500">Phòng ngủ</div>
                  <div className="text-sm font-bold text-slate-900">
                    {property.bedrooms} phòng • {property.beds} giường
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <Bath className="w-5 h-5 text-emerald-600" />
                <div>
                  <div className="text-xs text-slate-500">Phòng tắm</div>
                  <div className="text-sm font-bold text-slate-900">
                    {property.bathrooms} phòng
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <div>
                  <div className="text-xs text-slate-500">Chính sách</div>
                  <div className="text-sm font-bold text-slate-900">
                    {property.freeCancellation ? "Hủy miễn phí" : "Không hoàn hủy"}
                  </div>
                </div>
              </div>
            </div>

            {/* Description */}
            <section className="bg-white p-6 rounded-3xl border border-slate-200/80 space-y-3">
              <h2 className="text-lg font-bold text-slate-900">Giới thiệu về chỗ nghỉ</h2>
              <p className="text-sm text-slate-600 leading-relaxed">{property.description}</p>
            </section>

            {/* Interactive Availability & Seasonal Pricing Calendar */}
            <AvailabilityCalendar
              propertyId={property.id}
              selectedCheckIn={quote.checkIn}
              nights={quote.nights}
              rooms={quote.guests.rooms}
              onSelectCheckIn={(isoDate) =>
                setDraftSession((prev) => updateSessionCheckIn(prev, isoDate))
              }
            />

            {/* Resort Amenities */}
            <section className="bg-white p-6 rounded-3xl border border-slate-200/80 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Tiện ích &amp; dịch vụ khu nghỉ dưỡng
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Bấm vào tiện ích để xem chi tiết hoặc đăng ký dịch vụ đi kèm vào đơn đặt phòng
                  </p>
                </div>
                <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full">
                  {amenityCount} tiện ích
                </span>
              </div>

              {/* Category Summary Pills */}
              <div className="flex flex-wrap gap-2">
                {categorySummaries.map(({ category, count }) => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => openAmenitiesModal({ initialCategory: category.id })}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-xs font-semibold text-slate-700 hover:text-emerald-800 transition-colors"
                  >
                    <AmenityIcon name={category.iconName} className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{category.shortLabel}</span>
                    <span className="text-[11px] text-slate-400">({count})</span>
                  </button>
                ))}
              </div>

              {/* Featured Amenities Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {featuredAmenities.map((amenity) => {
                  const descriptor = describeAmenityPricing(amenity);
                  const isSelected = quote.selectedAmenityIds.includes(amenity.id);
                  return (
                    <button
                      key={amenity.id}
                      type="button"
                      onClick={() => openAmenitiesModal({ initialAmenityId: amenity.id })}
                      className={`flex items-start justify-between gap-3 p-3.5 rounded-2xl border text-left transition-all ${
                        isSelected
                          ? "border-emerald-500 bg-emerald-50/50"
                          : "border-slate-200 hover:border-emerald-300 bg-white"
                      }`}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                          <AmenityIcon name={amenity.iconName} className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-900 truncate">
                            {amenity.name}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {descriptor.compactBadge}
                          </div>
                        </div>
                      </div>
                      <div className="shrink-0 mt-1">
                        {isSelected ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                            <Check className="w-3 h-3" /> Đã chọn
                          </span>
                        ) : (
                          <ChevronRight className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              <Button
                variant="outline"
                onClick={() => openAmenitiesModal()}
                className="w-full justify-center"
              >
                <LayoutGrid className="w-4 h-4 mr-2" />
                Xem tất cả {amenityCount} tiện ích &amp; dịch vụ
              </Button>
            </section>

            {/* Host Info */}
            <section className="bg-white p-6 rounded-3xl border border-slate-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <Image
                  src={property.host.avatar}
                  alt={property.host.name}
                  width={56}
                  height={56}
                  className="rounded-full object-cover border-2 border-emerald-500/20"
                />
                <div>
                  <div className="text-sm font-bold text-slate-900">
                    Chủ nhà: {property.host.name}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Tham gia {property.host.joinedDate} • Tỷ lệ phản hồi {property.host.responseRate}
                  </div>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl">
                <MessageCircle className="w-4 h-4" />
                Hỗ trợ nhanh 24/7
              </span>
            </section>

            {/* Reviews */}
            <section className="bg-white p-6 rounded-3xl border border-slate-200/80 space-y-4">
              <h2 className="text-lg font-bold text-slate-900">
                Đánh giá từ khách lưu trú ({property.reviews.length})
              </h2>
              <div className="space-y-4">
                {property.reviews.map((review) => (
                  <div
                    key={review.id}
                    className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <Image
                          src={review.authorAvatar}
                          alt={review.authorName}
                          width={36}
                          height={36}
                          className="rounded-full object-cover"
                        />
                        <div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-900">
                              {review.authorName}
                            </span>
                            {review.isVerified && (
                              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full">
                                <Check className="w-2.5 h-2.5" />
                                Đã xác thực lưu trú
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400">{review.date}</div>
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-lg">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        {review.rating}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{review.comment}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Right Column: Sticky Booking Quote Card */}
          <aside className="lg:col-span-5 xl:col-span-4 lg:sticky lg:top-24">
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xl p-6 space-y-5">
              <div className="flex items-baseline justify-between gap-2">
                <div>
                  {property.originalPrice && (
                    <span className="text-xs text-slate-400 line-through block">
                      {formatVND(property.originalPrice)} / đêm
                    </span>
                  )}
                  <span className="text-2xl font-black text-emerald-700">
                    {formatVND(property.pricePerNight)}
                  </span>
                  <span className="text-xs text-slate-500"> / đêm</span>
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-800">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  {property.rating}
                </span>
              </div>

              {/* Stay Dates Summary */}
              <div className="grid grid-cols-2 gap-2 p-3 rounded-2xl bg-slate-50 border border-slate-200/70 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Nhận phòng
                  </span>
                  <span className="font-bold text-slate-800">{quote.checkIn}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Trả phòng
                  </span>
                  <span className="font-bold text-slate-800">{quote.checkOut}</span>
                </div>
              </div>

              {/* Nights & Guests Steppers */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-2xl border border-slate-200 space-y-1.5">
                  <span className="text-[11px] font-semibold text-slate-500 block">Số đêm</span>
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() =>
                        setDraftSession((prev) => updateSessionNights(prev, quote.nights - 1))
                      }
                      className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 font-bold text-slate-700"
                      aria-label="Giảm số đêm"
                    >
                      -
                    </button>
                    <span className="text-sm font-bold text-slate-900">{quote.nights}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setDraftSession((prev) => updateSessionNights(prev, quote.nights + 1))
                      }
                      className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 font-bold text-slate-700"
                      aria-label="Tăng số đêm"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="p-3 rounded-2xl border border-slate-200 space-y-1.5">
                  <span className="text-[11px] font-semibold text-slate-500 block">
                    Người lớn (tối đa {property.maxGuests})
                  </span>
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() =>
                        setDraftSession((prev) =>
                          updateSessionAdults(prev, quote.guests.adults - 1)
                        )
                      }
                      className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 font-bold text-slate-700"
                      aria-label="Giảm số khách"
                    >
                      -
                    </button>
                    <span className="text-sm font-bold text-slate-900">
                      {quote.guests.adults}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setDraftSession((prev) =>
                          updateSessionAdults(prev, quote.guests.adults + 1)
                        )
                      }
                      className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 font-bold text-slate-700"
                      aria-label="Tăng số khách"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Selected Amenities Summary */}
              {quote.selectedAmenities.length > 0 && (
                <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-emerald-900">
                    <span className="inline-flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                      Dịch vụ đi kèm ({quote.selectedAmenities.length})
                    </span>
                    <span className="text-emerald-700">
                      {formatAmenitiesFeeSummary(quote.pricing.amenitiesFee)}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {quote.selectedAmenities.map((item) => {
                      const display = describeSelectedAmenity(item);
                      return (
                        <div
                          key={item.id}
                          className="flex items-center justify-between gap-2 bg-white px-2.5 py-1.5 rounded-xl text-[11px]"
                        >
                          <span className="font-medium text-slate-800 truncate">{item.name}</span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="font-bold text-slate-700">{display.compactFee}</span>
                            <button
                              type="button"
                              onClick={() =>
                                setDraftSession((prev) => removeSessionAmenity(prev, item.id))
                              }
                              className="text-slate-400 hover:text-rose-600"
                              aria-label={`Bỏ ${item.name}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Price Breakdown */}
              <div className="space-y-2 text-xs pt-2 border-t border-slate-100">
                <SeasonalPricingSummary
                  pricing={quote.pricing}
                  nights={quote.nights}
                  rooms={quote.guests.rooms}
                />
                <div className="flex justify-between text-slate-600">
                  <span>Phí dịch vụ &amp; dọn dẹp</span>
                  <span>{formatVND(quote.pricing.cleaningFee)}</span>
                </div>
                {quote.selectedAmenities.length > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Tiện ích &amp; dịch vụ đi kèm</span>
                    <span>{formatAmenitiesFeeSummary(quote.pricing.amenitiesFee)}</span>
                  </div>
                )}
                {quote.pricing.discount > 0 ? (
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span>
                      Mã ưu đãi{" "}
                      {quote.pricing.appliedPromoCode ? `(${quote.pricing.appliedPromoCode})` : ""}
                    </span>
                    <span>-{formatVND(quote.pricing.discount)}</span>
                  </div>
                ) : (
                  <div className="flex justify-between text-slate-400 text-[11px]">
                    <span>Mã giảm giá</span>
                    <span>Áp dụng tại bước thanh toán</span>
                  </div>
                )}
                <div className="pt-2 border-t border-slate-200 flex justify-between text-base font-black text-slate-900">
                  <span>Tổng tạm tính</span>
                  <span className="text-emerald-700">{formatVND(quote.pricing.total)}</span>
                </div>
              </div>

              <Button
                variant="primary"
                size="lg"
                onClick={handleCheckout}
                className="w-full justify-center font-bold shadow-lg shadow-emerald-600/25"
              >
                Đặt phòng ngay
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </aside>
        </div>
      </div>

      <PropertyAmenitiesModal
        isOpen={amenitiesModal.isOpen}
        property={property}
        initialAmenityId={amenitiesModal.initialAmenityId}
        initialCategory={amenitiesModal.initialCategory}
        selectedAmenities={quote.selectedAmenities}
        onToggleAmenity={(amenityId) =>
          setDraftSession((prev) => toggleSessionAmenity(prev, amenityId))
        }
        onClose={() =>
          setAmenitiesModal((prev) => ({
            ...prev,
            isOpen: false,
          }))
        }
      />
    </div>
  );
}
