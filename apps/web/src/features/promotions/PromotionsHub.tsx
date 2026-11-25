"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowRight, Gift, RefreshCw, Sparkles } from "lucide-react";
import type { DealsHub, PromotionVoucher } from "@luxestay/contracts";
import { partitionCampaigns, resolveCampaignVouchers } from "@luxestay/domain";
import { useLocale } from "@/features/locale/LocaleContext";
import { Button } from "@/shared/ui/Button";
import { CampaignCarousel } from "./CampaignCarousel";
import { CampaignHeroBanner } from "./CampaignHeroBanner";
import { VoucherCarousel } from "./VoucherCarousel";
import { VoucherTermsModal } from "./VoucherTermsModal";
import { buildHomepageTier1Vouchers } from "./promotionsHelpers";

export interface DealsLoadError {
  code: string;
  message: string;
  requestId?: string;
}

export interface PromotionsHubProps {
  initialDeals: DealsHub | null;
  error?: DealsLoadError | null;
  nowIso?: string;
}

/** Homepage 3-tier Promotions Hub placed directly below HeroSection. */
export function PromotionsHub({ initialDeals, error = null, nowIso }: PromotionsHubProps) {
  const router = useRouter();
  const { locale, t } = useLocale();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [inspectedVoucher, setInspectedVoucher] = useState<PromotionVoucher | null>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const referenceDate = useMemo(() => (nowIso ? new Date(nowIso) : new Date()), [nowIso]);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current !== null) {
        clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  const handleCopy = (code: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(code).catch(() => {});
    }
    setCopiedCode(code);
    if (copyTimerRef.current !== null) {
      clearTimeout(copyTimerRef.current);
    }
    copyTimerRef.current = setTimeout(() => {
      setCopiedCode((current) => (current === code ? null : current));
    }, 2500);
  };

  if (error && !initialDeals) {
    return (
      <section
        id="deals-section"
        data-testid="promotions-hub"
        className="py-10 sm:py-12 w-full min-w-0 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10"
      >
        <div
          role="alert"
          data-testid="deals-error-card"
          className="rounded-3xl bg-white border border-rose-200 shadow-sm p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5"
        >
          <div className="flex items-start gap-4 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
              <AlertCircle className="w-5 h-5" aria-hidden="true" />
            </div>
            <div className="space-y-1.5 min-w-0">
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
                {locale === "en"
                  ? "Unable to load promotions right now"
                  : "Không thể tải danh sách ưu đãi lúc này"}
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">{error.message}</p>
              <div className="flex flex-wrap items-center gap-2 pt-0.5 text-xs text-slate-500 font-mono">
                <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 font-semibold">
                  {error.code}
                </span>
                {error.requestId && (
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                    requestId: {error.requestId}
                  </span>
                )}
              </div>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={() => router.refresh()}
            className="shrink-0 font-bold border-rose-200 text-rose-700 hover:border-rose-400 hover:bg-rose-50"
          >
            <RefreshCw className="w-4 h-4" aria-hidden="true" />
            <span>{locale === "en" ? "Retry" : "Thử lại"}</span>
          </Button>
        </div>
      </section>
    );
  }

  if (!initialDeals) {
    return null;
  }

  const tier1Vouchers = buildHomepageTier1Vouchers(initialDeals.vouchers, referenceDate);
  const { hero, carousel } = partitionCampaigns(initialDeals.campaigns, referenceDate);
  const featuredHeroVoucher = hero
    ? (resolveCampaignVouchers(hero, initialDeals.vouchers)[0] ?? null)
    : null;
  const hasCampaigns = hero !== null || carousel.length > 0;

  if (!error && initialDeals && tier1Vouchers.length === 0 && !hasCampaigns) {
    return null;
  }

  return (
    <section
      id="deals-section"
      data-testid="promotions-hub"
      className="py-10 sm:py-12 w-full min-w-0 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 sm:space-y-10"
    >
      {/* Tier 1: New User & General Vouchers Strip */}
      {tier1Vouchers.length > 0 && (
        <div className="space-y-4 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <Gift className="w-4 h-4" aria-hidden="true" />
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {t("deals.newUserTitle")}
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                {t("deals.newUserSubtitle")}
              </p>
            </div>
          </div>

          <VoucherCarousel
            vouchers={tier1Vouchers}
            copiedCode={copiedCode}
            onCopy={handleCopy}
            onInspect={setInspectedVoucher}
          />
        </div>
      )}

      {/* Tier 2 & 3: Ongoing Hero Banner & 3-Up Campaign Carousel */}
      {hasCampaigns && (
        <div className="space-y-5 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-7 h-7 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4" aria-hidden="true" />
              </span>
              <h2 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight leading-snug">
                {t("deals.ongoingTitle")}
              </h2>
            </div>

            <Link
              href="/deals"
              data-testid="deals-view-all-link"
              className="inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-emerald-700 hover:text-emerald-800 whitespace-nowrap shrink-0 px-2 sm:px-3 py-1.5 rounded-full hover:bg-emerald-50 transition-colors"
            >
              <span>{t("deals.viewAll")}</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
          </div>

          {hero !== null && (
            <CampaignHeroBanner
              campaign={hero}
              featuredVoucher={featuredHeroVoucher}
              copiedCode={copiedCode}
              onCopy={handleCopy}
            />
          )}

          {carousel.length > 0 && <CampaignCarousel campaigns={carousel} />}
        </div>
      )}

      {/* Voucher Terms Inspection Modal */}
      <VoucherTermsModal
        voucher={inspectedVoucher}
        copied={Boolean(inspectedVoucher && copiedCode === inspectedVoucher.code)}
        onCopy={handleCopy}
        onClose={() => setInspectedVoucher(null)}
      />
    </section>
  );
}
