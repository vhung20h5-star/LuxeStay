"use client";

import React, { useEffect } from "react";
import confetti from "canvas-confetti";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  MapPin,
  Download,
  X,
  PhoneCall,
} from "lucide-react";
import Image from "next/image";
import { useBooking } from "@/context/BookingContext";
import { formatVND } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

export function BookingSuccessModal() {
  const { bookingSuccess, setBookingSuccess } = useBooking();

  useEffect(() => {
    if (bookingSuccess) {
      // Trigger joyful celebratory confetti
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#10b981", "#14b8a6", "#f59e0b", "#6366f1"],
      });
    }
  }, [bookingSuccess]);

  if (!bookingSuccess) return null;

  const { property, guestInfo, pricing, bookingId, checkIn, checkOut } = bookingSuccess;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => setBookingSuccess(null)}
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-md"
      />

      <div className="min-h-full flex items-center justify-center p-3 sm:p-6 my-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden z-10 my-auto"
        >
          {/* Top celebratory decoration */}
          <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 p-8 text-center text-white relative">
            <button
              onClick={() => setBookingSuccess(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
              aria-label="Đóng"
            >
              <X className="w-5 h-5" />
            </button>

            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.1 }}
              className="w-16 h-16 rounded-full bg-white text-emerald-600 flex items-center justify-center mx-auto mb-3 shadow-lg"
            >
              <CheckCircle2 className="w-10 h-10" />
            </motion.div>

            <h3 className="text-2xl font-black tracking-tight">Đặt Phòng Thành Công!</h3>
            <p className="text-emerald-100 text-xs sm:text-sm mt-1">
              Cảm ơn bạn đã lựa chọn LuxeStay cho chuyến du lịch sắp tới.
            </p>

            <div className="inline-flex items-center gap-2 mt-4 px-3.5 py-1.5 rounded-full bg-white/20 backdrop-blur-md text-xs font-mono font-bold tracking-wider">
              <span>Mã đặt phòng:</span>
              <span className="text-amber-300 font-black">{bookingId}</span>
            </div>
          </div>

          {/* Ticket Body */}
          <div className="p-6 sm:p-8 space-y-6 max-h-[70vh] overflow-y-auto">
            {/* Stay preview */}
            <div className="flex gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div className="relative w-20 h-20 rounded-xl overflow-hidden shrink-0">
                <Image src={property.images[0]} alt={property.title} fill className="object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider block">
                  {property.location.city}
                </span>
                <h4 className="text-sm font-bold text-slate-900 truncate mt-0.5">
                  {property.title}
                </h4>
                <p className="text-xs text-slate-500 truncate mt-1 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>{property.location.address}</span>
                </p>
              </div>
            </div>

            {/* Itinerary info grid */}
            <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-100 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Nhận phòng (Check-in)
                </span>
                <span className="font-bold text-slate-900 block mt-0.5">14:00 • {checkIn}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Trả phòng (Check-out)
                </span>
                <span className="font-bold text-slate-900 block mt-0.5">12:00 • {checkOut}</span>
              </div>
              <div className="pt-2 border-t border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Khách lưu trú
                </span>
                <span className="font-bold text-slate-900 block mt-0.5">{guestInfo.fullName}</span>
              </div>
              <div className="pt-2 border-t border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Tổng thanh toán
                </span>
                <span className="font-bold text-emerald-700 block mt-0.5">
                  {formatVND(pricing.total)}
                </span>
              </div>
            </div>

            {/* Note & Host contact */}
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-start gap-3 text-xs text-amber-900">
              <PhoneCall className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Hướng dẫn nhận phòng:</span>
                <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                  Chủ nhà ({property.host.name}) sẽ gửi mã khóa cửa thông minh và vị trí định vị qua Zalo/SMS tới số điện thoại <strong>{guestInfo.phone}</strong> trước giờ check-in.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="outline"
                className="flex-1 justify-center"
                onClick={handlePrint}
              >
                <Download className="w-4 h-4 mr-2" />
                Lưu vé xác nhận PDF
              </Button>
              <Button
                variant="primary"
                className="flex-1 justify-center"
                onClick={() => setBookingSuccess(null)}
              >
                Hoàn tất
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
