"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Award,
  CheckCircle2,
  Clock,
  CreditCard,
  Download,
  ExternalLink,
  Mail,
  MapPin,
  PhoneCall,
  ShieldAlert,
  Sparkles,
  Star,
  XCircle,
} from "lucide-react";
import type { BookingDetails, NotificationLog, ReservationStatus } from "@luxestay/contracts";
import {
  describeSelectedAmenity,
  formatAmenitiesFeeSummary,
  formatVND,
  hasCheckoutDatePassed,
} from "@luxestay/domain";
import { useAuth } from "@/features/auth/AuthContext";
import { useBookingSession } from "@/features/booking/BookingContext";
import { SeasonalPricingSummary } from "@/features/property/SeasonalPricingSummary";
import { HttpApiError, isAbortError } from "@/shared/ports/errors";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";

export interface BookingDetailViewProps {
  bookingId: string;
  initialContact?: string;
}

const PAYMENT_METHOD_LABELS: Record<BookingDetails["paymentMethod"], string> = {
  momo: "Ví điện tử MoMo",
  vnpay: "VNPAY QR Ngân hàng",
  card: "Thẻ quốc tế (Visa/Master)",
  hotel: "Thanh toán tại chỗ nghỉ",
};

const STATUS_HEADER: Record<
  ReservationStatus,
  { badge: string; gradient: string; badgeClass: string; icon: "check" | "clock" | "x" }
> = {
  confirmed: {
    badge: "Đã xác nhận",
    gradient: "bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700",
    badgeClass: "bg-white/20 text-emerald-50",
    icon: "check",
  },
  completed: {
    badge: "Hoàn tất lưu trú",
    gradient: "bg-gradient-to-r from-indigo-600 via-emerald-600 to-teal-700",
    badgeClass: "bg-white/20 text-white",
    icon: "check",
  },
  pending_payment: {
    badge: "Chờ thanh toán",
    gradient: "bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700",
    badgeClass: "bg-white/20 text-amber-50",
    icon: "clock",
  },
  payment_failed: {
    badge: "Thanh toán thất bại",
    gradient: "bg-gradient-to-r from-rose-700 via-rose-800 to-slate-900",
    badgeClass: "bg-rose-400/25 text-rose-100",
    icon: "x",
  },
  expired: {
    badge: "Hết hạn thanh toán",
    gradient: "bg-gradient-to-r from-slate-700 via-slate-800 to-slate-900",
    badgeClass: "bg-white/15 text-slate-200",
    icon: "clock",
  },
  cancelled: {
    badge: "Đơn đã hủy",
    gradient: "bg-gradient-to-r from-slate-700 via-slate-800 to-slate-900",
    badgeClass: "bg-rose-500/25 text-rose-200",
    icon: "x",
  },
};

export function BookingDetailView({
  bookingId,
  initialContact = "",
}: BookingDetailViewProps) {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();
  const {
    lookupReservation,
    cancelReservation,
    cancelReservationActivityItem,
    completeReservation,
    listReservationNotifications,
    propertyExperience,
  } = useBookingSession();

  const [contactInput, setContactInput] = useState(initialContact);
  const [verifiedContact, setVerifiedContact] = useState(initialContact.trim());
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [notifications, setNotifications] = useState<readonly NotificationLog[]>([]);
  const [expandedEmailId, setExpandedEmailId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(initialContact.trim()) || isAuthLoading);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Cancellation flow state
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancellingActivityItemId, setCancellingActivityItemId] = useState<string | null>(null);
  const [activityCancelError, setActivityCancelError] = useState<string | null>(null);

  // Stay completion (sandbox) & Verified Review state
  const [isCompleting, setIsCompleting] = useState(false);
  const [completeError, setCompleteError] = useState<string | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewSuccess, setReviewSuccess] = useState<{
    rating: number;
    reviewCount: number;
  } | null>(null);

  const lastLoadedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const trimmed = initialContact.trim();
    if (!trimmed && isAuthLoading) return;
    if (!trimmed && !user) {
      return;
    }

    const key = `${bookingId.toUpperCase()}::${trimmed || user?.id || ""}`;
    if (lastLoadedKeyRef.current === key) return;

    const controller = new AbortController();
    lookupReservation(bookingId, trimmed || undefined, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        lastLoadedKeyRef.current = key;
        setBooking(result);
        setVerifiedContact(trimmed);
        setErrorMessage(null);
        setIsLoading(false);

        void listReservationNotifications(
          result.bookingId ?? bookingId,
          trimmed || undefined,
          controller.signal
        ).then((logs) => {
          if (!controller.signal.aborted) {
            setNotifications(logs);
          }
        });
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted || isAbortError(err)) return;
        setBooking(null);
        setErrorMessage(
          err instanceof HttpApiError
            ? err.message
            : "Không thể tải thông tin đặt phòng. Vui lòng thử lại!"
        );
        setIsLoading(false);
      });

    return () => controller.abort();
  }, [
    bookingId,
    initialContact,
    isAuthLoading,
    listReservationNotifications,
    lookupReservation,
    user,
  ]);

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = contactInput.trim();
    if (!trimmed) {
      setErrorMessage("Vui lòng nhập email hoặc số điện thoại để mở khóa vé đặt phòng.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    try {
      const result = await lookupReservation(bookingId, trimmed);
      lastLoadedKeyRef.current = `${bookingId.toUpperCase()}::${trimmed}`;
      setBooking(result);
      setVerifiedContact(trimmed);
      setIsLoading(false);
      const logs = await listReservationNotifications(result.bookingId ?? bookingId, trimmed);
      setNotifications(logs);
      router.replace(
        `/bookings/${encodeURIComponent(bookingId.toUpperCase())}?contact=${encodeURIComponent(trimmed)}`
      );
    } catch (err) {
      if (isAbortError(err)) return;
      setBooking(null);
      setErrorMessage(
        err instanceof HttpApiError
          ? err.message
          : "Không thể tải thông tin đặt phòng. Vui lòng thử lại!"
      );
      setIsLoading(false);
    }
  };

  const handleCancelBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!booking) return;
    setCancelError(null);
    setIsCancelling(true);
    try {
      const updated = await cancelReservation(booking.bookingId ?? bookingId, {
        contact: verifiedContact || undefined,
        reason: cancelReason,
      });
      setBooking(updated);
      setShowCancelForm(false);
      setCancelReason("");
      const logs = await listReservationNotifications(
        updated.bookingId ?? bookingId,
        verifiedContact || undefined
      );
      setNotifications(logs);
    } catch (err) {
      setCancelError(
        err instanceof HttpApiError
          ? err.message
          : "Không thể hủy đặt phòng lúc này. Vui lòng thử lại!"
      );
    } finally {
      setIsCancelling(false);
    }
  };

  const handleCompleteStay = async () => {
    if (!booking) return;
    setCompleteError(null);
    setIsCompleting(true);
    try {
      const updated = await completeReservation(
        booking.bookingId ?? bookingId,
        verifiedContact || undefined
      );
      setBooking(updated);
    } catch (err) {
      setCompleteError(
        err instanceof HttpApiError
          ? err.message
          : "Không thể hoàn tất lưu trú lúc này. Vui lòng thử lại!"
      );
    } finally {
      setIsCompleting(false);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!booking) return;
    const trimmedComment = reviewComment.trim();
    if (trimmedComment.length < 10) {
      setReviewError("Nội dung đánh giá cần tối thiểu 10 ký tự để hữu ích cho du khách khác.");
      return;
    }

    setReviewError(null);
    setIsSubmittingReview(true);
    try {
      const res = await propertyExperience.submitReview(booking.property.id, {
        bookingId: booking.bookingId ?? bookingId,
        contact: verifiedContact || undefined,
        rating: reviewRating,
        comment: trimmedComment,
      });
      setReviewSuccess({
        rating: res.propertyRating,
        reviewCount: res.propertyReviewCount,
      });
      setReviewComment("");
    } catch (err) {
      setReviewError(
        err instanceof HttpApiError
          ? err.message
          : "Không thể gửi đánh giá xác thực lúc này. Vui lòng thử lại!"
      );
    } finally {
      setIsSubmittingReview(false);
    }
  };

  if (isLoading && (Boolean(initialContact.trim()) || Boolean(user) || isAuthLoading)) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-slate-50 px-4">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 rounded-full border-4 border-emerald-200 border-t-emerald-600 animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-600">
            Đang tải thông tin đơn <span className="font-mono">{bookingId.toUpperCase()}</span>...
          </p>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-[75vh] bg-slate-50 py-10 sm:py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-lg mx-auto space-y-5">
          <Link
            href="/bookings"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-emerald-700"
          >
            <ArrowLeft className="w-4 h-4" />
            Quay lại trang tra cứu
          </Link>

          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xl p-6 sm:p-8 space-y-5">
            <div>
              <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                {bookingId.toUpperCase()}
              </span>
              <h1 className="text-xl font-black text-slate-900 mt-3">
                Xác minh thông tin đặt phòng
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Vui lòng nhập email hoặc số điện thoại đã đăng ký để xem chi tiết vé đặt phòng này.
              </p>
            </div>

            <form onSubmit={handleVerifySubmit} className="space-y-4">
              <Input
                label="Email hoặc Số điện thoại đặt phòng"
                value={contactInput}
                onChange={(e) => setContactInput(e.target.value)}
                placeholder="guest@luxestay.vn hoặc 0912 345 678"
                required
              />

              {errorMessage && (
                <div
                  role="alert"
                  className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 flex items-center gap-2 text-xs font-semibold text-rose-800"
                >
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <Button type="submit" variant="primary" className="w-full justify-center font-bold">
                Xem chi tiết đơn đặt phòng
              </Button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  const statusMeta = STATUS_HEADER[booking.status] ?? STATUS_HEADER.confirmed;
  const isCancelled = booking.status === "cancelled";
  const isPendingPayment = booking.status === "pending_payment";
  const isClosedFailure =
    booking.status === "payment_failed" || booking.status === "expired";
  const canCancelOnline =
    isPendingPayment || (booking.status === "confirmed" && Boolean(booking.property.freeCancellation));

  return (
    <div className="min-h-[80vh] bg-slate-50 py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4 print:hidden">
          <Link
            href="/bookings"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-emerald-700"
          >
            <ArrowLeft className="w-4 h-4" />
            Quay lại danh sách / Tra cứu đơn khác
          </Link>
          <Link
            href="/"
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-800"
          >
            Khám phá thêm chỗ nghỉ
          </Link>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xl overflow-hidden">
          {/* Header Banner */}
          <div className={`p-6 sm:p-8 text-white ${statusMeta.gradient}`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {statusMeta.icon === "x" ? (
                  <XCircle className="w-9 h-9 text-rose-200 shrink-0" />
                ) : statusMeta.icon === "clock" ? (
                  <Clock className="w-9 h-9 text-amber-200 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-9 h-9 text-white shrink-0" />
                )}
                <div>
                  <span
                    className={`inline-block text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${statusMeta.badgeClass}`}
                  >
                    {statusMeta.badge}
                  </span>
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight mt-1">
                    Vé điện tử LuxeStay
                  </h1>
                </div>
              </div>

              <div className="px-4 py-2 rounded-2xl bg-white/15 backdrop-blur-md text-xs font-mono">
                <span className="text-white/80 block text-[10px] uppercase">Mã đặt phòng</span>
                <span className="text-amber-300 font-black text-base tracking-wider">
                  {booking.bookingId}
                </span>
              </div>
            </div>

            {isPendingPayment && booking.payment?.checkoutUrl && (
              <div className="mt-4 p-4 rounded-2xl bg-black/20 backdrop-blur-sm flex flex-wrap items-center justify-between gap-3 text-xs">
                <div>
                  <div className="font-bold text-white">
                    Đơn đang giữ chỗ — vui lòng hoàn tất thanh toán trực tuyến
                  </div>
                  {booking.paymentExpiresAt && (
                    <div className="text-amber-100 mt-0.5">
                      Hạn thanh toán: {new Date(booking.paymentExpiresAt).toLocaleString("vi-VN")}
                    </div>
                  )}
                </div>
                <Link
                  href={booking.payment.checkoutUrl}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-amber-800 font-bold hover:bg-amber-50 transition-colors print:hidden"
                >
                  <CreditCard className="w-4 h-4" />
                  Mở cổng thanh toán
                </Link>
              </div>
            )}

            {booking.status === "completed" && (
              <div className="mt-4 p-3.5 rounded-2xl bg-white/15 text-xs text-white space-y-0.5">
                <div className="font-bold">
                  Cảm ơn bạn đã lưu trú cùng LuxeStay!
                </div>
                {booking.completedAt && (
                  <div className="text-emerald-100">
                    Hoàn tất vào {new Date(booking.completedAt).toLocaleString("vi-VN")}
                  </div>
                )}
              </div>
            )}

            {isCancelled && (
              <div className="mt-4 p-3.5 rounded-2xl bg-white/10 text-xs text-slate-200 space-y-1">
                <div className="font-semibold">
                  Đã hủy thành công
                  {booking.cancelledAt
                    ? ` vào ${new Date(booking.cancelledAt).toLocaleString("vi-VN")}`
                    : ""}
                </div>
                {booking.cancellationReason && (
                  <div className="text-slate-300">Lý do: {booking.cancellationReason}</div>
                )}
              </div>
            )}

            {isClosedFailure && booking.payment?.failureReason && (
              <div className="mt-4 p-3.5 rounded-2xl bg-white/10 text-xs text-rose-100">
                Lý do: {booking.payment.failureReason}
              </div>
            )}
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            {/* Property card */}
            <div className="flex flex-col sm:flex-row gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div className="relative w-full sm:w-28 h-40 sm:h-24 rounded-xl overflow-hidden shrink-0">
                <Image
                  src={booking.property.images[0]}
                  alt={booking.property.title}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">
                  {booking.property.location.city}
                </div>
                <h2 className="text-base font-bold text-slate-900 mt-0.5">
                  {booking.property.title}
                </h2>
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>{booking.property.location.address}</span>
                </p>
                <Link
                  href={`/stays/${booking.property.id}`}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 mt-2 print:hidden"
                >
                  Xem trang chỗ nghỉ
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Itinerary & Guest Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Nhận phòng (Check-in)
                </span>
                <span className="font-bold text-slate-900 text-sm block mt-0.5">
                  14:00 • {booking.checkIn}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Trả phòng (Check-out)
                </span>
                <span className="font-bold text-slate-900 text-sm block mt-0.5">
                  12:00 • {booking.checkOut}
                </span>
              </div>
              <div className="pt-3 border-t border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Khách lưu trú
                </span>
                <span className="font-bold text-slate-900 block mt-0.5">
                  {booking.guestInfo.fullName}
                </span>
                <span className="text-slate-500 block">
                  {booking.guestInfo.phone} • {booking.guestInfo.email}
                </span>
                <span className="text-slate-500 block mt-0.5">
                  {booking.nights} đêm • {booking.guests.adults} người lớn
                  {booking.guests.children > 0 ? `, ${booking.guests.children} trẻ em` : ""}
                  {booking.guests.rooms > 1 ? ` • ${booking.guests.rooms} phòng` : ""}
                </span>
              </div>
              <div className="pt-3 border-t border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Phương thức thanh toán
                </span>
                <span className="font-bold text-slate-900 block mt-0.5">
                  {PAYMENT_METHOD_LABELS[booking.paymentMethod]}
                </span>
                {booking.payment && (
                  <span className="text-[11px] font-mono text-slate-500 block mt-0.5">
                    Mã GD: {booking.payment.transactionId} ({booking.payment.status})
                  </span>
                )}
                {booking.guestInfo.note && (
                  <span className="text-slate-500 block mt-1 italic">
                    Ghi chú: &ldquo;{booking.guestInfo.note}&rdquo;
                  </span>
                )}
              </div>
            </div>

            {/* Selected Amenities */}
            {booking.selectedAmenities.length > 0 && (
              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 space-y-2.5">
                <div className="flex items-center justify-between text-xs font-bold text-emerald-900">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    <span>
                      Tiện ích &amp; dịch vụ đi kèm ({booking.selectedAmenities.length})
                    </span>
                  </div>
                  {booking.pricing.amenitiesFee > 0 && (
                    <span className="text-emerald-700">
                      {formatAmenitiesFeeSummary(booking.pricing.amenitiesFee)}
                    </span>
                  )}
                </div>
                <div className="space-y-1.5">
                  {booking.selectedAmenities.map((item) => {
                    const display = describeSelectedAmenity(item);
                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-2 text-xs bg-white/90 px-3 py-2 rounded-xl border border-emerald-100"
                      >
                        <span className="font-medium text-slate-800 truncate">{item.name}</span>
                        <span
                          className={`font-bold shrink-0 ${
                            display.tone === "paid" ? "text-amber-700" : "text-teal-700"
                          }`}
                        >
                          {display.confirmedFee}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Selected Bundle Activities & Transfers */}
            {(booking.selectedActivities?.length ?? 0) > 0 && (
              <div
                data-testid="booking-bundle-activities"
                className="p-4 rounded-2xl bg-sky-50/70 border border-sky-200/80 space-y-2.5"
              >
                <div className="flex items-center justify-between text-xs font-bold text-sky-950">
                  <span>
                    Trải nghiệm &amp; Đưa đón đi kèm ({booking.selectedActivities?.length ?? 0})
                  </span>
                  <span className="text-sky-700">
                    {formatVND(booking.pricing.activitiesFee ?? 0)}
                  </span>
                </div>
                {activityCancelError && (
                  <p className="text-xs font-semibold text-rose-700">{activityCancelError}</p>
                )}
                <div className="space-y-2">
                  {(booking.selectedActivities ?? []).map((item) => {
                    const isItemCancelled = item.status === "cancelled";
                    const canCancelItem =
                      !isItemCancelled &&
                      booking.status !== "cancelled" &&
                      booking.status !== "completed";

                    return (
                      <div
                        key={item.id}
                        data-testid={`bundle-activity-row-${item.id}`}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs bg-white px-3.5 py-2.5 rounded-xl border border-sky-100"
                      >
                        <div className="min-w-0 space-y-0.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`font-bold ${
                                isItemCancelled ? "line-through text-slate-400" : "text-slate-900"
                              }`}
                            >
                              {item.activityTitle}
                            </span>
                            <span
                              data-testid={`bundle-activity-status-${item.id}`}
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isItemCancelled
                                  ? "bg-rose-100 text-rose-700"
                                  : "bg-emerald-100 text-emerald-700"
                              }`}
                            >
                              {isItemCancelled ? "Đã hủy" : "Đã xác nhận"}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {item.dateIso} • {item.slotLabel} • {item.quantity} {item.unitLabel}
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5 shrink-0">
                          <span
                            className={`font-bold ${
                              isItemCancelled ? "line-through text-slate-400" : "text-sky-800"
                            }`}
                          >
                            {formatVND(item.totalPrice)}
                          </span>
                          {canCancelItem && (
                            <button
                              type="button"
                              data-testid={`cancel-bundle-activity-${item.id}`}
                              disabled={cancellingActivityItemId === item.id}
                              onClick={async () => {
                                setCancellingActivityItemId(item.id);
                                setActivityCancelError(null);
                                try {
                                  const updated = await cancelReservationActivityItem(
                                    booking.bookingId ?? bookingId,
                                    item.id,
                                    {
                                      contact: verifiedContact || booking.guestInfo.email,
                                      reason: "Khách hủy riêng dịch vụ đi kèm",
                                    }
                                  );
                                  setBooking(updated);
                                } catch (err) {
                                  setActivityCancelError(
                                    err instanceof HttpApiError
                                      ? err.message
                                      : "Không thể hủy dịch vụ đi kèm lúc này."
                                  );
                                } finally {
                                  setCancellingActivityItemId(null);
                                }
                              }}
                              className="px-2.5 py-1 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 font-bold text-[11px] cursor-pointer transition-colors disabled:opacity-50"
                            >
                              {cancellingActivityItemId === item.id
                                ? "Đang hủy..."
                                : "Hủy dịch vụ này"}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Pricing Breakdown */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2 text-xs">
              <SeasonalPricingSummary
                pricing={booking.pricing}
                nights={booking.nights}
                rooms={booking.guests.rooms}
              />
              <div className="flex justify-between text-slate-600">
                <span>Phí dịch vụ &amp; dọn dẹp</span>
                <span>{formatVND(booking.pricing.cleaningFee)}</span>
              </div>
              {booking.pricing.amenitiesFee > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Phí tiện ích chọn thêm</span>
                  <span>{formatVND(booking.pricing.amenitiesFee)}</span>
                </div>
              )}
              {(booking.pricing.activitiesFee ?? 0) > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Phí trải nghiệm &amp; đưa đón</span>
                  <span data-testid="booking-activities-fee">
                    {formatVND(booking.pricing.activitiesFee ?? 0)}
                  </span>
                </div>
              )}
              {booking.pricing.discount > 0 && (
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>
                    Mã ưu đãi{" "}
                    {booking.pricing.appliedPromoCode
                      ? `(${booking.pricing.appliedPromoCode})`
                      : ""}
                  </span>
                  <span>-{formatVND(booking.pricing.discount)}</span>
                </div>
              )}
              <div className="pt-2 border-t border-slate-200 flex justify-between text-base font-bold text-slate-900">
                <span>Tổng thanh toán</span>
                <span className="text-lg font-black text-emerald-700" data-testid="booking-detail-total">
                  {formatVND(booking.pricing.total)}
                </span>
              </div>
            </div>

            {/* Sent Email Notification Logs */}
            {notifications.length > 0 && (
              <div className="p-4 rounded-2xl bg-sky-50/70 border border-sky-200/80 space-y-3 print:hidden">
                <div className="flex items-center gap-2 text-xs font-bold text-sky-900">
                  <Mail className="w-4 h-4 text-sky-600" />
                  <span>Email xác nhận &amp; thông báo đã gửi ({notifications.length})</span>
                </div>
                <div className="space-y-2">
                  {notifications.map((item) => {
                    const expanded = expandedEmailId === item.id;
                    return (
                      <div
                        key={item.id}
                        className="bg-white rounded-xl border border-sky-100 p-3 space-y-2 text-xs"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 truncate">{item.subject}</div>
                            <div className="text-[11px] text-slate-500">
                              Tới: {item.recipientEmail} •{" "}
                              {new Date(item.createdAt).toLocaleString("vi-VN")}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setExpandedEmailId(expanded ? null : item.id)}
                            className="text-[11px] font-bold text-sky-700 hover:text-sky-900 shrink-0"
                          >
                            {expanded ? "Thu gọn" : "Xem nội dung email"}
                          </button>
                        </div>
                        <p className="text-[11px] text-slate-600">{item.previewText}</p>
                        {expanded && (
                          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 overflow-x-auto">
                            <iframe
                              title={item.subject}
                              srcDoc={item.htmlBody}
                              sandbox=""
                              className="w-full h-56 border-0 bg-white rounded"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Host instructions */}
            {booking.status === "confirmed" && (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-start gap-3 text-xs text-amber-900">
                <PhoneCall className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">Hướng dẫn nhận phòng:</span>
                  <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                    Chủ nhà ({booking.property.host.name}) sẽ gửi mã khóa cửa thông minh và vị trí
                    định vị qua Zalo/SMS tới số điện thoại{" "}
                    <strong>{booking.guestInfo.phone}</strong> trước giờ check-in.
                  </p>
                </div>
              </div>
            )}

            {/* Sandbox Stay Completion Action (for QA / Demo testing verified reviews) */}
            {booking.status === "confirmed" && (
              <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs print:hidden">
                <div className="flex items-start gap-2.5 text-indigo-950">
                  <Award className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">
                      Đã hoàn tất kỳ nghỉ? (Chế độ Sandbox)
                    </span>
                    <p className="text-[11px] text-indigo-800 mt-0.5">
                      Xác nhận trả phòng sớm trong Sandbox để mở khóa quyền gửi đánh giá xác thực.
                    </p>
                    {completeError && (
                      <p className="text-[11px] font-semibold text-rose-700 mt-1">
                        {completeError}
                      </p>
                    )}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  isLoading={isCompleting}
                  onClick={handleCompleteStay}
                  className="shrink-0 border-indigo-300 text-indigo-800 hover:bg-indigo-100 font-bold"
                >
                  Hoàn tất lưu trú
                </Button>
              </div>
            )}

            {/* Verified Review Form (when completed or confirmed past check-out) */}
            {(booking.status === "completed" ||
              (booking.status === "confirmed" && hasCheckoutDatePassed(booking.checkOut))) && (
              <div className="p-5 rounded-2xl bg-emerald-50/60 border border-emerald-200 space-y-4 print:hidden">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="w-3 h-3" />
                      Đánh giá xác thực lưu trú
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 mt-1">
                      Chia sẻ trải nghiệm tại {booking.property.title}
                    </h3>
                  </div>
                </div>

                {reviewSuccess ? (
                  <div className="p-4 rounded-xl bg-white border border-emerald-200 space-y-2 text-xs">
                    <div className="flex items-center gap-2 font-bold text-emerald-800">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Cảm ơn bạn! Đánh giá xác thực đã được đăng thành công.</span>
                    </div>
                    <p className="text-slate-600">
                      Điểm trung bình mới của chỗ nghỉ:{" "}
                      <strong className="text-slate-900">
                        {reviewSuccess.rating} / 5 ({reviewSuccess.reviewCount} đánh giá)
                      </strong>
                      .
                    </p>
                    <Link
                      href={`/stays/${booking.property.id}`}
                      className="inline-flex items-center gap-1 font-bold text-emerald-700 hover:underline pt-1"
                    >
                      Xem đánh giá của bạn trên trang chỗ nghỉ
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                ) : (
                  <form onSubmit={handleSubmitReview} className="space-y-3.5">
                    <div>
                      <span className="block text-[11px] font-bold text-slate-700 mb-1.5">
                        Mức độ hài lòng của bạn
                      </span>
                      <div className="flex items-center gap-1.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setReviewRating(star)}
                            aria-label={`Đánh giá ${star} sao`}
                            className="p-1.5 rounded-xl bg-white border border-slate-200 hover:border-amber-400 transition-colors"
                          >
                            <Star
                              className={`w-5 h-5 ${
                                star <= reviewRating
                                  ? "fill-amber-400 text-amber-400"
                                  : "text-slate-300"
                              }`}
                            />
                          </button>
                        ))}
                        <span className="ml-2 text-xs font-bold text-amber-700">
                          {reviewRating} / 5 sao
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-bold text-slate-700">
                        Nhận xét chi tiết (tối thiểu 10 ký tự)
                      </label>
                      <textarea
                        rows={3}
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                        placeholder="Không gian, tiện ích, độ sạch sẽ và sự hỗ trợ của chủ nhà như thế nào?"
                        className="w-full rounded-xl bg-white border border-slate-200 p-3 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                        required
                      />
                    </div>

                    {reviewError && (
                      <div
                        role="alert"
                        className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-800 flex items-center gap-2"
                      >
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>{reviewError}</span>
                      </div>
                    )}

                    <Button
                      type="submit"
                      variant="primary"
                      isLoading={isSubmittingReview}
                      className="w-full sm:w-auto font-bold"
                    >
                      Gửi đánh giá xác thực
                    </Button>
                  </form>
                )}
              </div>
            )}

            {/* Policy note when confirmed booking is non-free-cancellation */}
            {booking.status === "confirmed" && !booking.property.freeCancellation && (
              <div className="p-4 rounded-2xl bg-slate-100 border border-slate-200 flex items-start gap-3 text-xs text-slate-700 print:hidden">
                <ShieldAlert className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">Chính sách hủy đặt phòng</span>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Chỗ nghỉ này không hỗ trợ hủy miễn phí trực tuyến. Nếu cần thay đổi lịch trình,
                    vui lòng liên hệ bộ phận hỗ trợ LuxeStay.
                  </p>
                </div>
              </div>
            )}

            {/* Cancellation Confirmation Form */}
            {showCancelForm && canCancelOnline && (
              <form
                onSubmit={handleCancelBooking}
                className="p-5 rounded-2xl bg-rose-50/70 border border-rose-200 space-y-4 print:hidden"
              >
                <div>
                  <h3 className="text-sm font-bold text-rose-900">
                    Xác nhận hủy đơn {booking.bookingId}
                  </h3>
                  <p className="text-xs text-rose-800 mt-0.5">
                    Thao tác này sẽ chuyển đơn đặt phòng sang trạng thái đã hủy và không thể hoàn
                    tác.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-rose-900">
                    Lý do hủy phòng (Tùy chọn)
                  </label>
                  <textarea
                    rows={2}
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="Ví dụ: Thay đổi lịch trình công tác, đổi ngày đi..."
                    className="w-full rounded-xl bg-white border border-rose-200 p-3 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500"
                  />
                </div>

                {cancelError && (
                  <div
                    role="alert"
                    className="p-3 rounded-xl bg-white border border-rose-300 text-xs font-semibold text-rose-700 flex items-center gap-2"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{cancelError}</span>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-2.5">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowCancelForm(false);
                      setCancelError(null);
                    }}
                    disabled={isCancelling}
                    className="flex-1 justify-center"
                  >
                    Giữ lại đặt phòng
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    isLoading={isCancelling}
                    className="flex-1 justify-center bg-rose-600 hover:bg-rose-700"
                  >
                    Xác nhận hủy đơn
                  </Button>
                </div>
              </form>
            )}

            {/* Footer Actions */}
            <div className="flex flex-col sm:flex-row gap-3 print:hidden">
              <Button
                type="button"
                variant="outline"
                className="flex-1 justify-center"
                onClick={() => window.print()}
              >
                <Download className="w-4 h-4 mr-2" />
                In / Lưu vé xác nhận PDF
              </Button>
              {canCancelOnline && !showCancelForm && (
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 justify-center border-rose-200 text-rose-700 hover:bg-rose-50"
                  onClick={() => setShowCancelForm(true)}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Hủy đặt phòng
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
