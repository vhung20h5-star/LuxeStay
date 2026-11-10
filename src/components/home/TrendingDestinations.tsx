"use client";

import React from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowRight, Compass } from "lucide-react";
import { DESTINATIONS } from "@/data/destinations";
import { useBooking } from "@/context/BookingContext";

export function TrendingDestinations() {
  const { setSearchCriteria } = useBooking();

  const handleSelect = (destName: string) => {
    setSearchCriteria((prev) => ({ ...prev, destination: destName }));
    const target = document.getElementById("properties-section");
    if (target) {
      target.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section id="destinations-section" className="py-16 bg-slate-100/60 border-y border-slate-200/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 mb-10">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold mb-2">
              <Compass className="w-3.5 h-3.5" />
              <span>Gợi ý du lịch</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Điểm Đến Thịnh Hành
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-xl">
              Những tọa độ du lịch được yêu thích nhất với cảnh quan thiên nhiên kỳ vĩ và homestay tuyệt đẹp
            </p>
          </div>
        </div>

        {/* Destinations Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          {DESTINATIONS.map((dest, idx) => (
            <motion.div
              key={dest.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: idx * 0.05 }}
              onClick={() => handleSelect(dest.name)}
              className="group relative h-64 sm:h-80 rounded-3xl overflow-hidden cursor-pointer shadow-md hover:shadow-2xl transition-all duration-300"
            >
              <Image
                src={dest.image}
                alt={dest.name}
                fill
                sizes="(max-width: 640px) 50vw, 25vw"
                className="object-cover group-hover:scale-110 transition-transform duration-700"
              />

              {/* Gradient Dark Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/30 to-transparent" />

              {/* Tag pill */}
              <div className="absolute top-3.5 left-3.5">
                <span className="px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-[11px] font-semibold">
                  {dest.tag}
                </span>
              </div>

              {/* Bottom Info */}
              <div className="absolute bottom-4 inset-x-4 text-white">
                <h3 className="text-xl sm:text-2xl font-black tracking-tight group-hover:text-emerald-300 transition-colors">
                  {dest.name}
                </h3>
                <p className="text-xs text-slate-300 mt-0.5 line-clamp-1">
                  {dest.popularFor}
                </p>

                <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-white/20 text-xs">
                  <span className="font-medium text-slate-200">
                    {dest.propertiesCount}+ chỗ nghỉ
                  </span>
                  <span className="w-7 h-7 rounded-full bg-white/20 group-hover:bg-emerald-500 group-hover:text-white flex items-center justify-center transition-all duration-300">
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
