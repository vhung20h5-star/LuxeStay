"use client";

import React, { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { Camera, ChevronLeft, ChevronRight, Expand, X } from "lucide-react";
import { useLocale } from "@/features/locale/LocaleContext";
import { useOverlayLayer } from "@/shared/overlay/OverlayContext";

interface ActivityGalleryProps {
  title: string;
  images: readonly string[];
  captions?: readonly string[];
}

export function ActivityGallery({ title, images, captions }: ActivityGalleryProps) {
  const { locale, t } = useLocale();
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const safeImages = images.length > 0 ? images : ["/images/activities/act-01.jpg"];
  const total = safeImages.length;
  const currentIdx = Math.min(activeIndex, total - 1);

  const getCaption = (idx: number) =>
    captions?.[idx] ?? `${title} — ${locale === "en" ? "Photo" : "Ảnh"} ${idx + 1}`;

  const openLightboxAt = useCallback((idx: number) => {
    setActiveIndex(idx);
    setLightboxOpen(true);
  }, []);

  const closeLightbox = useCallback(() => {
    setLightboxOpen(false);
  }, []);

  const handlePrev = useCallback(() => {
    setActiveIndex((prev) => (prev - 1 + total) % total);
  }, [total]);

  const handleNext = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % total);
  }, [total]);

  const { zIndex, isTopmost } = useOverlayLayer({
    id: "activity-gallery-lightbox",
    kind: "activity-lightbox",
    isOpen: lightboxOpen,
    onClose: closeLightbox,
    tier: 2,
    closeOnEscape: true,
  });

  useEffect(() => {
    if (!lightboxOpen || !isTopmost) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        handlePrev();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        handleNext();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleNext, handlePrev, isTopmost, lightboxOpen]);

  return (
    <div className="w-full min-w-0 space-y-3" data-testid="activity-gallery">
      {/* Desktop Bento Grid (1 large left + 2 stacked right) / Mobile hero + thumbnails */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 sm:gap-3">
        {/* Main Hero Photo */}
        <button
          type="button"
          data-testid="activity-gallery-hero"
          onClick={() => openLightboxAt(currentIdx)}
          aria-label={getCaption(currentIdx)}
          className={`group relative ${
            total >= 3 ? "sm:col-span-8" : "sm:col-span-12"
          } aspect-[16/10] w-full rounded-3xl overflow-hidden bg-slate-100 shadow-md cursor-pointer text-left focus:outline-none focus:ring-2 focus:ring-emerald-500`}
        >
          <Image
            src={safeImages[currentIdx]}
            alt={getCaption(currentIdx)}
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover group-hover:scale-[1.03] transition-transform duration-500"
          />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/75 via-slate-950/20 to-transparent p-3.5 sm:p-4 flex items-end justify-between gap-2">
            <span className="text-xs sm:text-sm font-medium text-white/95 line-clamp-1">
              {getCaption(currentIdx)}
            </span>
            <span
              data-testid="activity-gallery-open-btn"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/95 text-slate-900 text-xs font-bold shadow-sm shrink-0 group-hover:bg-emerald-50 transition-colors"
            >
              <Expand className="w-3.5 h-3.5 text-emerald-600" />
              {t("activities.viewAllPhotos", { count: total })}
            </span>
          </div>
        </button>

        {/* Side 2 Bento Photos on Desktop/Tablet */}
        {total >= 3 && (
          <div className="hidden sm:grid sm:col-span-4 grid-rows-2 gap-3 min-w-0">
            {[1, 2].map((idx) => {
              const isSelected = currentIdx === idx;
              return (
                <button
                  key={safeImages[idx]}
                  type="button"
                  data-testid={`activity-gallery-side-${idx}`}
                  onClick={() => openLightboxAt(idx)}
                  aria-label={getCaption(idx)}
                  className={`group relative w-full h-full min-h-[120px] rounded-2xl overflow-hidden bg-slate-100 cursor-pointer text-left transition-all ${
                    isSelected
                      ? "ring-2 ring-emerald-500 ring-offset-1"
                      : "hover:opacity-95"
                  }`}
                >
                  <Image
                    src={safeImages[idx]}
                    alt={getCaption(idx)}
                    fill
                    sizes="(max-width: 1024px) 35vw, 22vw"
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/70 to-transparent px-2.5 py-2">
                    <span className="text-[11px] font-medium text-white/95 line-clamp-1">
                      {getCaption(idx)}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Interactive Thumbnail Strip (always visible on mobile; handy switcher on desktop too) */}
      {total > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
          {safeImages.map((src, idx) => {
            const active = idx === currentIdx;
            return (
              <button
                key={src}
                type="button"
                data-testid={`activity-gallery-thumb-${idx}`}
                onClick={() => setActiveIndex(idx)}
                className={`relative w-20 sm:w-24 aspect-[16/10] rounded-xl overflow-hidden shrink-0 border-2 transition-all cursor-pointer ${
                  active
                    ? "border-emerald-600 shadow-sm"
                    : "border-transparent opacity-70 hover:opacity-100"
                }`}
              >
                <Image
                  src={src}
                  alt={getCaption(idx)}
                  fill
                  sizes="96px"
                  className="object-cover"
                />
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => openLightboxAt(currentIdx)}
            className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 text-xs font-semibold shrink-0 cursor-pointer transition-colors"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>
              {currentIdx + 1} / {total}
            </span>
          </button>
        </div>
      )}

      {/* Fullscreen Lightbox integrated with OverlayContext */}
      {lightboxOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          data-testid="activity-gallery-lightbox"
          style={{ zIndex }}
          onClick={closeLightbox}
          className="fixed inset-0 bg-slate-950/92 backdrop-blur-sm flex flex-col items-center justify-between p-4 sm:p-6"
        >
          {/* Top Bar */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-5xl flex items-center justify-between gap-3 text-white"
          >
            <div className="min-w-0">
              <div
                className="text-xs font-bold uppercase tracking-wider text-emerald-300"
                data-testid="lightbox-counter"
              >
                {currentIdx + 1} / {total}
              </div>
              <div className="text-sm sm:text-base font-bold truncate">{title}</div>
            </div>
            <button
              type="button"
              data-testid="lightbox-close-btn"
              onClick={closeLightbox}
              aria-label={locale === "en" ? "Close photo viewer" : "Đóng xem ảnh"}
              className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Center Image + Arrows */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-5xl flex-1 flex items-center justify-center my-4 min-h-0"
          >
            <button
              type="button"
              data-testid="lightbox-prev-btn"
              onClick={handlePrev}
              aria-label={locale === "en" ? "Previous photo" : "Ảnh trước"}
              className="absolute left-1 sm:left-3 z-10 p-2.5 sm:p-3 rounded-full bg-black/55 hover:bg-black/80 text-white border border-white/15 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>

            <div className="relative w-full max-w-4xl aspect-[16/10] max-h-[68vh] rounded-2xl overflow-hidden bg-slate-900 shadow-2xl">
              <Image
                src={safeImages[currentIdx]}
                alt={getCaption(currentIdx)}
                fill
                sizes="(max-width: 1024px) 100vw, 80vw"
                className="object-cover"
              />
            </div>

            <button
              type="button"
              data-testid="lightbox-next-btn"
              onClick={handleNext}
              aria-label={locale === "en" ? "Next photo" : "Ảnh tiếp theo"}
              className="absolute right-1 sm:right-3 z-10 p-2.5 sm:p-3 rounded-full bg-black/55 hover:bg-black/80 text-white border border-white/15 transition-colors cursor-pointer"
            >
              <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>

          {/* Caption & Bottom Thumbnails */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-4xl space-y-3 text-center"
          >
            <p
              data-testid="lightbox-caption"
              className="text-xs sm:text-sm font-medium text-white/90 px-2"
            >
              {getCaption(currentIdx)}
            </p>
            <div className="flex items-center justify-center gap-2 overflow-x-auto pb-1">
              {safeImages.map((src, idx) => (
                <button
                  key={src}
                  type="button"
                  onClick={() => setActiveIndex(idx)}
                  className={`relative w-16 sm:w-20 aspect-[16/10] rounded-lg overflow-hidden shrink-0 border-2 transition-all cursor-pointer ${
                    idx === currentIdx
                      ? "border-emerald-400 scale-105"
                      : "border-transparent opacity-55 hover:opacity-90"
                  }`}
                >
                  <Image src={src} alt={getCaption(idx)} fill sizes="80px" className="object-cover" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
