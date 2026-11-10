"use client";

import React, { useState, useEffect } from "react";
import { Sparkles, Clock, Copy, Check, Gift, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function PromotionBanner() {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState({
    hours: 14,
    minutes: 32,
    seconds: 45,
  });

  // Simple countdown timer
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: 59, seconds: 59 };
        if (prev.hours > 0) return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        return { hours: 23, minutes: 59, seconds: 59 };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  return (
    <section id="deals-section" className="py-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white p-8 sm:p-12 shadow-2xl">
        {/* Decorative elements */}
        <div className="absolute -right-20 -top-20 w-80 h-80 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 -bottom-20 w-80 h-80 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Column: Promotion Info */}
          <div className="lg:col-span-7 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/20 border border-amber-400/30 text-amber-300 text-xs font-bold">
              <Sparkles className="w-4 h-4" />
              <span>Flash Deal Mùa Du Lịch 2026</span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
              Giảm Ngay <span className="text-amber-400">30%</span> Cho Kỳ Nghỉ Tiếp Theo
            </h2>

            <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-xl">
              Áp dụng cho hơn 500+ khách sạn, resort ven biển và homestay săn mây độc quyền khi đặt phòng trong tuần này.
            </p>

            {/* Countdown Clock */}
            <div className="pt-2 flex items-center gap-3">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-400" /> Kết thúc sau:
              </span>
              <div className="flex items-center gap-2 text-center font-mono font-bold">
                <div className="bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 min-w-12">
                  <span className="text-lg text-white">
                    {String(timeLeft.hours).padStart(2, "0")}
                  </span>
                  <span className="block text-[9px] font-sans text-slate-400 uppercase">Giờ</span>
                </div>
                <span className="text-amber-400 font-bold">:</span>
                <div className="bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 min-w-12">
                  <span className="text-lg text-white">
                    {String(timeLeft.minutes).padStart(2, "0")}
                  </span>
                  <span className="block text-[9px] font-sans text-slate-400 uppercase">Phút</span>
                </div>
                <span className="text-amber-400 font-bold">:</span>
                <div className="bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 min-w-12">
                  <span className="text-lg text-white">
                    {String(timeLeft.seconds).padStart(2, "0")}
                  </span>
                  <span className="block text-[9px] font-sans text-slate-400 uppercase">Giây</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Voucher Card */}
          <div className="lg:col-span-5 bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-6 sm:p-7 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-bold tracking-wider text-amber-300 flex items-center gap-1.5">
                <Gift className="w-4 h-4" /> Mã giảm giá độc quyền
              </span>
              <span className="text-xs text-slate-300">HSD: 30/11/2026</span>
            </div>

            {/* Voucher 1 */}
            <div className="bg-slate-950/50 border border-white/10 rounded-2xl p-4 flex items-center justify-between gap-3">
              <div>
                <span className="text-[11px] text-slate-400 block">Giảm 250.000đ cho đơn từ 1.5tr</span>
                <span className="font-mono font-black text-lg text-emerald-400 tracking-wider">
                  LUXESTAY250
                </span>
              </div>
              <button
                onClick={() => handleCopy("LUXESTAY250")}
                className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                {copiedCode === "LUXESTAY250" ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Đã sao chép</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Sao chép</span>
                  </>
                )}
              </button>
            </div>

            {/* Voucher 2 */}
            <div className="bg-slate-950/50 border border-white/10 rounded-2xl p-4 flex items-center justify-between gap-3">
              <div>
                <span className="text-[11px] text-slate-400 block">Giảm 10% tối đa 500.000đ</span>
                <span className="font-mono font-black text-lg text-amber-400 tracking-wider">
                  SUMMERVIBE
                </span>
              </div>
              <button
                onClick={() => handleCopy("SUMMERVIBE")}
                className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                {copiedCode === "SUMMERVIBE" ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Đã sao chép</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Sao chép</span>
                  </>
                )}
              </button>
            </div>

            <Button
              variant="luxury"
              className="w-full justify-center"
              onClick={() => {
                const target = document.getElementById("properties-section");
                if (target) target.scrollIntoView({ behavior: "smooth" });
              }}
            >
              Xem ngay các phòng đang ưu đãi
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
