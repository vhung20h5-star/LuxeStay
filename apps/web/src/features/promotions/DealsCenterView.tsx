"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, Gift, Home, Sparkles, Tag } from "lucide-react";
import type { DealsHub, PromotionVoucher, VoucherAudience } from "@luxestay/contracts";
import {
  filterVouchersByAudience,
  partitionCampaigns,
  resolveCampaignVouchers,
} from "@luxestay/domain";
import { useLocale } from "@/features/locale/LocaleContext";
import { cn } from "@/shared/utils/cn";
import { CampaignCard } from "./CampaignCard";
import { CampaignHeroBanner } from "./CampaignHeroBanner";
import { VoucherCard } from "./VoucherCard";
import { VoucherTermsModal } from "./VoucherTermsModal";
import { buildDealAudienceCounts } from "./promotionsHelpers";
import { useCopiedVoucherCode } from "./useCopiedVoucherCode";

export interface DealsCenterViewProps {
  initialDeals: DealsHub;
}

/** Dedicated /deals Promotions Center with audience-filtered voucher vault and active campaigns. */
export function DealsCenterView({ initialDeals }: DealsCenterViewProps) {
  const { locale, t } = useLocale();
  const [activeAudience, setActiveAudience] = useState<VoucherAudience>("all");
  const [inspectedVoucher, setInspectedVoucher] = useState<PromotionVoucher | null>(null);
  const { copiedCode, handleCopy } = useCopiedVoucherCode();

  const audienceCounts = useMemo(
    () => buildDealAudienceCounts(initialDeals.vouchers),
    [initialDeals.vouchers]
  );

  const filteredVouchers = useMemo(
    () => filterVouchersByAudience(initialDeals.vouchers, activeAudience),
    [initialDeals.vouchers, activeAudience]
  );

  const { hero, carousel, allActive } = useMemo(
    () => partitionCampaigns(initialDeals.campaigns),
    [initialDeals.campaigns]
  );

  const featuredHeroVoucher = useMemo(
    () => (hero ? (resolveCampaignVouchers(hero, initialDeals.vouchers)[0] ?? null) : null),
    [hero, initialDeals.vouchers]
  );

  const audiencePills: Array<{
    value: VoucherAudience;
    testId: string;
    label: string;
    count: number;
  }> = [
    {
      value: "all",
      testId: "deals-filter-all",
      label: t("deals.filterAll"),
      count: audienceCounts.all,
    },
    {
      value: "new-user",
      testId: "deals-filter-new-user",
      label: t("deals.filterNewUser"),
      count: audienceCounts["new-user"],
    },
    {
      value: "member",
      testId: "deals-filter-member",
      label: t("deals.filterMember"),
      count: audienceCounts.member,
    },
  ];

  const hasCampaigns = hero !== null || carousel.length > 0;

  return (
    <div data-testid="deals-center-view" className="min-h-screen bg-[#f8fafc] pb-16">
      {/* Header & Breadcrumb */}
      <header className="bg-white border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-4">
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-500 font-medium"
          >
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 hover:text-emerald-700 transition-colors"
            >
              <Home className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{locale === "en" ? "Home" : "Trang chủ"}</span>
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
            <span className="text-slate-900 font-semibold">
              {locale === "en" ? "Deals" : "Ưu đãi"}
            </span>
          </nav>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-2 max-w-2xl">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200/80 text-amber-800 text-xs font-extrabold uppercase tracking-wider">
                <Tag className="w-3.5 h-3.5 text-amber-600" aria-hidden="true" />
                <span>
                  {locale === "en" ? "LuxeStay Promotions Hub" : "Trung tâm ưu đãi LuxeStay"}
                </span>
              </span>
              <h1 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
                {t("deals.ongoingTitle")}
              </h1>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                {locale === "en"
                  ? "Browse every active coupon code, filter by eligibility, and explore seasonal stay campaigns across Vietnam."
                  : "Tổng hợp toàn bộ mã giảm giá và các chiến dịch ưu đãi nghỉ dưỡng đang diễn ra trên khắp Việt Nam."}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
              <span className="px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/80">
                {audienceCounts.all}{" "}
                {locale === "en" ? "active coupons" : "mã ưu đãi đang mở"}
              </span>
              <span className="px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200/80">
                {allActive.length} {locale === "en" ? "campaigns" : "chiến dịch"}
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-10 space-y-12">
        {/* Section A: Filterable Voucher Vault */}
        <section aria-labelledby="deals-voucher-vault-heading" className="space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <Gift className="w-4 h-4" aria-hidden="true" />
                </span>
                <h2
                  id="deals-voucher-vault-heading"
                  className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight"
                >
                  {locale === "en" ? "Voucher Vault" : "Kho mã giảm giá"}
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-slate-500">
                {locale === "en"
                  ? "Filter codes by guest segment, copy in one tap, or inspect full terms."
                  : "Chọn nhóm khách hàng phù hợp để sao chép nhanh mã giảm giá hoặc kiểm tra thể lệ áp dụng."}
              </p>
            </div>

            {/* Audience Filter Pills */}
            <div
              role="group"
              aria-label={locale === "en" ? "Filter vouchers by audience" : "Lọc mã theo đối tượng"}
              className="flex flex-wrap items-center gap-2"
            >
              {audiencePills.map((pill) => {
                const isActive = activeAudience === pill.value;
                return (
                  <button
                    key={pill.value}
                    type="button"
                    data-testid={pill.testId}
                    aria-pressed={isActive}
                    onClick={() => setActiveAudience(pill.value)}
                    className={cn(
                      "inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm font-bold border transition-all cursor-pointer",
                      isActive
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-sm shadow-emerald-600/20"
                        : "bg-white text-slate-700 border-slate-200 hover:border-emerald-300 hover:text-emerald-700"
                    )}
                  >
                    <span>{pill.label}</span>
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded-full text-[11px] font-extrabold tabular-nums",
                        isActive
                          ? "bg-white/20 text-white"
                          : "bg-slate-100 text-slate-600"
                      )}
                    >
                      {pill.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {filteredVouchers.length === 0 ? (
            <div className="rounded-3xl bg-white border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
              {locale === "en"
                ? "No active coupons match this filter right now."
                : "Hiện chưa có mã giảm giá nào đang hiệu lực cho nhóm này."}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredVouchers.map((voucher) => (
                <VoucherCard
                  key={voucher.id}
                  voucher={voucher}
                  copied={copiedCode === voucher.code}
                  onCopy={handleCopy}
                  onInspect={setInspectedVoucher}
                />
              ))}
            </div>
          )}
        </section>

        {/* Section B: Featured Hero Campaign & Ongoing Campaigns Grid */}
        <section aria-labelledby="deals-campaigns-heading" className="space-y-6">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4" aria-hidden="true" />
            </span>
            <h2
              id="deals-campaigns-heading"
              className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight"
            >
              {locale === "en"
                ? "Featured Campaigns & All Active Deals"
                : "Chiến dịch nổi bật & Tất cả ưu đãi đang diễn ra"}
            </h2>
          </div>

          {!hasCampaigns ? (
            <div
              data-testid="deals-empty-campaigns"
              className="rounded-3xl bg-white border border-dashed border-slate-300 p-10 text-center space-y-3"
            >
              <p className="text-sm sm:text-base font-semibold text-slate-700">
                {locale === "en"
                  ? "No seasonal promotion campaigns are currently running."
                  : "Hiện chưa có chiến dịch ưu đãi nào đang diễn ra."}
              </p>
              <Link
                href="/"
                className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition-colors"
              >
                {locale === "en" ? "Explore LuxeStay stays" : "Khám phá chỗ nghỉ LuxeStay"}
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              {hero !== null && (
                <CampaignHeroBanner
                  campaign={hero}
                  featuredVoucher={featuredHeroVoucher}
                  copiedCode={copiedCode}
                  onCopy={handleCopy}
                />
              )}

              {carousel.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {carousel.map((campaign) => (
                    <CampaignCard key={campaign.id} campaign={campaign} />
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      {/* Shared Voucher Terms Inspection Modal */}
      <VoucherTermsModal
        voucher={inspectedVoucher}
        copied={Boolean(inspectedVoucher && copiedCode === inspectedVoucher.code)}
        onCopy={handleCopy}
        onClose={() => setInspectedVoucher(null)}
      />
    </div>
  );
}
