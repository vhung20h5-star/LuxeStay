"use client";

import React, { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  Car,
  CheckCircle2,
  Clock,
  Luggage,
  MapPin,
  ShieldCheck,
  Sparkles,
  Star,
  Tag,
  Users,
  XCircle,
} from "lucide-react";
import type { ActivityBooking, ActivityDetailResponse } from "@luxestay/contracts";
import { calculateActivityPricing } from "@luxestay/domain";
import { useAuth } from "@/features/auth/AuthContext";
import { useBookingSession } from "@/features/booking/BookingContext";
import { useLocale } from "@/features/locale/LocaleContext";
import { HttpApiError } from "@/shared/ports/errors";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";

function getDefaultTomorrowIso(): string {
  const tomorrow = new Date(Date.now() + 86_400_000);
  const y = tomorrow.getFullYear();
  const m = String(tomorrow.getMonth() + 1).padStart(2, "0");
  const d = String(tomorrow.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function ActivityDetailView({ detail }: { detail: ActivityDetailResponse }) {
  const { activity, relatedStays, availableVouchers } = detail;
  const { user } = useAuth();
  const { activitiesPort } = useBookingSession();
  const { locale, formatPrice } = useLocale();

  const [selectedSlotId, setSelectedSlotId] = useState(activity.slots[0]?.id ?? "");
  const [dateIso, setDateIso] = useState(getDefaultTomorrowIso);
  const [quantity, setQuantity] = useState(1);
  const [promoCode, setPromoCode] = useState("");
  const [appliedPromoInput, setAppliedPromoInput] = useState("");

  const [fullName, setFullName] = useState(user?.fullName ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [note, setNote] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmedBooking, setConfirmedBooking] = useState<ActivityBooking | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const selectedSlot = useMemo(
    () => activity.slots.find((s) => s.id === selectedSlotId) ?? activity.slots[0],
    [activity.slots, selectedSlotId]
  );

  const pricingPreview = useMemo(() => {
    if (!selectedSlot) return null;
    return calculateActivityPricing(activity, selectedSlot, quantity, {
      promoCode: appliedPromoInput || undefined,
      vouchers: availableVouchers,
      isAuthenticated: Boolean(user),
    });
  }, [activity, appliedPromoInput, availableVouchers, quantity, selectedSlot, user]);

  const fillDemoGuest = () => {
    setFullName("Nguyễn Minh Anh");
    setPhone("0912345678");
    setEmail("demo.guest@luxestay.vn");
    setNote(
      activity.category === "transfer"
        ? "Chuyến bay VN1382 hạ cánh dự kiến lúc 10:15"
        : "Ưu tiên ghế gần cửa sổ"
    );
  };

  const handleApplyPromo = () => {
    setAppliedPromoInput(promoCode.trim().toUpperCase());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (!selectedSlot) return;

    setIsSubmitting(true);
    try {
      const created = await activitiesPort.createBooking({
        activityId: activity.id,
        slotId: selectedSlot.id,
        dateIso,
        quantity,
        guestInfo: {
          fullName: fullName.trim(),
          phone: phone.trim(),
          email: email.trim(),
          note: note.trim() || undefined,
        },
        paymentMethod: "hotel",
        ...(appliedPromoInput ? { promoCode: appliedPromoInput } : {}),
      });
      setConfirmedBooking(created);
    } catch (err) {
      setSubmitError(
        err instanceof HttpApiError
          ? err.message
          : "Không thể hoàn tất đặt dịch vụ lúc này. Vui lòng thử lại."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!confirmedBooking) return;
    setIsCancelling(true);
    setCancelError(null);
    try {
      const updated = await activitiesPort.cancelBooking(confirmedBooking.bookingId, {
        contact: confirmedBooking.guestInfo.email,
        reason: "Khách thay đổi lịch trình",
      });
      setConfirmedBooking(updated);
    } catch (err) {
      setCancelError(
        err instanceof HttpApiError ? err.message : "Không thể hủy đơn dịch vụ lúc này."
      );
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className="w-full min-w-0 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-8">
      <Link
        href="/activities"
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-emerald-700 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>{locale === "en" ? "Back to all activities" : "Tất cả trải nghiệm & đưa đón"}</span>
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Details Column */}
        <div className="lg:col-span-7 space-y-6 min-w-0">
          <div className="relative aspect-[16/10] w-full rounded-3xl overflow-hidden bg-slate-100 shadow-md">
            <Image
              src={activity.images[0]}
              alt={activity.title}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 60vw"
              className="object-cover"
            />
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700">
                <MapPin className="w-3.5 h-3.5" />
                {activity.destinationCity}, {activity.province}
              </span>
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-100 text-slate-700">
                <Clock className="w-3.5 h-3.5" />
                {activity.durationLabel}
              </span>
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-50 text-amber-800">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                {activity.rating.toFixed(2)} ({activity.reviewCount})
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight">
              {activity.title}
            </h1>
            <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
              {activity.subtitle}
            </p>
          </div>

          {/* Transfer Details Box */}
          {activity.transferDetails && (
            <div className="bg-sky-50/70 border border-sky-200/80 rounded-3xl p-5 space-y-3">
              <div className="flex items-center gap-2 text-sky-900 font-bold">
                <Car className="w-5 h-5 text-sky-600" />
                <span>Thông số tuyến xe riêng</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-slate-700">
                <div>
                  <span className="text-xs font-semibold text-slate-500 block">Điểm đón</span>
                  <span className="font-semibold">{activity.transferDetails.routeFrom}</span>
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-500 block">Điểm trả</span>
                  <span className="font-semibold">{activity.transferDetails.routeTo}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-sky-600" />
                  <span>
                    {activity.transferDetails.vehicleType} • tối đa{" "}
                    <strong>{activity.transferDetails.maxPassengers} khách</strong>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Luggage className="w-4 h-4 text-sky-600" />
                  <span>
                    Hành lý tối đa <strong>{activity.transferDetails.maxLuggage} kiện</strong>
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Highlights & Included */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white rounded-3xl border border-slate-200 p-5 space-y-3">
              <h2 className="font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                Điểm nổi bật
              </h2>
              <ul className="space-y-2 text-sm text-slate-600">
                {activity.highlights.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 p-5 space-y-3">
              <h2 className="font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Dịch vụ bao gồm
              </h2>
              <ul className="space-y-2 text-sm text-slate-600">
                {activity.included.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-teal-500 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-slate-500 pt-2 border-t border-slate-100">
                <strong>Điểm tập trung:</strong> {activity.meetingPoint}
              </p>
            </div>
          </div>

          {/* Related Stays */}
          {relatedStays.length > 0 && (
            <div className="space-y-3 pt-2">
              <h2 className="text-lg font-bold text-slate-900">
                Chỗ nghỉ gợi ý tại {activity.destinationCity}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {relatedStays.map((stay) => (
                  <Link
                    key={stay.id}
                    href={`/stays/${stay.id}`}
                    className="flex items-center gap-3 p-3 rounded-2xl bg-white border border-slate-200 hover:border-emerald-300 hover:shadow-md transition-all"
                  >
                    <div className="relative w-20 h-16 rounded-xl overflow-hidden shrink-0 bg-slate-100">
                      <Image
                        src={stay.images[0]}
                        alt={stay.title}
                        fill
                        sizes="80px"
                        className="object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold text-slate-900 truncate">{stay.title}</div>
                      <div className="text-xs text-slate-500">{stay.location.city}</div>
                      <div className="text-xs font-bold text-emerald-700 mt-1">
                        {formatPrice(stay.pricePerNight)} / đêm
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Booking Card */}
        <div className="lg:col-span-5 lg:sticky lg:top-24 bg-white rounded-3xl border border-slate-200 shadow-lg p-5 sm:p-6 space-y-5 min-w-0">
          {confirmedBooking ? (
            <div className="space-y-4" data-testid="activity-booking-receipt">
              <div
                className={`rounded-2xl p-4 flex items-center gap-3 ${
                  confirmedBooking.status === "cancelled"
                    ? "bg-rose-50 text-rose-800 border border-rose-200"
                    : "bg-emerald-50 text-emerald-900 border border-emerald-200"
                }`}
              >
                {confirmedBooking.status === "cancelled" ? (
                  <XCircle className="w-6 h-6 text-rose-600 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                )}
                <div className="min-w-0">
                  <div className="text-sm font-black">
                    {confirmedBooking.status === "cancelled"
                      ? "Đơn dịch vụ đã được hủy"
                      : "Đặt dịch vụ thành công!"}
                  </div>
                  <div className="text-xs font-mono font-bold mt-0.5" data-testid="activity-booking-id">
                    {confirmedBooking.bookingId}
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-sm bg-slate-50 rounded-2xl p-4">
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">Dịch vụ</span>
                  <span className="font-semibold text-right text-slate-900">
                    {confirmedBooking.activityTitle}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">Ngày & Khung giờ</span>
                  <span className="font-semibold text-slate-900">
                    {confirmedBooking.dateIso} • {confirmedBooking.slotLabel}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">Số lượng</span>
                  <span className="font-semibold text-slate-900">
                    {confirmedBooking.quantity} {confirmedBooking.unitLabel}
                  </span>
                </div>
                {confirmedBooking.discount > 0 && (
                  <div className="flex justify-between gap-2 text-emerald-700">
                    <span>Giảm giá ({confirmedBooking.appliedPromoCode})</span>
                    <span className="font-bold">-{formatPrice(confirmedBooking.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between gap-2 pt-2 border-t border-slate-200 text-base font-black text-slate-900">
                  <span>Tổng thanh toán</span>
                  <span className="text-emerald-700">{formatPrice(confirmedBooking.total)}</span>
                </div>
              </div>

              {cancelError && (
                <p className="text-xs text-rose-600 font-semibold flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {cancelError}
                </p>
              )}

              <div className="flex flex-col sm:flex-row gap-2.5">
                {confirmedBooking.status === "confirmed" && confirmedBooking.freeCancellation && (
                  <Button
                    type="button"
                    variant="outline"
                    data-testid="cancel-standalone-activity-btn"
                    disabled={isCancelling}
                    onClick={handleCancelBooking}
                    className="flex-1 border-rose-200 text-rose-700 hover:bg-rose-50"
                  >
                    {isCancelling ? "Đang hủy..." : "Hủy đơn dịch vụ"}
                  </Button>
                )}
                <Button
                  type="button"
                  onClick={() => setConfirmedBooking(null)}
                  className="flex-1"
                >
                  Đặt thêm lượt mới
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex items-baseline justify-between gap-2 pb-3 border-b border-slate-100">
                <div>
                  <span className="text-2xl font-black text-emerald-700">
                    {formatPrice(pricingPreview?.unitPrice ?? activity.pricePerUnit)}
                  </span>
                  <span className="text-xs text-slate-500 ml-1">/ {activity.unitLabel}</span>
                </div>
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                  Xác nhận tức thì
                </span>
              </div>

              {/* Date & Quantity */}
              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1 text-xs font-semibold text-slate-700">
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                    Ngày khởi hành
                  </span>
                  <input
                    type="date"
                    data-testid="activity-date-input"
                    value={dateIso}
                    onChange={(e) => setDateIso(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-900"
                  />
                </label>

                <label className="space-y-1 text-xs font-semibold text-slate-700">
                  <span className="inline-flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-emerald-600" />
                    Số lượng ({activity.unitLabel})
                  </span>
                  <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      className="px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                    >
                      −
                    </button>
                    <span
                      className="flex-1 text-center text-sm font-bold text-slate-900"
                      data-testid="activity-quantity-value"
                    >
                      {quantity}
                    </span>
                    <button
                      type="button"
                      data-testid="activity-quantity-inc"
                      onClick={() => setQuantity((q) => Math.min(20, q + 1))}
                      className="px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </label>
              </div>

              {/* Time Slot Selector */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-700">Chọn khung giờ</div>
                <div className="space-y-2">
                  {activity.slots.map((slot) => {
                    const selected = slot.id === selectedSlot?.id;
                    return (
                      <button
                        key={slot.id}
                        type="button"
                        data-testid={`activity-slot-${slot.id}`}
                        onClick={() => setSelectedSlotId(slot.id)}
                        className={`w-full text-left px-3.5 py-2.5 rounded-2xl border text-xs sm:text-sm transition-all cursor-pointer flex items-center justify-between gap-2 ${
                          selected
                            ? "border-emerald-500 bg-emerald-50/70 text-emerald-950 font-semibold"
                            : "border-slate-200 hover:border-slate-300 text-slate-700"
                        }`}
                      >
                        <span className="truncate">{slot.label}</span>
                        {slot.priceModifier !== 0 && (
                          <span className="text-xs font-bold shrink-0 text-emerald-700">
                            {slot.priceModifier > 0 ? "+" : ""}
                            {formatPrice(slot.priceModifier)}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Promo Code */}
              <div className="space-y-1.5">
                <div className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5 text-emerald-600" />
                  Mã ưu đãi Promotions Hub
                </div>
                <div className="flex gap-2">
                  <Input
                    data-testid="activity-promo-input"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    placeholder="VD: LUXESTAY250, WELCOME150"
                    className="flex-1 text-sm"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    data-testid="activity-promo-apply"
                    onClick={handleApplyPromo}
                  >
                    Áp dụng
                  </Button>
                </div>
                {pricingPreview?.promoError && (
                  <p className="text-xs text-rose-600 font-medium">{pricingPreview.promoError}</p>
                )}
                {pricingPreview?.appliedPromoCode && (
                  <p className="text-xs text-emerald-700 font-semibold">
                    Đã áp dụng mã {pricingPreview.appliedPromoCode} (-
                    {formatPrice(pricingPreview.discount)})
                  </p>
                )}
              </div>

              {/* Guest Info */}
              <div className="space-y-2.5 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">Thông tin liên hệ</span>
                  <button
                    type="button"
                    data-testid="activity-fill-demo"
                    onClick={fillDemoGuest}
                    className="text-xs font-bold text-emerald-700 hover:underline cursor-pointer"
                  >
                    Điền nhanh thông tin mẫu
                  </button>
                </div>
                <Input
                  data-testid="activity-guest-name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Họ và tên *"
                  required
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <Input
                    data-testid="activity-guest-phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Số điện thoại *"
                    required
                  />
                  <Input
                    data-testid="activity-guest-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email *"
                    required
                  />
                </div>
                <Input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Ghi chú (số hiệu chuyến bay, giờ đón...)"
                />
              </div>

              {/* Pricing Summary */}
              {pricingPreview && (
                <div className="bg-slate-50 rounded-2xl p-4 space-y-1.5 text-sm">
                  <div className="flex justify-between text-slate-600">
                    <span>
                      {formatPrice(pricingPreview.unitPrice)} × {quantity} {activity.unitLabel}
                    </span>
                    <span className="font-semibold text-slate-900">
                      {formatPrice(pricingPreview.subtotal)}
                    </span>
                  </div>
                  {pricingPreview.discount > 0 && (
                    <div className="flex justify-between text-emerald-700">
                      <span>Giảm giá ({pricingPreview.appliedPromoCode})</span>
                      <span className="font-bold">-{formatPrice(pricingPreview.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t border-slate-200 text-base font-black text-slate-900">
                    <span>Tổng cộng</span>
                    <span className="text-emerald-700" data-testid="activity-total-price">
                      {formatPrice(pricingPreview.total)}
                    </span>
                  </div>
                </div>
              )}

              {submitError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-semibold flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{submitError}</span>
                </div>
              )}

              <Button
                type="submit"
                data-testid="activity-submit-btn"
                disabled={isSubmitting}
                className="w-full py-3.5 text-sm font-bold"
              >
                {isSubmitting ? "Đang xác nhận dịch vụ..." : "Xác nhận đặt dịch vụ ngay"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
