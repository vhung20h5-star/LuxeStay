"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import type { PromotionCampaign } from "@luxestay/contracts";
import { useLocale } from "@/features/locale/LocaleContext";
import { cn } from "@/shared/utils/cn";
import { getCampaignThemeStyle } from "./promotionsHelpers";

export interface CampaignCardProps {
  campaign: PromotionCampaign;
}

/** Landscape themed campaign card linking directly to /deals/[slug]. */
export function CampaignCard({ campaign }: CampaignCardProps) {
  const { t } = useLocale();
  const style = getCampaignThemeStyle(campaign.theme);

  return (
    <Link
      href={`/deals/${campaign.slug}`}
      data-testid={`campaign-card-${campaign.slug}`}
      className={cn(
        "group relative flex flex-col justify-between rounded-2xl overflow-hidden border shadow-sm hover:shadow-xl transition-all duration-300 min-h-[212px] sm:min-h-[224px] p-5 bg-slate-900",
        style.cardBorder
      )}
    >
      {/* Background Photo */}
      <Image
        src={campaign.image}
        alt={campaign.title}
        fill
        sizes="(max-width: 640px) 84vw, (max-width: 1024px) 47vw, 33vw"
        className="object-cover transition-transform duration-500 group-hover:scale-105"
      />

      {/* Left-split Theme Gradient Overlay */}
      <div
        aria-hidden="true"
        className={cn("absolute inset-0", style.overlayGradient)}
      />

      {/* Ambient Gleam */}
      <div
        aria-hidden="true"
        className={cn(
          "absolute -right-12 -top-12 w-40 h-40 rounded-full blur-2xl pointer-events-none",
          style.accentGlow
        )}
      />

      {/* Top Content: Badge + Title + Highlight */}
      <div className="relative z-10 space-y-2.5 max-w-[88%]">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[10px] font-extrabold uppercase tracking-wider",
            style.badgeClass
          )}
        >
          <Sparkles className="w-3 h-3 shrink-0" aria-hidden="true" />
          <span className="truncate">{campaign.badge}</span>
        </span>

        <h3
          className={cn(
            "text-lg sm:text-xl font-black leading-snug line-clamp-2",
            style.titleClass
          )}
        >
          {campaign.title}
        </h3>

        <p
          className={cn(
            "text-xl sm:text-2xl font-black tracking-tight leading-tight",
            style.highlightClass
          )}
        >
          {campaign.highlightText}
        </p>
      </div>

      {/* Bottom Caption + Hover Arrow */}
      <div
        className={cn(
          "relative z-10 pt-4 mt-2 flex items-center justify-between gap-2 text-xs font-semibold",
          style.footerClass
        )}
      >
        <span>{t("deals.termsApply")}</span>
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/15 backdrop-blur-xs text-white text-[11px] font-bold transition-transform group-hover:translate-x-0.5">
          <span>{campaign.ctaLabel || t("deals.viewDeal")}</span>
          <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
        </span>
      </div>
    </Link>
  );
}
