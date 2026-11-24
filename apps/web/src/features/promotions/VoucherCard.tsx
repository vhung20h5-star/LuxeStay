"use client";

import React from "react";
import {
  Building2,
  Check,
  Copy,
  Crown,
  Flame,
  Info,
  Sparkles,
  Tag,
  Tent,
  Ticket,
  type LucideIcon,
} from "lucide-react";
import type { PromotionVoucher } from "@luxestay/contracts";
import { useLocale } from "@/features/locale/LocaleContext";
import { cn } from "@/shared/utils/cn";

const VOUCHER_ICON_MAP: Record<string, LucideIcon> = {
  Sparkles,
  Building2,
  Tent,
  Ticket,
  Flame,
  Crown,
};

export interface VoucherIconBadgeProps {
  iconName?: string;
  tone: PromotionVoucher["tone"];
  className?: string;
  iconClassName?: string;
}

/** Circular pastel icon badge mapped from voucher.iconName with Tag fallback. */
export function VoucherIconBadge({
  iconName,
  tone,
  className,
  iconClassName,
}: VoucherIconBadgeProps) {
  const Icon = (iconName && VOUCHER_ICON_MAP[iconName]) || Tag;
  const toneClasses =
    tone === "amber"
      ? "bg-amber-50 text-amber-600 border-amber-200/70"
      : "bg-emerald-50 text-emerald-600 border-emerald-200/70";

  return (
    <div
      className={cn(
        "w-10 h-10 rounded-full border flex items-center justify-center shrink-0",
        toneClasses,
        className
      )}
    >
      <Icon className={cn("w-5 h-5", iconClassName)} aria-hidden="true" />
    </div>
  );
}

export interface VoucherCardProps {
  voucher: PromotionVoucher;
  copied?: boolean;
  onCopy: (code: string) => void;
  onInspect: (voucher: PromotionVoucher) => void;
  selected?: boolean;
  onSelect?: (voucher: PromotionVoucher) => void;
  selectLabel?: string;
  selectedLabel?: string;
  notchBgClass?: string;
}

/** Traveloka-inspired ticket-notched voucher card with one-tap copy and terms inspection. */
export function VoucherCard({
  voucher,
  copied = false,
  onCopy,
  onInspect,
  selected = false,
  onSelect,
  selectLabel,
  selectedLabel,
  notchBgClass = "bg-[#f8fafc]",
}: VoucherCardProps) {
  const { t } = useLocale();
  const title = voucher.title ?? voucher.description;
  const subtitle = voucher.subtitle ?? voucher.description;
  const borderTone = selected
    ? "border-emerald-500 ring-2 ring-emerald-500/20"
    : "border-slate-200/90 hover:border-emerald-300/80";

  return (
    <article
      data-testid={`voucher-card-${voucher.code}`}
      className={cn(
        "relative bg-white border rounded-2xl shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden",
        borderTone
      )}
    >
      {/* Top Section: Icon, Title/Subtitle & Info Trigger */}
      <div className="p-4 pb-3 flex items-start gap-3">
        <VoucherIconBadge iconName={voucher.iconName} tone={voucher.tone} />

        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-slate-900 truncate leading-snug" title={title}>
            {title}
          </h3>
          <p className="text-xs text-slate-500 truncate mt-0.5 leading-relaxed" title={subtitle}>
            {subtitle}
          </p>
        </div>

        <button
          type="button"
          onClick={() => onInspect(voucher)}
          data-testid={`voucher-info-${voucher.code}`}
          aria-label={t("deals.conditions")}
          title={t("deals.conditions")}
          className="p-1.5 -mr-1 -mt-0.5 rounded-full text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 transition-colors shrink-0"
        >
          <Info className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>

      {/* Middle Ticket Cutout & Dashed Divider */}
      <div className="relative flex items-center py-1" aria-hidden="true">
        <span
          className={cn(
            "absolute -left-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border border-slate-200/90",
            selected && "border-emerald-500",
            notchBgClass
          )}
        />
        <div className="w-full border-t border-dashed border-slate-200 mx-3.5" />
        <span
          className={cn(
            "absolute -right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border border-slate-200/90",
            selected && "border-emerald-500",
            notchBgClass
          )}
        />
      </div>

      {/* Bottom Section: Code & Copy CTA */}
      <div className="px-4 pt-2.5 pb-3.5 flex items-center justify-between gap-2.5">
        <div className="min-w-0 flex items-center gap-1.5 text-slate-700">
          <Copy className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />
          <span className="font-mono font-bold text-xs sm:text-sm tracking-wider text-slate-800 truncate">
            {voucher.code}
          </span>
        </div>

        <button
          type="button"
          onClick={() => onCopy(voucher.code)}
          data-testid={`voucher-copy-${voucher.code}`}
          className={cn(
            "inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all shrink-0 cursor-pointer active:scale-95",
            copied
              ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
              : "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200/80"
          )}
        >
          {copied && <Check className="w-3.5 h-3.5" aria-hidden="true" />}
          <span>{copied ? t("deals.copied") : t("deals.copy")}</span>
        </button>
      </div>

      {/* Optional Selection Pill Row (used in Task 7 /deals/[slug]) */}
      {onSelect && (
        <div className="px-4 pb-3.5 pt-0">
          <button
            type="button"
            onClick={() => onSelect(voucher)}
            data-testid={`voucher-select-${voucher.code}`}
            className={cn(
              "w-full py-1.5 px-3 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all cursor-pointer",
              selected
                ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                : "bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border-slate-200 hover:border-emerald-300"
            )}
          >
            {selected && <Check className="w-3.5 h-3.5" aria-hidden="true" />}
            <span>
              {selected
                ? (selectedLabel ?? t("deals.autoApplySelected"))
                : (selectLabel ?? t("deals.selectToApply"))}
            </span>
          </button>
        </div>
      )}
    </article>
  );
}
