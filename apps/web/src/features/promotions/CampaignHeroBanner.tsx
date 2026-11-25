"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, Clock, Copy, Sparkles, Ticket } from "lucide-react";
import type { PromotionCampaign, PromotionVoucher } from "@luxestay/contracts";
import { useLocale } from "@/features/locale/LocaleContext";
import { cn } from "@/shared/utils/cn";
import { CampaignCountdown } from "./CampaignCountdown";

export interface CampaignHeroBannerProps {
  campaign: PromotionCampaign;
  featuredVoucher?: PromotionVoucher | null;
  copiedCode?: string | null;
  onCopy?: (code: string) => void;
}

/** Full-width Tier 2 hero promotion banner with live countdown and quick-copy glass CTA card. */
export function CampaignHeroBanner({
  campaign,
  featuredVoucher,
  copiedCode,
  onCopy,
}: CampaignHeroBannerProps) {
  const { t } = useLocale();
  const isCopied = Boolean(featuredVoucher && copiedCode === featuredVoucher.code);
  const dealHref = `/deals/${campaign.slug}`;

  return (
    <div
      data-testid="campaign-hero-banner"
      className="group relative rounded-3xl overflow-hidden shadow-xl border border-slate-800/40 bg-slate-950 text-white"
    >
      {/* Background Photo & Deep Atmospheric Overlay */}
      <Image
        src={campaign.image}
        alt={campaign.title}
        fill
        sizes="(max-width: 1280px) 100vw, 1280px"
        className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-indigo-950/75 to-emerald-950/60"
      />
      <div
        aria-hidden="true"
        className="absolute -left-24 -top-24 w-72 h-72 rounded-full bg-amber-400/15 blur-3xl pointer-events-none"
      />
      <div
        aria-hidden="true"
        className="absolute right-0 -bottom-24 w-80 h-80 rounded-full bg-emerald-400/15 blur-3xl pointer-events-none"
      />

      {/* Stretched overlay link makes entire banner body clickable without nesting <a> tags */}
      <Link
        href={dealHref}
        aria-hidden="true"
        tabIndex={-1}
        className="absolute inset-0 z-10 rounded-3xl"
      />

      {/* Foreground Content Grid */}
      <div className="relative z-10 pointer-events-none p-5 sm:p-8 lg:p-10 grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 lg:gap-8 items-center">
        {/* Left Column: Campaign Story */}
        <div className="lg:col-span-7 space-y-3 sm:space-y-4 min-w-0">
          <div className="inline-flex max-w-full items-center gap-1.5 px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full bg-amber-400/20 border border-amber-300/35 text-amber-200 text-[11px] sm:text-xs font-extrabold tracking-wide uppercase shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" aria-hidden="true" />
            <span className="truncate">{campaign.badge}</span>
          </div>

          <h3 className="text-xl sm:text-4xl lg:text-[40px] font-black tracking-tight leading-[1.18] text-white">
            {campaign.title}
          </h3>

          <p className="text-slate-200/90 text-xs sm:text-base leading-relaxed max-w-2xl">
            {campaign.subtitle}
          </p>

          <div className="pt-0.5 flex flex-wrap items-center gap-x-3 sm:gap-x-4 gap-y-1 text-[11px] sm:text-xs text-slate-300/90 font-medium">
            <span>{t("deals.termsApply")}</span>
            <span aria-hidden="true" className="text-slate-500">
              •
            </span>
            <span>{campaign.periodLabel}</span>
          </div>
        </div>

        {/* Right Column: Glassmorphic Web CTA Panel */}
        <div className="lg:col-span-5 min-w-0 bg-white/12 backdrop-blur-md border border-white/25 rounded-2xl p-4 sm:p-5 space-y-3.5 sm:space-y-4 shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-bold uppercase tracking-wider text-amber-200">
              <Clock className="w-3.5 h-3.5 text-amber-300 shrink-0" aria-hidden="true" />
              <span>{t("deals.endsIn")}</span>
            </span>
            <span className="text-[11px] font-semibold text-amber-100/90 bg-amber-500/20 border border-amber-300/30 px-2.5 py-0.5 rounded-full whitespace-nowrap">
              {campaign.highlightText}
            </span>
          </div>

          <CampaignCountdown endsAt={campaign.endsAt} className="flex-wrap max-w-full" />

          {featuredVoucher && (
            <div className="relative z-20 pointer-events-auto rounded-xl bg-slate-950/55 border border-white/15 px-3.5 py-2.5 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-slate-300">
                  <Ticket className="w-3 h-3 text-emerald-400" aria-hidden="true" />
                  <span>{t("deals.featuredCode")}</span>
                </span>
                <span className="font-mono font-black text-sm sm:text-base tracking-wider text-emerald-300 block truncate">
                  {featuredVoucher.code}
                </span>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (onCopy) {
                    onCopy(featuredVoucher.code);
                  } else if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
                    void navigator.clipboard.writeText(featuredVoucher.code).catch(() => {});
                  }
                }}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer active:scale-95",
                  isCopied
                    ? "bg-emerald-500 text-white"
                    : "bg-white/15 hover:bg-white/25 text-white border border-white/20"
                )}
              >
                {isCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{t("deals.copied")}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{t("deals.copy")}</span>
                  </>
                )}
              </button>
            </div>
          )}

          <Link
            href={dealHref}
            className="relative z-20 pointer-events-auto w-full inline-flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:brightness-105 text-slate-950 font-extrabold text-sm shadow-md shadow-amber-500/25 transition-all group-hover:shadow-amber-500/40"
          >
            <span>{campaign.ctaLabel || t("deals.viewDeal")}</span>
            <ArrowRight
              className="w-4 h-4 transition-transform group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </Link>
        </div>
      </div>
    </div>
  );
}
