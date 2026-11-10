"use client";

import React from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Star, ShieldCheck, Quote } from "lucide-react";

export function TestimonialsSection() {
  const testimonials = [
    {
      id: "t-1",
      name: "Nguyễn Hoàng Nam",
      role: "Du khách từ Hà Nội",
      avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80",
      rating: 5,
      stayName: "Mây Lang Thang Wooden Villa (Đà Lạt)",
      content:
        "Mình đặt phòng qua LuxeStay rất mượt, giao diện đẹp và thông tin minh bạch. Căn homestay gỗ ở Đà Lạt sáng sớm săn mây đẹp nghẹt thở, chủ nhà còn chuẩn bị sẵn trà nóng đón tiếp cực kỳ ấm cúng!",
      tripType: "Chuyến đi nghỉ dưỡng 3 ngày 2 đêm",
    },
    {
      id: "t-2",
      name: "Trần Mai Anh",
      role: "Du khách từ TP. Hồ Chí Minh",
      avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80",
      rating: 5,
      stayName: "The Coral Luxury Villa (Phú Quốc)",
      content:
        "Hồ bơi vô cực view biển ngắm hoàng hôn đỉnh nhất mình từng trải nghiệm. Đặt phòng trên app có bảo hiểm và hỗ trợ hủy miễn phí nên gia đình mình rất yên tâm. Chắc chắn sẽ tiếp tục ủng hộ!",
      tripType: "Kỳ nghỉ gia đình 4 người",
    },
    {
      id: "t-3",
      name: "Lê Minh Trí",
      role: "Travel Blogger",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80",
      rating: 5,
      stayName: "Aira Panorama Mountain Retreat (Sa Pa)",
      content:
        "Dịch vụ 5 sao chuẩn mực. Phòng tắm có bồn ngâm thảo mộc người Dao, ban công mở ra trọn thung lũng Mường Hoa. Trải nghiệm thanh toán qua MoMo & VNPAY cực nhanh chóng trong 30 giây.",
      tripType: "Chuyến du lịch cặp đôi",
    },
  ];

  return (
    <section id="testimonials-section" className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto mb-12">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold mb-3">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Trải nghiệm thực tế</span>
        </div>
        <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
          Khách Hàng Nói Gì Về LuxeStay?
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-2">
          Hơn 250.000 du khách đã tìm được kỳ nghỉ hoàn hảo với sự hài lòng tuyệt đối
        </p>
      </div>

      {/* Testimonials Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {testimonials.map((t, idx) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: idx * 0.1 }}
            className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-xs hover:shadow-lg transition-all flex flex-col justify-between relative group"
          >
            <div className="absolute top-6 right-6 text-slate-100 group-hover:text-emerald-100 transition-colors pointer-events-none">
              <Quote className="w-10 h-10" />
            </div>

            <div className="relative z-10">
              {/* Rating stars */}
              <div className="flex items-center gap-1 mb-4">
                {[...Array(t.rating)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                ))}
              </div>

              {/* Review Quote */}
              <p className="text-slate-700 text-sm leading-relaxed mb-6 italic">
                &ldquo;{t.content}&rdquo;
              </p>
            </div>

            <div className="relative z-10 pt-4 border-t border-slate-100">
              <div className="text-xs font-semibold text-emerald-700 mb-2 truncate">
                🏨 {t.stayName}
              </div>
              <div className="flex items-center gap-3">
                <Image
                  src={t.avatar}
                  alt={t.name}
                  width={44}
                  height={44}
                  className="rounded-full object-cover border-2 border-emerald-500/20"
                />
                <div className="min-w-0">
                  <div className="text-sm font-bold text-slate-900 truncate">{t.name}</div>
                  <div className="text-[11px] text-slate-400 truncate">{t.role}</div>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
