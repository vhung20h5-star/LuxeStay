"use client";

import React, { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Clock,
  Flame,
  Layers,
  MapPin,
  ShieldCheck,
  Sparkles,
  Tag,
  Ticket,
} from "lucide-react";
import type { DealDetail, PromotionVoucher, Property } from "@luxestay/contracts";
import { isCampaignExpired } from "@luxestay/domain";
import { useBookingSession } from "@/features/booking/BookingContext";
import { PropertyCard } from "@/features/catalog/PropertyCard";
import { useLocale } from "@/features/locale/LocaleContext";
import { cn } from "@/shared/utils/cn";
import { CampaignCountdown } from "./CampaignCountdown";
import { VoucherCard } from "./VoucherCard";
import { VoucherTermsModal } from "./VoucherTermsModal";
import {
  buildCampaignScopePills,
  getCampaignThemeStyle,
  resolveDealStayPromo,
  type CampaignScopePill,
} from "./promotionsHelpers";
import { useCopiedVoucherCode } from "./useCopiedVoucherCode";

export interface DealDetailViewProps {
  detail: DealDetail;
}

function ScopePillIcon({ kind }: { kind: CampaignScopePill["kind"] }) {
  switch (kind) {
    case "flashDeal":
      return <Flame className="w-3.5 h-3.5 text-rose-500 shrink-0" aria-hidden="true" />;
    case "destination":
      return <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" aria-hidden="true" />;
    case "category":
      return <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" aria-hidden="true" />;
    default:
      return <Tag className="w-3.5 h-3.5 text-indigo-600 shrink-0" aria-hidden="true" />;
  }
}

/** Dedicated /deals/[slug] Campaign Detail view with voucher selection and promo-prefilled stays. */
export function DealDetailView({ detail }: DealDetailViewProps) {
  const { campaign, vouchers, properties } = detail;
  const { locale, t } = useLocale();
  const { openPropertyWithPromo, startCheckoutWithPromo, setBookingPromoCode } =
    useBookingSession();
  const { copiedCode, handleCopy } = useCopiedVoucherCode();

  const expired = isCampaignExpired(campaign);
  const themeStyle = getCampaignThemeStyle(campaign.theme);

  const [selectedVoucherCode, setSelectedVoucherCode] = useState<string | null>(() =>
    !expired && vouchers[0] ? vouchers[0].code : null
  );
  const [inspectedVoucher, setInspectedVoucher] = useState<PromotionVoucher | null>(null);

  const selectedVoucher = useMemo(
    () =>
      expired || !selectedVoucherCode
        ? null
        : (vouchers.find((voucher) => voucher.code === selectedVoucherCode) ?? null),
    [expired, selectedVoucherCode, vouchers]
  );

  const scopePills = useMemo(
    () => buildCampaignScopePills(campaign.targetFilter, locale),
    [campaign.targetFilter, locale]
  );

  const handleOpenProperty = (
    property: Property,
    promoCode: string | undefined
  ) => {
    if (expired) {
      setBookingPromoCode(null);
    }
    openPropertyWithPromo(property, promoCode);
  };

  const handleBookProperty = (
    property: Property,
    promoCode: string | undefined
  ) => {
    if (expired) {
      setBookingPromoCode(null);
    }
    startCheckoutWithPromo(property, promoCode);
  };

  return (
    <div data-testid="deal-detail-view" className="min-h-screen bg-[#f8fafc] pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-8">
        {/* Top Navigation */}
        <div>
          <Link
            href="/deals"
            data-testid="deal-back-link"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-emerald-700 px-3 py-1.5 -ml-3 rounded-full hover:bg-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            <span>{t("deals.backToDeals")}</span>
          </Link>
        </div>

        {/* Full-Width Campaign Hero Visual */}
        <section
          className={cn(
            "relative rounded-3xl overflow-hidden shadow-xl border bg-slate-950 text-white",
            themeStyle.cardBorder
          )}
        >
          <Image
            src={campaign.image}
            alt={campaign.title}
            fill
            priority
            sizes="(max-width: 1280px) 100vw, 1280px"
            className="object-cover"
          />
          <div
            aria-hidden="true"
            className={cn("absolute inset-0", themeStyle.overlayGradient)}
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-slate-950/65 via-transparent to-slate-950/20"
          />
          <div
            aria-hidden="true"
            className={cn(
              "absolute -right-16 -top-16 w-72 h-72 rounded-full blur-3xl pointer-events-none",
              themeStyle.accentGlow
            )}
          />

          <div className="relative z-10 p-6 sm:p-8 lg:p-10 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
            <div className="lg:col-span-7 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-extrabold uppercase tracking-wider",
                    themeStyle.badgeClass
                  )}
                >
                  <Sparkles className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span>{campaign.badge}</span>
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-xs border border-white/20 text-xs font-semibold text-white/95">
                  <CalendarClock className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{campaign.periodLabel}</span>
                </span>
              </div>

              <h1
                className={cn(
                  "text-2xl sm:text-4xl lg:text-[42px] font-black tracking-tight leading-[1.15]",
                  themeStyle.titleClass
                )}
              >
                {campaign.title}
              </h1>

              <p className="text-sm sm:text-base text-slate-100/90 leading-relaxed max-w-2xl">
                {campaign.subtitle}
              </p>

              <p
                className={cn(
                  "text-xl sm:text-2xl font-black tracking-tight",
                  themeStyle.highlightClass
                )}
              >
                {campaign.highlightText}
              </p>
            </div>

            {/* Countdown & Campaign Quick Summary */}
            <div className="lg:col-span-5 bg-slate-950/45 backdrop-blur-md border border-white/20 rounded-2xl p-5 space-y-4 shadow-lg">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-200">
                  <Clock className="w-3.5 h-3.5 text-amber-300" aria-hidden="true" />
                  <span>
                    {expired
                      ? locale === "en"
                        ? "Campaign ended"
                        : "Ưu đãi đã kết thúc"
                      : t("deals.endsIn")}
                  </span>
                </span>
                <span
                  className={cn(
                    "text-[11px] font-bold px-2.5 py-0.5 rounded-full border",
                    expired
                      ? "bg-slate-800/80 text-slate-300 border-slate-600"
                      : "bg-emerald-500/20 text-emerald-200 border-emerald-300/30"
                  )}
                >
                  {expired
                    ? locale === "en"
                      ? "Expired"
                      : "Đã hết hạn"
                    : locale === "en"
                      ? "Active"
                      : "Đang diễn ra"}
                </span>
              </div>

              <CampaignCountdown endsAt={campaign.endsAt} />

              <div className="pt-2 border-t border-white/15 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-200/90">
                <span>
                  {vouchers.length}{" "}
                  {locale === "en" ? "campaign vouchers" : "mã ưu đãi áp dụng"}
                </span>
                <span>
                  {properties.length}{" "}
                  {locale === "en" ? "eligible stays" : "chỗ nghỉ tham gia"}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Expired Campaign Banner */}
        {expired && (
          <div
            role="status"
            data-testid="deal-expired-banner"
            className="rounded-2xl bg-amber-50 border border-amber-300/80 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs"
          >
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" aria-hidden="true" />
              </div>
              <div className="space-y-1 min-w-0">
                <h2 className="text-sm sm:text-base font-extrabold text-amber-950">
                  {locale === "en"
                    ? "This promotion campaign has ended"
                    : "Chương trình ưu đãi này đã kết thúc"}
                </h2>
                <p className="text-xs sm:text-sm text-amber-900/85 leading-relaxed">
                  {locale === "en"
                    ? "Automatic promo pre-fill is disabled for ended campaigns. Explore our currently active deals instead."
                    : "Tính năng tự động áp mã ưu đãi khi đặt phòng đã tạm ngưng cho chiến dịch hết hạn. Khám phá ngay các ưu đãi mới nhất đang mở."}
                </p>
              </div>
            </div>

            <Link
              href="/deals"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs sm:text-sm font-bold whitespace-nowrap shrink-0 transition-colors shadow-xs"
            >
              <span>{t("deals.viewAll")}</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
          </div>
        )}

        {/* Two-Column Campaign Details: Terms & Scope + Campaign Vouchers */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* Left Column: Terms & Target Scope */}
          <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-7 shadow-xs space-y-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/70 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4" aria-hidden="true" />
                </span>
                <h2 className="text-lg font-extrabold text-slate-900">
                  {t("deals.conditions")}
                </h2>
              </div>

              <ul className="space-y-2.5">
                {campaign.terms.map((term, index) => (
                  <li
                    key={`${campaign.id}-term-${index}`}
                    className="flex items-start gap-2.5 text-sm text-slate-700 leading-relaxed"
                  >
                    <CheckCircle2
                      className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5"
                      aria-hidden="true"
                    />
                    <span>{term}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-5 border-t border-slate-100 space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200/70 flex items-center justify-center shrink-0">
                  <Layers className="w-4 h-4" aria-hidden="true" />
                </span>
                <h3 className="text-base font-extrabold text-slate-900">
                  {t("deals.scope")}
                </h3>
              </div>

              <div className="flex flex-wrap gap-2">
                {scopePills.map((pill) => (
                  <span
                    key={pill.key}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200/80 text-xs font-semibold text-slate-700"
                  >
                    <ScopePillIcon kind={pill.kind} />
                    <span>{pill.label}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Campaign Vouchers */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <Ticket className="w-4 h-4" aria-hidden="true" />
                </span>
                <h2 className="text-lg font-extrabold text-slate-900">
                  {locale === "en" ? "Campaign Vouchers" : "Mã ưu đãi chiến dịch"}
                </h2>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-white border border-slate-200 text-xs font-bold text-slate-600">
                {vouchers.length}
              </span>
            </div>

            {vouchers.length === 0 ? (
              <div className="rounded-2xl bg-white border border-slate-200/80 p-5 text-sm text-slate-500">
                {locale === "en"
                  ? "No separate voucher code is required for this campaign."
                  : "Chiến dịch này không yêu cầu mã giảm giá riêng."}
              </div>
            ) : (
              <div className="space-y-3.5">
                {vouchers.map((voucher) => (
                  <VoucherCard
                    key={voucher.id}
                    voucher={voucher}
                    copied={copiedCode === voucher.code}
                    onCopy={handleCopy}
                    onInspect={setInspectedVoucher}
                    selected={!expired && selectedVoucherCode === voucher.code}
                    onSelect={
                      expired ? undefined : (v) => setSelectedVoucherCode(v.code)
                    }
                    selectLabel={t("deals.selectToApply")}
                    selectedLabel={t("deals.autoApplySelected")}
                  />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Matching Stays Section */}
        <section data-testid="deal-matching-stays" className="space-y-5 pt-2">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {t("deals.matchingStays")}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                {t("deals.matchingStaysSubtitle")}
              </p>
            </div>

            {!expired && selectedVoucher && (
              <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-900 self-start md:self-auto">
                <Ticket className="w-3.5 h-3.5 text-emerald-600 shrink-0" aria-hidden="true" />
                <span>
                  {locale === "en" ? "Selected code:" : "Đang chọn mã:"}{" "}
                  <strong className="font-mono font-black tracking-wide">
                    {selectedVoucher.code}
                  </strong>
                </span>
              </div>
            )}
          </div>

          {properties.length === 0 ? (
            <div className="rounded-3xl bg-white border border-dashed border-slate-300 p-10 text-center space-y-3">
              <p className="text-sm sm:text-base font-medium text-slate-600">
                {t("deals.noMatchingStays")}
              </p>
              <Link
                href="/"
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition-colors"
              >
                <span>
                  {locale === "en" ? "Explore all stays" : "Quay lại danh sách chỗ nghỉ"}
                </span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {properties.map((property) => {
                const { effectiveVoucher, wasAutoSwitched } = resolveDealStayPromo({
                  expired,
                  selectedVoucher,
                  campaignVouchers: vouchers,
                  property,
                });

                return (
                  <div key={property.id} className="flex flex-col gap-2.5">
                    {effectiveVoucher && (
                      <div
                        data-testid={`deal-stay-promo-${property.id}`}
                        data-promo-code={effectiveVoucher.code}
                        className={cn(
                          "px-3.5 py-2 rounded-2xl border text-xs flex items-center justify-between gap-2",
                          wasAutoSwitched
                            ? "bg-amber-50/90 border-amber-200 text-amber-900"
                            : "bg-emerald-50/90 border-emerald-200 text-emerald-900"
                        )}
                      >
                        <span className="inline-flex items-center gap-1.5 font-semibold truncate">
                          <Ticket className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                          <span className="truncate">
                            {locale === "en" ? "Auto-applies code: " : "Tự áp dụng mã: "}
                            <strong className="font-mono font-black tracking-wide">
                              {effectiveVoucher.code}
                            </strong>
                          </span>
                        </span>
                        {wasAutoSwitched && selectedVoucher && (
                          <span className="text-[11px] font-medium opacity-85 shrink-0">
                            {locale === "en"
                              ? `instead of ${selectedVoucher.code}`
                              : `thay cho ${selectedVoucher.code}`}
                          </span>
                        )}
                      </div>
                    )}

                    <PropertyCard
                      property={property}
                      onSelectProperty={(p) =>
                        handleOpenProperty(p, effectiveVoucher?.code)
                      }
                      onBookProperty={(p) =>
                        handleBookProperty(p, effectiveVoucher?.code)
                      }
                    />
                  </div>
                );
              })}
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
