import type {
  LocaleCode,
  PromotionCampaignTheme,
  PromotionVoucher,
} from "@luxestay/contracts";
import { filterVouchersByAudience } from "@luxestay/domain";

export interface CountdownParts {
  mounted: boolean;
  isExpired: boolean;
  days: number | null;
  hours: number | null;
  minutes: number | null;
  seconds: number | null;
}

export interface CarouselScrollState {
  canScrollLeft: boolean;
  canScrollRight: boolean;
}

export interface CampaignThemeStyle {
  overlayGradient: string;
  cardBorder: string;
  badgeClass: string;
  titleClass: string;
  highlightClass: string;
  footerClass: string;
  accentGlow: string;
}

const CAMPAIGN_THEME_STYLES: Record<PromotionCampaignTheme, CampaignThemeStyle> = {
  "coral-summer": {
    overlayGradient: "bg-gradient-to-r from-rose-600 via-red-600/95 to-rose-500/20",
    cardBorder: "border-rose-400/40 hover:border-rose-300/80",
    badgeClass: "bg-white/20 text-white border-white/30 backdrop-blur-sm",
    titleClass: "text-white",
    highlightClass: "text-amber-200",
    footerClass: "text-rose-50/90",
    accentGlow: "bg-amber-300/20",
  },
  "ocean-teal": {
    overlayGradient: "bg-gradient-to-r from-teal-700 via-cyan-700/95 to-sky-600/20",
    cardBorder: "border-cyan-400/40 hover:border-cyan-300/80",
    badgeClass: "bg-white/20 text-white border-white/30 backdrop-blur-sm",
    titleClass: "text-white",
    highlightClass: "text-amber-200",
    footerClass: "text-cyan-50/90",
    accentGlow: "bg-sky-300/20",
  },
  "luxury-gold": {
    overlayGradient: "bg-gradient-to-r from-slate-950/95 via-slate-900/85 to-amber-950/50",
    cardBorder: "border-amber-400/55 hover:border-amber-300",
    badgeClass: "bg-amber-400/15 text-amber-200 border-amber-300/40 backdrop-blur-sm",
    titleClass: "text-white tracking-wide",
    highlightClass: "text-amber-300",
    footerClass: "text-amber-100/85",
    accentGlow: "bg-amber-400/20",
  },
  "forest-mist": {
    overlayGradient: "bg-gradient-to-r from-emerald-900 via-teal-900/90 to-emerald-800/25",
    cardBorder: "border-emerald-400/40 hover:border-emerald-300/80",
    badgeClass: "bg-emerald-400/20 text-emerald-100 border-emerald-300/30 backdrop-blur-sm",
    titleClass: "text-white",
    highlightClass: "text-emerald-200",
    footerClass: "text-emerald-50/90",
    accentGlow: "bg-emerald-400/20",
  },
  "festive-night": {
    overlayGradient: "bg-gradient-to-r from-slate-950 via-indigo-950/90 to-amber-900/35",
    cardBorder: "border-indigo-400/40 hover:border-amber-300/70",
    badgeClass: "bg-amber-400/20 text-amber-200 border-amber-300/40 backdrop-blur-sm",
    titleClass: "text-white",
    highlightClass: "text-amber-300",
    footerClass: "text-slate-200",
    accentGlow: "bg-amber-400/20",
  },
};

/** Returns Tailwind visual styling tokens for a promotion campaign theme. */
export function getCampaignThemeStyle(theme: PromotionCampaignTheme): CampaignThemeStyle {
  return CAMPAIGN_THEME_STYLES[theme] ?? CAMPAIGN_THEME_STYLES["festive-night"];
}

/**
 * Orders Tier 1 homepage vouchers with active new-user coupons first,
 * followed by remaining active non-member-only coupons deduplicated by ID.
 */
export function buildHomepageTier1Vouchers(
  vouchers: readonly PromotionVoucher[],
  now: Date = new Date()
): PromotionVoucher[] {
  const newUserVouchers = filterVouchersByAudience(vouchers, "new-user", now);
  const allActiveVouchers = filterVouchersByAudience(vouchers, "all", now);

  const seenIds = new Set<string>();
  const ordered: PromotionVoucher[] = [];

  for (const voucher of newUserVouchers) {
    if (!seenIds.has(voucher.id)) {
      seenIds.add(voucher.id);
      ordered.push(voucher);
    }
  }

  for (const voucher of allActiveVouchers) {
    if (seenIds.has(voucher.id)) continue;
    if (voucher.memberOnly || voucher.audience === "member") continue;
    seenIds.add(voucher.id);
    ordered.push(voucher);
  }

  return ordered;
}

/**
 * Computes countdown breakdown from `nowMs` until `endsAt`.
 * When `nowMs` is `null` (SSR/pre-mount), returns placeholder null units to prevent hydration mismatch.
 */
export function computeCountdownParts(
  endsAt: string,
  nowMs: number | null
): CountdownParts {
  if (nowMs === null) {
    return {
      mounted: false,
      isExpired: false,
      days: null,
      hours: null,
      minutes: null,
      seconds: null,
    };
  }

  const targetMs = Date.parse(endsAt);
  if (!Number.isFinite(targetMs) || targetMs <= nowMs) {
    return {
      mounted: true,
      isExpired: true,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
    };
  }

  const totalSeconds = Math.max(0, Math.floor((targetMs - nowMs) / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return {
    mounted: true,
    isExpired: false,
    days,
    hours,
    minutes,
    seconds,
  };
}

/** Formats a numeric countdown part as zero-padded two-digit string, or "--" before mount. */
export function formatCountdownUnit(value: number | null): string {
  if (value === null) return "--";
  return String(Math.max(0, Math.floor(value))).padStart(2, "0");
}

/** Formats an ISO expiration timestamp in UTC cleanly for VI/EN locales. */
export function formatVoucherExpiry(isoDate: string, locale: LocaleCode): string {
  const parsedMs = Date.parse(isoDate);
  if (!Number.isFinite(parsedMs)) return isoDate;
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(parsedMs));
}

/** Determines whether a horizontal scroll container can scroll left or right (2px tolerance). */
export function computeCarouselScrollState(
  scrollLeft: number,
  clientWidth: number,
  scrollWidth: number
): CarouselScrollState {
  const tolerance = 2;
  return {
    canScrollLeft: scrollLeft > tolerance,
    canScrollRight: scrollLeft + clientWidth < scrollWidth - tolerance,
  };
}
