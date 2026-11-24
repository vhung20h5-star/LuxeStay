"use client";

import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarClock,
  Check,
  CheckCircle2,
  Copy,
  Layers,
  ShieldCheck,
  Wallet,
  X,
} from "lucide-react";
import type { PromotionVoucher } from "@luxestay/contracts";
import { buildVoucherTermsList, resolveVoucherScopeLabels } from "@luxestay/domain";
import { useLocale } from "@/features/locale/LocaleContext";
import { useOverlayLayer } from "@/shared/overlay/OverlayContext";
import { Badge } from "@/shared/ui/Badge";
import { Button } from "@/shared/ui/Button";
import { VoucherIconBadge } from "./VoucherCard";
import { formatVoucherExpiry } from "./promotionsHelpers";

export interface VoucherTermsModalProps {
  voucher: PromotionVoucher | null;
  copied?: boolean;
  onCopy: (code: string) => void;
  onClose: () => void;
}

/** Accessible terms & eligibility inspection modal registered with LuxeStay's OverlayContext. */
export function VoucherTermsModal({
  voucher,
  copied = false,
  onCopy,
  onClose,
}: VoucherTermsModalProps) {
  const { locale, formatPrice, t } = useLocale();
  const overlayLayer = useOverlayLayer({
    id: "voucher-terms-modal",
    kind: "dialog",
    isOpen: Boolean(voucher),
    onClose,
  });

  const terms = voucher ? buildVoucherTermsList(voucher) : [];
  const scope = voucher ? resolveVoucherScopeLabels(voucher) : null;
  const scopeLabels = scope
    ? [...scope.propertyTypeLabels, ...scope.categoryLabels]
    : [];

  return (
    <AnimatePresence>
      {voucher && (
        <div
          className="fixed inset-0 flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
          style={{ zIndex: overlayLayer.zIndex }}
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-md"
            aria-hidden="true"
          />

          {/* Dialog Panel */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={t("deals.modalTitle")}
            data-testid="voucher-terms-modal"
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className="relative w-full max-w-lg z-10 bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 max-h-[90vh] flex flex-col my-auto"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 p-5 sm:p-6 border-b border-slate-100 bg-slate-50/70">
              <div className="flex items-center gap-3 min-w-0">
                <VoucherIconBadge iconName={voucher.iconName} tone={voucher.tone} />
                <div className="min-w-0">
                  <h3 className="text-lg font-black text-slate-900 leading-tight">
                    {t("deals.modalTitle")}
                  </h3>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className="font-mono font-bold text-xs px-2.5 py-0.5 rounded-lg bg-slate-900 text-white tracking-wider">
                      {voucher.code}
                    </span>
                    {voucher.badge && (
                      <Badge variant={voucher.tone === "amber" ? "warning" : "default"}>
                        {voucher.badge}
                      </Badge>
                    )}
                    {voucher.newUserOnly && !voucher.badge && (
                      <Badge variant="default">{t("deals.filterNewUser")}</Badge>
                    )}
                    {voucher.memberOnly && !voucher.badge && (
                      <Badge variant="luxury">{t("deals.filterMember")}</Badge>
                    )}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label={locale === "en" ? "Close" : "Đóng"}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors shrink-0"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5">
              {/* Headline & Subtitle */}
              <div>
                <h4 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                  {voucher.title ?? voucher.description}
                </h4>
                {voucher.subtitle && (
                  <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                    {voucher.subtitle}
                  </p>
                )}
              </div>

              {/* Key Summary Pills */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70 flex items-center gap-2.5">
                  <Wallet className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />
                  <div className="min-w-0">
                    <span className="block text-[11px] font-medium text-slate-500">
                      {t("deals.minOrder")}
                    </span>
                    <span className="block text-sm font-bold text-slate-900">
                      {formatPrice(voucher.minOrderTotal)}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70 flex items-center gap-2.5">
                  <CalendarClock className="w-4 h-4 text-amber-600 shrink-0" aria-hidden="true" />
                  <div className="min-w-0">
                    <span className="block text-[11px] font-medium text-slate-500">
                      {t("deals.expiry")}
                    </span>
                    <span className="block text-sm font-bold text-slate-900">
                      {formatVoucherExpiry(voucher.expiresAt, locale)}
                    </span>
                  </div>
                </div>

                {voucher.maxDiscount !== undefined && (
                  <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200/70 flex items-center gap-2.5 sm:col-span-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />
                    <div className="min-w-0 flex items-center justify-between gap-2 w-full">
                      <span className="text-xs font-medium text-emerald-900">
                        {locale === "en" ? "Maximum discount" : "Mức giảm tối đa"}
                      </span>
                      <span className="text-sm font-black text-emerald-700">
                        {formatPrice(voucher.maxDiscount)}
                      </span>
                    </div>
                  </div>
                )}

                {scopeLabels.length > 0 && (
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70 flex items-start gap-2.5 sm:col-span-2">
                    <Layers className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" aria-hidden="true" />
                    <div className="min-w-0">
                      <span className="block text-[11px] font-medium text-slate-500">
                        {t("deals.scope")}
                      </span>
                      <span className="block text-xs font-semibold text-slate-800 mt-0.5">
                        {scopeLabels.join(" • ")}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Terms List */}
              <div className="space-y-2.5">
                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {t("deals.conditions")}
                </h5>
                <ul className="space-y-2">
                  {terms.map((term, idx) => (
                    <li
                      key={`${voucher.id}-term-${idx}`}
                      className="flex items-start gap-2 text-sm text-slate-700 leading-relaxed"
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
            </div>

            {/* Footer Action */}
            <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <span className="block text-[11px] text-slate-500">
                  {t("deals.featuredCode")}
                </span>
                <span className="font-mono font-black text-sm tracking-wider text-slate-900">
                  {voucher.code}
                </span>
              </div>

              <Button
                type="button"
                variant={copied ? "secondary" : "primary"}
                onClick={() => onCopy(voucher.code)}
                className="shrink-0 font-bold"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" aria-hidden="true" />
                    <span>{t("deals.copied")}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" aria-hidden="true" />
                    <span>{t("deals.copy")}</span>
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
