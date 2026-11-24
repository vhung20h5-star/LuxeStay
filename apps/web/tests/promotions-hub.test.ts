import test from "node:test";
import assert from "node:assert/strict";
import type { PromotionCampaignTheme, PromotionVoucher } from "@luxestay/contracts";
import { PROMOTION_VOUCHERS } from "@luxestay/domain/seed";
import {
  buildHomepageTier1Vouchers,
  computeCarouselScrollState,
  computeCountdownParts,
  formatCountdownUnit,
  formatVoucherExpiry,
  getCampaignThemeStyle,
} from "@/features/promotions/promotionsHelpers";

test("buildHomepageTier1Vouchers places new-user vouchers first, appends active non-member vouchers, and deduplicates", () => {
  const now = new Date("2026-11-24T12:00:00.000Z");
  const duplicatedInput: PromotionVoucher[] = [
    ...PROMOTION_VOUCHERS,
    { ...PROMOTION_VOUCHERS[0] },
    {
      id: "voucher-expired",
      code: "EXPIRED99",
      description: "Expired promo",
      tone: "amber",
      discountType: "fixed",
      discountValue: 99000,
      minOrderTotal: 0,
      expiresAt: "2026-11-01T00:00:00.000Z",
      isActive: true,
      memberOnly: false,
      audience: "all",
      newUserOnly: false,
    },
    {
      id: "voucher-inactive",
      code: "INACTIVE99",
      description: "Inactive promo",
      tone: "emerald",
      discountType: "fixed",
      discountValue: 99000,
      minOrderTotal: 0,
      expiresAt: "2026-12-31T23:59:59.000Z",
      isActive: false,
      memberOnly: false,
      audience: "all",
      newUserOnly: false,
    },
  ];

  const result = buildHomepageTier1Vouchers(duplicatedInput, now);
  assert.deepEqual(
    result.map((v) => v.code),
    ["WELCOME150", "NEWSTAY250", "HOMESTAY10", "LUXESTAY250", "SUMMERVIBE"]
  );
  assert.equal(
    result.some((v) => v.code === "VIPRESORT1M"),
    false,
    "member-only voucher should not appear in homepage Tier 1 strip"
  );
});

test("buildHomepageTier1Vouchers excludes vouchers expired at later dates", () => {
  const decemberNow = new Date("2026-12-05T00:00:00.000Z");
  const result = buildHomepageTier1Vouchers(PROMOTION_VOUCHERS, decemberNow);
  assert.deepEqual(
    result.map((v) => v.code),
    ["WELCOME150", "NEWSTAY250", "HOMESTAY10"]
  );
});

test("computeCountdownParts stays deterministic before mount and stops cleanly at 00:00:00 when expired", () => {
  const endsAt = "2026-11-30T23:59:59.000Z";

  const preMount = computeCountdownParts(endsAt, null);
  assert.deepEqual(preMount, {
    mounted: false,
    isExpired: false,
    days: null,
    hours: null,
    minutes: null,
    seconds: null,
  });
  assert.equal(formatCountdownUnit(preMount.hours), "--");

  const activeNowMs = Date.parse("2026-11-28T21:58:54.000Z");
  const active = computeCountdownParts(endsAt, activeNowMs);
  assert.deepEqual(active, {
    mounted: true,
    isExpired: false,
    days: 2,
    hours: 2,
    minutes: 1,
    seconds: 5,
  });
  assert.equal(formatCountdownUnit(active.days), "02");
  assert.equal(formatCountdownUnit(active.seconds), "05");

  const expired = computeCountdownParts(endsAt, Date.parse("2026-12-01T00:00:00.000Z"));
  assert.deepEqual(expired, {
    mounted: true,
    isExpired: true,
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });
  assert.equal(formatCountdownUnit(expired.hours), "00");

  const invalid = computeCountdownParts("not-a-date", activeNowMs);
  assert.equal(invalid.isExpired, true);
  assert.equal(invalid.seconds, 0);
});

test("formatVoucherExpiry formats ISO dates in UTC cleanly across vi and en locales", () => {
  assert.equal(formatVoucherExpiry("2026-12-31T23:59:59.000Z", "vi"), "31/12/2026");
  assert.equal(formatVoucherExpiry("2026-12-31T23:59:59.000Z", "en"), "12/31/2026");
  assert.equal(formatVoucherExpiry("invalid-date", "vi"), "invalid-date");
});

test("computeCarouselScrollState tracks left/right overflow bounds accurately", () => {
  assert.deepEqual(computeCarouselScrollState(0, 900, 900), {
    canScrollLeft: false,
    canScrollRight: false,
  });
  assert.deepEqual(computeCarouselScrollState(0, 900, 1400), {
    canScrollLeft: false,
    canScrollRight: true,
  });
  assert.deepEqual(computeCarouselScrollState(250, 900, 1400), {
    canScrollLeft: true,
    canScrollRight: true,
  });
  assert.deepEqual(computeCarouselScrollState(500, 900, 1400), {
    canScrollLeft: true,
    canScrollRight: false,
  });
});

test("getCampaignThemeStyle returns complete visual styles for all 5 campaign themes", () => {
  const themes: PromotionCampaignTheme[] = [
    "festive-night",
    "coral-summer",
    "ocean-teal",
    "luxury-gold",
    "forest-mist",
  ];
  for (const theme of themes) {
    const style = getCampaignThemeStyle(theme);
    assert.ok(style.overlayGradient.length > 0);
    assert.ok(style.cardBorder.length > 0);
    assert.ok(style.badgeClass.length > 0);
    assert.ok(style.highlightClass.length > 0);
  }
});
