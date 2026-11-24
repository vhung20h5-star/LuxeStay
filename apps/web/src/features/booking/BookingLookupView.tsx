"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  Search,
  ShieldCheck,
  Ticket,
} from "lucide-react";
import { ReservationLookupInputSchema } from "@luxestay/contracts";
import { useBookingSession } from "@/features/booking/BookingContext";
import { HttpApiError } from "@/shared/ports/errors";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";

export function BookingLookupView() {
  const router = useRouter();
  const { lookupReservation } = useBookingSession();

  const [bookingId, setBookingId] = useState("");
  const [contact, setContact] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const parsed = ReservationLookupInputSchema.safeParse({ bookingId, contact });
    if (!parsed.success) {
      setErrorMessage(
        parsed.error.issues[0]?.message ?? "Vui lòng nhập đầy đủ mã đặt phòng và email/SĐT."
      );
      return;
    }

    setIsLoading(true);
    try {
      const booking = await lookupReservation(parsed.data.bookingId, parsed.data.contact);
      const id = booking.bookingId ?? parsed.data.bookingId;
      router.push(
        `/bookings/${encodeURIComponent(id)}?contact=${encodeURIComponent(parsed.data.contact)}`
      );
    } catch (err) {
      if (err instanceof HttpApiError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("Không thể tra cứu đơn đặt phòng lúc này. Vui lòng thử lại!");
      }
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[75vh] bg-slate-50 py-10 sm:py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl mx-auto space-y-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-emerald-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Quay về trang chủ
        </Link>

        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xl p-6 sm:p-8 space-y-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <Ticket className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Tra cứu &amp; Quản lý Đặt phòng
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Nhập mã đặt phòng (<span className="font-mono font-semibold">LX-XXXXXX</span>) và
                email hoặc số điện thoại bạn đã dùng khi đặt để xem vé điện tử hoặc hủy phòng.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <Input
              label="Mã đặt phòng"
              value={bookingId}
              onChange={(e) => setBookingId(e.target.value)}
              placeholder="Ví dụ: LX-5E00C5"
              required
            />

            <Input
              label="Email hoặc Số điện thoại đặt phòng"
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
              Tra cứu đơn đặt phòng
            </Button>
          </form>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-start gap-2.5 text-xs text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>
              Để bảo vệ quyền riêng tư của khách hàng, hệ thống yêu cầu khớp đúng cả mã đơn lẫn
              email hoặc số điện thoại đã đăng ký.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
