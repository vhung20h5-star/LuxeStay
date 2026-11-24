"use client";

import React from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Sparkles, ShieldCheck, Star } from "lucide-react";
import { SearchBar } from "./SearchBar";

export function HeroSection() {
  return (
    <section className="relative pt-8 pb-20 md:pt-14 md:pb-28 overflow-hidden">
      {/* Background Decor & Ambience */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[1000px] h-[550px] bg-gradient-to-b from-emerald-100/60 via-teal-50/40 to-transparent blur-3xl rounded-full" />
        <div className="absolute top-60 -right-20 w-96 h-96 bg-amber-100/40 blur-3xl rounded-full" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-10">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs font-bold mb-5 shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 animate-spin" style={{ animationDuration: "6s" }} />
            <span>Nền tảng đặt phòng du lịch đẳng cấp #1 Việt Nam</span>
          </motion.div>

          {/* Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-3xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.15]"
          >
            Khám Phá Kỳ Nghỉ{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 via-teal-600 to-amber-600">
              Trong Mơ
            </span>{" "}
            Tại Việt Nam
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-4 text-base sm:text-lg text-slate-600 font-normal leading-relaxed max-w-2xl mx-auto"
          >
            Hơn 10.000+ khách sạn 5 sao, resort biển sang trọng & homestay săn mây độc bản. Giá tốt nhất, ảnh chụp thực tế 100%, hủy phòng miễn phí linh hoạt.
          </motion.p>
        </div>

        {/* Search Bar with Spring Transition */}
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="relative z-20"
        >
          <SearchBar />
        </motion.div>

        {/* Social Proof & Trust Badges */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="mt-12 flex flex-wrap items-center justify-center gap-6 sm:gap-12 text-slate-500 text-xs sm:text-sm font-medium"
        >
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              <Image
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=80&q=80"
                alt="User"
                width={28}
                height={28}
                className="w-7 h-7 rounded-full border-2 border-white object-cover"
              />
              <Image
                src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=80&q=80"
                alt="User"
                width={28}
                height={28}
                className="w-7 h-7 rounded-full border-2 border-white object-cover"
              />
              <Image
                src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=80&q=80"
                alt="User"
                width={28}
                height={28}
                className="w-7 h-7 rounded-full border-2 border-white object-cover"
              />
            </div>
            <span>
              <strong className="text-slate-800">250.000+</strong> khách hàng hài lòng
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <div className="flex text-amber-500">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
              ))}
            </div>
            <span>
              <strong className="text-slate-800">4.96/5</strong> điểm đánh giá
            </span>
          </div>

          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <span>Cam kết hoàn tiền & Bảo hiểm kỳ nghỉ</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
