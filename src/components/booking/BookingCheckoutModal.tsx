"use client";

import React, { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { X, ShieldCheck, Lock } from "lucide-react";
import { useBooking } from "@/context/BookingContext";
import { formatVND } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { BookingDetails } from "@/types";

export function BookingCheckoutModal() {
  const { checkoutProperty, setCheckoutProperty, setBookingSuccess } = useBooking();

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [fullName, setFullName] = useState("Nguyễn Văn A");
  const [phone, setPhone] = useState("0912 345 678");
  const [email, setEmail] = useState("nguyenvana@gmail.com");
  const [note, setNote] = useState("Vui lòng chuẩn bị phòng tầng cao view thoáng giúp mình.");
  const [paymentMethod, setPaymentMethod] = useState<"momo" | "vnpay" | "card" | "hotel">("momo");

  if (!checkoutProperty) return null;

  const nights = 2;
  const baseTotal = checkoutProperty.pricePerNight * nights;
  const cleaningFee = 150000;
  const discount = 100000;
  const total = baseTotal + cleaningFee - discount;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !phone || !email) {
      alert("Vui lòng điền đầy đủ họ tên, số điện thoại và email!");
      return;
    }

    setIsSubmitting(true);

    setTimeout(() => {
      const randomBookingId = `LX-${Math.floor(100000 + Math.random() * 900000)}`;

      const bookingInfo: BookingDetails = {
        property: checkoutProperty,
        checkIn: "15/11/2026",
        checkOut: "17/11/2026",
        nights,
        guests: {
          adults: 2,
          children: 0,
          rooms: 1,
        },
        pricing: {
          basePrice: checkoutProperty.pricePerNight,
          nightsTotal: baseTotal,
          cleaningFee,
          serviceFee: 0,
          discount,
          total,
        },
        guestInfo: {
          fullName,
          email,
          phone,
          note,
        },
        paymentMethod,
        bookingId: randomBookingId,
        createdAt: new Date().toISOString(),
      };

      setIsSubmitting(false);
      setCheckoutProperty(null);
      setBookingSuccess(bookingInfo);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => setCheckoutProperty(null)}
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-md"
      />

      <div className="min-h-full flex items-center justify-center p-3 sm:p-6 my-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden z-10 my-auto"
        >
          {/* Header */}
          <div className="p-5 sm:px-6 bg-white border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-slate-900">Xác nhận đặt phòng</h3>
              <p className="text-xs text-slate-500">Hoàn tất chỉ trong 1 phút • Bảo mật 256-bit SSL</p>
            </div>
            <button
              onClick={() => setCheckoutProperty(null)}
              className="p-2 text-slate-400 hover:text-slate-700 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-5 sm:p-8 space-y-6 max-h-[80vh] overflow-y-auto">
            {/* Stay Summary Card */}
            <div className="flex gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div className="relative w-20 h-20 rounded-xl overflow-hidden shrink-0">
                <Image
                  src={checkoutProperty.images[0]}
                  alt={checkoutProperty.title}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">
                  {checkoutProperty.location.city}
                </div>
                <h4 className="text-sm font-bold text-slate-900 truncate mt-0.5">
                  {checkoutProperty.title}
                </h4>
                <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                  <span>★ {checkoutProperty.rating}</span>
                  <span>•</span>
                  <span>{nights} đêm nghỉ</span>
                  <span>•</span>
                  <span>2 người lớn</span>
                </div>
              </div>
            </div>

            {/* Step 1: Guest Information */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs">
                  1
                </div>
                <span>Thông tin khách lưu trú</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Họ và tên đầy đủ"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ví dụ: Nguyễn Văn A"
                  required
                />
                <Input
                  label="Số điện thoại"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0912 345 678"
                  required
                />
              </div>

              <Input
                label="Email nhận vé xác nhận"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                required
              />

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Ghi chú cho chủ nhà (Tùy chọn)
                </label>
                <textarea
                  rows={2}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Ví dụ: Nhận phòng muộn sau 19h, cần phòng yên tĩnh..."
                  className="w-full rounded-xl bg-slate-50 border border-slate-200 p-3 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600"
                />
              </div>
            </div>

            <div className="h-px bg-slate-100" />

            {/* Step 2: Payment Method */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs">
                  2
                </div>
                <span>Phương thức thanh toán</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  {
                    id: "momo" as const,
                    label: "Ví Điện Tử MoMo",
                    desc: "Quét mã QR MoMo nhanh chóng",
                    badge: "Khuyên dùng",
                  },
                  {
                    id: "vnpay" as const,
                    label: "VNPAY QR Ngân Hàng",
                    desc: "Hỗ trợ hơn 40 ngân hàng VN",
                    badge: "Miễn phí GD",
                  },
                  {
                    id: "card" as const,
                    label: "Thẻ Quốc Tế (Visa/Master)",
                    desc: "Bảo mật thanh toán quốc tế",
                  },
                  {
                    id: "hotel" as const,
                    label: "Thanh toán tại chỗ nghỉ",
                    desc: "Trả tiền mặt khi check-in",
                  },
                ].map((pm) => (
                  <button
                    key={pm.id}
                    type="button"
                    onClick={() => setPaymentMethod(pm.id)}
                    className={`flex items-start gap-3 p-3.5 rounded-2xl border text-left transition-all ${
                      paymentMethod === pm.id
                        ? "border-emerald-600 bg-emerald-50/50 shadow-xs"
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full border mt-1 flex items-center justify-center ${
                        paymentMethod === pm.id
                          ? "border-emerald-600 bg-emerald-600 text-white"
                          : "border-slate-300"
                      }`}
                    >
                      {paymentMethod === pm.id && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900">{pm.label}</span>
                        {pm.badge && (
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">
                            {pm.badge}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-500 block mt-0.5">{pm.desc}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="h-px bg-slate-100" />

            {/* Total breakdown */}
            <div className="p-4 rounded-2xl bg-slate-50 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Giá phòng ({nights} đêm)</span>
                <span>{formatVND(baseTotal)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Phí dịch vụ & dọn dẹp</span>
                <span>{formatVND(cleaningFee)}</span>
              </div>
              <div className="flex justify-between text-emerald-700 font-semibold">
                <span>Giảm giá khuyến mãi</span>
                <span>-{formatVND(discount)}</span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between text-base font-bold text-slate-900">
                <span>Tổng số tiền thanh toán</span>
                <span className="text-lg font-black text-emerald-700">{formatVND(total)}</span>
              </div>
            </div>

            {/* Submit Action */}
            <div className="space-y-3">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={isSubmitting}
                className="w-full justify-center shadow-lg shadow-emerald-600/30 font-bold"
              >
                <Lock className="w-4 h-4 mr-2" />
                Xác nhận đặt phòng ngay ({formatVND(total)})
              </Button>

              <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Bảo hiểm chuyến đi LuxeSafe miễn phí kèm theo</span>
              </div>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
