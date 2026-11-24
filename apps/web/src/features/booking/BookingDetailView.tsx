"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Download,
  ExternalLink,
  MapPin,
  PhoneCall,
  ShieldAlert,
  Sparkles,
  XCircle,
} from "lucide-react";
import type { BookingDetails } from "@luxestay/contracts";
import {
  describeSelectedAmenity,
  formatAmenitiesFeeSummary,
  formatVND,
} from "@luxestay/domain";
import { useBookingSession } from "@/features/booking/BookingContext";
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

export function BookingDetailView({
  bookingId,
  initialContact = "",
}: BookingDetailViewProps) {
  const router = useRouter();
  const { lookupReservation, cancelReservation } = useBookingSession();

  const [contactInput, setContactInput] = useState(initialContact);
  const [verifiedContact, setVerifiedContact] = useState(initialContact.trim());
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(initialContact.trim()));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Cancellation flow state
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const lastLoadedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const trimmed = initialContact.trim();
    if (!trimmed) return;
    const key = `${bookingId.toUpperCase()}::${trimmed}`;
    if (lastLoadedKeyRef.current === key) return;

    const controller = new AbortController();
    lookupReservation(bookingId, trimmed, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        lastLoadedKeyRef.current = key;
        setBooking(result);
        setVerifiedContact(trimmed);
        setErrorMessage(null);
        setIsLoading(false);
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
  }, [bookingId, initialContact, lookupReservation]);

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
    if (!booking || !verifiedContact) return;
    setCancelError(null);
    setIsCancelling(true);
    try {
      const updated = await cancelReservation(booking.bookingId ?? bookingId, {
        contact: verifiedContact,
        reason: cancelReason,
      });
      setBooking(updated);
      setShowCancelForm(false);
      setCancelReason("");
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

  if (isLoading) {
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
                Xác minh thông tin chủ đơn
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Nhập email hoặc số điện thoại bạn đã dùng khi đặt phòng để xem chi tiết vé.
              </p>
            </div>

            <form onSubmit={handleVerifySubmit} className="space-y-4">
              <Input
                label="Email hoặc Số điện thoại"
                value={contactInput}
                onChange={(e) => setContactInput(e.target.value)}
                placeholder="guest@luxestay.vn hoặc 0912 345 678"
                required
              />

              {errorMessage && (
                <div
                  role="alert"
                  className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 flex items-center gap-2.5 text-xs font-semibold text-rose-800"
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

  const isCancelled = booking.status === "cancelled";
  const canCancelOnline = !isCancelled && Boolean(booking.property.freeCancellation);

  return (
    <div className="min-h-[80vh] bg-slate-50 py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4 print:hidden">
          <Link
            href="/bookings"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-emerald-700"
          >
            <ArrowLeft className="w-4 h-4" />
            Tra cứu đơn khác
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
          <div
            className={`p-6 sm:p-8 text-white ${
              isCancelled
                ? "bg-gradient-to-r from-slate-700 via-slate-800 to-slate-900"
                : "bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700"
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {isCancelled ? (
                  <XCircle className="w-9 h-9 text-rose-300 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-9 h-9 text-white shrink-0" />
                )}
                <div>
                  <span
                    className={`inline-block text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                      isCancelled
                        ? "bg-rose-500/25 text-rose-200"
                        : "bg-white/20 text-emerald-50"
                    }`}
                  >
                    {isCancelled ? "Đơn đã hủy" : "Đã xác nhận"}
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
                {booking.guestInfo.note && (
                  <span className="text-slate-500 block mt-1">
                    Ghi chú: {booking.guestInfo.note}
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
                  <span className="text-emerald-700">
                    {formatAmenitiesFeeSummary(booking.pricing.amenitiesFee)}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {booking.selectedAmenities.map((item) => {
                    const display = describeSelectedAmenity(item);
                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-2 text-xs bg-white px-3 py-2 rounded-xl border border-emerald-100"
                      >
                        <span className="font-medium text-slate-800">{item.name}</span>
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

            {/* Pricing Breakdown */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>
                  Giá phòng ({formatVND(booking.pricing.basePrice)} × {booking.nights} đêm)
                </span>
                <span>{formatVND(booking.pricing.nightsTotal)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Phí dịch vụ &amp; dọn dẹp</span>
                <span>{formatVND(booking.pricing.cleaningFee)}</span>
              </div>
              {booking.selectedAmenities.length > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Phụ phí tiện ích đi kèm</span>
                  <span>{formatAmenitiesFeeSummary(booking.pricing.amenitiesFee)}</span>
                </div>
              )}
              <div className="flex justify-between text-emerald-700 font-semibold">
                <span>Giảm giá khuyến mãi</span>
                <span>-{formatVND(booking.pricing.discount)}</span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between text-base font-bold text-slate-900">
                <span>Tổng thanh toán</span>
                <span className="text-emerald-700 font-black">
                  {formatVND(booking.pricing.total)}
                </span>
              </div>
            </div>

            {/* Host Notice */}
            {!isCancelled && (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-start gap-3 text-xs text-amber-900">
                <PhoneCall className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">Hướng dẫn nhận phòng:</span>
                  <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                    Chủ nhà ({booking.property.host.name}) sẽ gửi hướng dẫn check-in tới{" "}
                    <strong>{booking.guestInfo.phone}</strong> trước giờ nhận phòng.
                  </p>
                </div>
              </div>
            )}

            {/* Actions & Cancellation */}
            <div className="space-y-4 print:hidden">
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  variant="outline"
                  className="flex-1 justify-center"
                  onClick={() => window.print()}
                >
                  <Download className="w-4 h-4 mr-2" />
                  In / Lưu vé PDF
                </Button>

                {canCancelOnline && !showCancelForm && (
                  <Button
                    variant="outline"
                    className="flex-1 justify-center border-rose-200 text-rose-700 hover:bg-rose-50 hover:border-rose-300"
                    onClick={() => setShowCancelForm(true)}
                  >
                    Hủy đặt phòng miễn phí
                  </Button>
                )}
              </div>

              {!isCancelled && !booking.property.freeCancellation && (
                <div className="p-3.5 rounded-2xl bg-slate-100 text-xs text-slate-600 flex items-start gap-2.5">
                  <ShieldAlert className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                  <span>
                    Chỗ nghỉ này không áp dụng chính sách hủy miễn phí trực tuyến. Nếu cần thay đổi
                    lịch trình, vui lòng liên hệ đội ngũ hỗ trợ LuxeStay.
                  </span>
                </div>
              )}

              {canCancelOnline && showCancelForm && (
                <form
                  onSubmit={handleCancelBooking}
                  className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200 space-y-3"
                >
                  <h3 className="text-sm font-bold text-rose-900">
                    Xác nhận hủy đặt phòng miễn phí
                  </h3>
                  <p className="text-xs text-rose-700">
                    Thao tác hủy phòng không thể hoàn tác. Bạn vẫn có thể xem lại biên nhận đã hủy
                    sau đó.
                  </p>
                  <textarea
                    rows={2}
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="Lý do hủy (tùy chọn, ví dụ: thay đổi lịch trình)..."
                    className="w-full rounded-xl bg-white border border-rose-200 p-3 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/30"
                  />

                  {cancelError && (
                    <div
                      role="alert"
                      className="text-xs font-semibold text-rose-800 flex items-center gap-1.5"
                    >
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>{cancelError}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowCancelForm(false);
                        setCancelError(null);
                      }}
                    >
                      Giữ lại đơn
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      isLoading={isCancelling}
                      className="bg-rose-600 hover:bg-rose-700"
                    >
                      Xác nhận hủy đơn
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
