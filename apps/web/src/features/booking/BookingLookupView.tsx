"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  AlertCircle,
  ArrowLeft,
  Clock,
  CreditCard,
  Search,
  ShieldCheck,
  Ticket,
  UserCheck,
} from "lucide-react";
import {
  ReservationLookupInputSchema,
  type ActivityBooking,
  type BookingDetails,
  type ReservationStatus,
} from "@luxestay/contracts";
import { formatVND } from "@luxestay/domain";
import { useAuth } from "@/features/auth/AuthContext";
import { useBookingSession } from "@/features/booking/BookingContext";
import { HttpApiError, isAbortError } from "@/shared/ports/errors";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";

const STATUS_BADGE: Record<ReservationStatus, { label: string; className: string }> = {
  pending_payment: {
    label: "Chờ thanh toán",
    className: "bg-amber-100 text-amber-800 border-amber-200",
  },
  confirmed: {
    label: "Đã xác nhận",
    className: "bg-emerald-100 text-emerald-800 border-emerald-200",
  },
  completed: {
    label: "Hoàn tất lưu trú",
    className: "bg-indigo-100 text-indigo-800 border-indigo-200",
  },
  payment_failed: {
    label: "Thanh toán thất bại",
    className: "bg-rose-100 text-rose-800 border-rose-200",
  },
  expired: {
    label: "Đã hết hạn",
    className: "bg-slate-200 text-slate-700 border-slate-300",
  },
  cancelled: {
    label: "Đã hủy",
    className: "bg-rose-100 text-rose-700 border-rose-200",
  },
};

export function BookingLookupView() {
  const router = useRouter();
  const { user, setAuthModalOpen } = useAuth();
  const { lookupReservation, listMyReservations, activitiesPort } = useBookingSession();

  const [bookingId, setBookingId] = useState("");
  const [contact, setContact] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lookedUpActivityBooking, setLookedUpActivityBooking] = useState<ActivityBooking | null>(
    null
  );
  const [isCancellingActivity, setIsCancellingActivity] = useState(false);

  const [myBookings, setMyBookings] = useState<readonly BookingDetails[]>([]);
  const [myActivityBookings, setMyActivityBookings] = useState<readonly ActivityBooking[]>([]);
  const [isLoadingMine, setIsLoadingMine] = useState(false);

  useEffect(() => {
    if (!user) return;
    const controller = new AbortController();
    Promise.all([
      listMyReservations(controller.signal),
      activitiesPort.listMyBookings({ signal: controller.signal }).catch(() => []),
    ])
      .then(([stayItems, activityItems]) => {
        if (!controller.signal.aborted) {
          setMyBookings(stayItems);
          setMyActivityBookings(activityItems);
          setIsLoadingMine(false);
        }
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted || isAbortError(err)) return;
        setIsLoadingMine(false);
      });

    return () => controller.abort();
  }, [activitiesPort, listMyReservations, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLookedUpActivityBooking(null);

    const parsed = ReservationLookupInputSchema.safeParse({ bookingId, contact });
    if (!parsed.success) {
      setErrorMessage(
        parsed.error.issues[0]?.message ?? "Vui lòng nhập đầy đủ mã đặt phòng và email/SĐT."
      );
      return;
    }

    setIsLoading(true);
    try {
      if (parsed.data.bookingId.startsWith("ACT-")) {
        const actBooking = await activitiesPort.lookupBooking(
          parsed.data.bookingId,
          parsed.data.contact
        );
        setLookedUpActivityBooking(actBooking);
        setIsLoading(false);
        return;
      }

      const booking = await lookupReservation(parsed.data.bookingId, parsed.data.contact);
      const id = booking.bookingId ?? parsed.data.bookingId;
      router.push(
        `/bookings/${encodeURIComponent(id)}?contact=${encodeURIComponent(parsed.data.contact)}`
      );
    } catch (err) {
      if (err instanceof HttpApiError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("Không thể tra cứu đơn lúc này. Vui lòng thử lại!");
      }
      setIsLoading(false);
    }
  };

  const handleCancelLookedUpActivity = async () => {
    if (!lookedUpActivityBooking) return;
    setIsCancellingActivity(true);
    try {
      const updated = await activitiesPort.cancelBooking(lookedUpActivityBooking.bookingId, {
        contact: contact.trim() || lookedUpActivityBooking.guestInfo.email,
        reason: "Khách hủy đơn dịch vụ qua trang tra cứu",
      });
      setLookedUpActivityBooking(updated);
    } catch (err) {
      setErrorMessage(err instanceof HttpApiError ? err.message : "Không thể hủy đơn dịch vụ.");
    } finally {
      setIsCancellingActivity(false);
    }
  };

  return (
    <div className="min-h-[75vh] bg-slate-50 py-10 sm:py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-emerald-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Quay về trang chủ
        </Link>

        {/* Authenticated User's Bookings List */}
        {user ? (
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xl p-6 sm:p-8 space-y-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900">Đơn đặt phòng của bạn</h2>
                  <p className="text-xs text-slate-500">
                    Đang đăng nhập với <strong>{user.fullName}</strong> ({user.email})
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full">
                {myBookings.length} đơn
              </span>
            </div>

            {isLoadingMine ? (
              <div className="py-6 text-center text-xs text-slate-500">
                Đang tải lịch sử đặt phòng...
              </div>
            ) : myBookings.length === 0 ? (
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 text-center text-xs text-slate-500">
                Bạn chưa có đơn đặt phòng nào gắn với tài khoản này. Khám phá chỗ nghỉ và đặt ngay!
              </div>
            ) : (
              <div className="space-y-3">
                {myBookings.map((item) => {
                  const badge = STATUS_BADGE[item.status] ?? STATUS_BADGE.confirmed;
                  const id = item.bookingId ?? "";
                  return (
                    <div
                      key={id}
                      className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row gap-4 sm:items-center justify-between"
                    >
                      <div className="flex gap-3 min-w-0">
                        <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0">
                          <Image
                            src={item.property.images[0]}
                            alt={item.property.title}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-xs font-black text-emerald-700">
                              {id}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badge.className}`}
                            >
                              {badge.label}
                            </span>
                          </div>
                          <div className="text-sm font-bold text-slate-900 truncate">
                            {item.property.title}
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-2">
                            <span>
                              {item.checkIn} → {item.checkOut} ({item.nights} đêm)
                            </span>
                            <span>•</span>
                            <span className="font-bold text-slate-800">
                              {formatVND(item.pricing.total)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {item.status === "pending_payment" && item.payment?.checkoutUrl && (
                          <Link
                            href={item.payment.checkoutUrl}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-colors"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            Thanh toán ngay
                          </Link>
                        )}
                        <Link
                          href={`/bookings/${encodeURIComponent(id)}`}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:border-emerald-400 text-slate-700 hover:text-emerald-700 text-xs font-bold transition-colors"
                        >
                          Xem chi tiết
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {myActivityBookings.length > 0 && (
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Đơn Trải nghiệm &amp; Đưa đón ({myActivityBookings.length})
                </div>
                {myActivityBookings.map((act) => (
                  <div
                    key={act.bookingId}
                    className="p-3.5 rounded-2xl bg-sky-50/60 border border-sky-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-sky-800">{act.bookingId}</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            act.status === "cancelled"
                              ? "bg-rose-100 text-rose-700"
                              : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {act.status === "cancelled" ? "Đã hủy" : "Đã xác nhận"}
                        </span>
                      </div>
                      <div className="font-bold text-slate-900 truncate mt-0.5">
                        {act.activityTitle}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {act.dateIso} • {act.slotLabel} • {formatVND(act.total)}
                      </div>
                    </div>
                    <Link
                      href={`/activities/${act.activitySlug}`}
                      className="text-xs font-bold text-sky-700 hover:underline shrink-0"
                    >
                      Xem dịch vụ →
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 text-emerald-900">
              <Clock className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                <strong>Đăng nhập tài khoản LuxeStay</strong> để xem toàn bộ lịch sử đặt phòng mà
                không cần nhập mã thủ công.
              </span>
            </div>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => setAuthModalOpen(true)}
            >
              Đăng nhập ngay
            </Button>
          </div>
        )}

        {/* Guest Lookup Form */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xl p-6 sm:p-8 space-y-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <Ticket className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Tra cứu đơn đặt phòng &amp; dịch vụ
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Nhập mã đơn phòng (<span className="font-mono font-semibold">LX-XXXXXX</span>) hoặc
                mã trải nghiệm/đưa đón (<span className="font-mono font-semibold">ACT-XXXXXX</span>)
                cùng email/SĐT đã đăng ký để xem biên lai hoặc hủy đơn.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <Input
              label="Mã đơn đặt phòng hoặc dịch vụ"
              value={bookingId}
              onChange={(e) => setBookingId(e.target.value)}
              placeholder="Ví dụ: LX-5E00C5 hoặc ACT-9A12BC"
              required
            />

            <Input
              label="Email hoặc Số điện thoại đặt chỗ"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="Ví dụ: guest@luxestay.vn hoặc 0912 345 678"
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

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isLoading}
              className="w-full justify-center font-bold"
            >
              <Search className="w-4 h-4 mr-2" />
              Tra cứu đơn ngay
            </Button>
          </form>

          {lookedUpActivityBooking && (
            <div
              data-testid="looked-up-activity-booking"
              className="p-4 rounded-2xl bg-sky-50/70 border border-sky-200 space-y-3 text-xs"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono font-black text-sm text-sky-900">
                  {lookedUpActivityBooking.bookingId}
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full font-bold ${
                    lookedUpActivityBooking.status === "cancelled"
                      ? "bg-rose-100 text-rose-700"
                      : "bg-emerald-100 text-emerald-700"
                  }`}
                >
                  {lookedUpActivityBooking.status === "cancelled" ? "Đã hủy" : "Đã xác nhận"}
                </span>
              </div>
              <div className="font-bold text-slate-900 text-sm">
                {lookedUpActivityBooking.activityTitle}
              </div>
              <div className="text-slate-600">
                {lookedUpActivityBooking.dateIso} • {lookedUpActivityBooking.slotLabel} •{" "}
                {lookedUpActivityBooking.quantity} {lookedUpActivityBooking.unitLabel}
              </div>
              <div className="font-black text-emerald-700 text-sm">
                Tổng thanh toán: {formatVND(lookedUpActivityBooking.total)}
              </div>
              {lookedUpActivityBooking.status === "confirmed" &&
                lookedUpActivityBooking.freeCancellation && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isCancellingActivity}
                    onClick={handleCancelLookedUpActivity}
                    className="border-rose-200 text-rose-700 hover:bg-rose-50"
                  >
                    {isCancellingActivity ? "Đang hủy..." : "Hủy đơn dịch vụ này"}
                  </Button>
                )}
            </div>
          )}

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-start gap-2.5 text-xs text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>
              Để bảo vệ quyền riêng tư của khách hàng, hệ thống yêu cầu khớp đúng cả mã đơn lẫn
              email hoặc số điện thoại đã đăng ký (hoặc đăng nhập bằng tài khoản chủ đơn).
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
