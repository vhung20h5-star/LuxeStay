import test from "node:test";
import assert from "node:assert/strict";
import {
  DealDetailSchema,
  DealsHubSchema,
  PromotionCampaignSchema,
  PromotionVoucherSchema,
} from "@luxestay/contracts";
import {
  PROMOTION_CAMPAIGNS,
  PROMOTION_EXPIRY_LABEL,
  PROMOTION_VOUCHERS,
  PROPERTIES,
} from "../dist/seed/index.js";
import {
  buildVoucherTermsList,
  evaluatePromotionVoucher,
  filterVouchersByAudience,
  hasPriorSuccessfulBookings,
  isCampaignActive,
  isCampaignExpired,
  isVoucherEligibleForProperty,
  matchPropertiesForCampaign,
  partitionCampaigns,
  resolveCampaignVouchers,
  resolveEligibleVoucherForProperty,
} from "../dist/index.js";

const NOV_24 = new Date("2026-11-24T12:00:00.000Z");
const DEC_05 = new Date("2026-12-05T00:00:00.000Z");

const stay01 = PROPERTIES.find((p) => p.id === "stay-01")!;
const stay03 = PROPERTIES.find((p) => p.id === "stay-03")!;
const stay08 = PROPERTIES.find((p) => p.id === "stay-08")!;

test("PROMOTION_VOUCHERS has 6 frozen vouchers preserving LUXESTAY250 and SUMMERVIBE terms", () => {
  assert.equal(PROMOTION_EXPIRY_LABEL, "30/11/2026");
  assert.equal(PROMOTION_VOUCHERS.length, 6);
  assert.equal(Object.isFrozen(PROMOTION_VOUCHERS), true);

  assert.deepEqual(
    PROMOTION_VOUCHERS.map((v) => v.code),
    [
      "WELCOME150",
      "NEWSTAY250",
      "HOMESTAY10",
      "LUXESTAY250",
      "SUMMERVIBE",
      "VIPRESORT1M",
    ]
  );

  for (const voucher of PROMOTION_VOUCHERS) {
    assert.equal(Object.isFrozen(voucher), true);
    assert.equal(PromotionVoucherSchema.safeParse(voucher).success, true);
  }

  const luxestay250 = PROMOTION_VOUCHERS.find((v) => v.code === "LUXESTAY250")!;
  assert.equal(luxestay250.discountType, "fixed");
  assert.equal(luxestay250.discountValue, 250000);
  assert.equal(luxestay250.minOrderTotal, 1500000);
  assert.equal(luxestay250.expiresAt, "2026-11-30T23:59:59.000Z");

  const summervibe = PROMOTION_VOUCHERS.find((v) => v.code === "SUMMERVIBE")!;
  assert.equal(summervibe.discountType, "percent");
  assert.equal(summervibe.discountValue, 10);
  assert.equal(summervibe.maxDiscount, 500000);
  assert.equal(summervibe.minOrderTotal, 0);
  assert.equal(summervibe.expiresAt, "2026-11-30T23:59:59.000Z");

  // WELCOME150 must stay unrestricted so existing cloning tests remain valid
  assert.equal(PROMOTION_VOUCHERS[0].code, "WELCOME150");
  assert.equal(PROMOTION_VOUCHERS[0].applicablePropertyTypes, undefined);
  assert.equal(PROMOTION_VOUCHERS[0].applicableCategories, undefined);
});

test("PROMOTION_CAMPAIGNS has 5 frozen campaigns and partitionCampaigns never promotes carousel into hero", () => {
  assert.equal(PROMOTION_CAMPAIGNS.length, 5);
  assert.equal(Object.isFrozen(PROMOTION_CAMPAIGNS), true);

  for (const campaign of PROMOTION_CAMPAIGNS) {
    assert.equal(Object.isFrozen(campaign), true);
    assert.equal(PromotionCampaignSchema.safeParse(campaign).success, true);
  }

  const hubParsed = DealsHubSchema.safeParse({
    expiryLabel: PROMOTION_EXPIRY_LABEL,
    vouchers: PROMOTION_VOUCHERS,
    campaigns: PROMOTION_CAMPAIGNS,
  });
  assert.equal(hubParsed.success, true);

  const novPartition = partitionCampaigns(PROMOTION_CAMPAIGNS, NOV_24);
  assert.equal(novPartition.hero?.slug, "black-friday-2026");
  assert.equal(novPartition.carousel.length, 4);
  assert.equal(novPartition.allActive.length, 5);

  const blackFriday = PROMOTION_CAMPAIGNS.find((c) => c.slug === "black-friday-2026")!;
  assert.equal(isCampaignExpired(blackFriday, NOV_24), false);
  assert.equal(isCampaignActive(blackFriday, NOV_24), true);
  assert.equal(isCampaignActive(blackFriday, new Date("2026-11-16T23:59:59.000Z")), false);

  const decPartition = partitionCampaigns(PROMOTION_CAMPAIGNS, DEC_05);
  assert.equal(decPartition.hero, null);
  assert.equal(decPartition.carousel.length, 4);
  assert.equal(decPartition.allActive.length, 4);
  assert.equal(isCampaignExpired(blackFriday, DEC_05), true);
  assert.equal(isCampaignActive(blackFriday, DEC_05), false);
  assert.equal(isCampaignActive({ ...blackFriday, isActive: false }, NOV_24), false);
});

test("matchPropertiesForCampaign matches exact stay IDs for all 5 seeded campaigns and handles diacritics", () => {
  const expectedBySlug: Record<string, string[]> = {
    "black-friday-2026": ["stay-01", "stay-06", "stay-10"],
    "bien-he-phu-quoc-nha-trang": ["stay-02", "stay-07", "stay-08", "stay-10"],
    "san-may-da-lat-sapa": ["stay-01", "stay-03", "stay-04", "stay-11", "stay-12"],
    "worlds-best-resorts": ["stay-02", "stay-05", "stay-08", "stay-10"],
    "tron-pho-glamping-homestay": [
      "stay-01",
      "stay-04",
      "stay-06",
      "stay-09",
      "stay-11",
      "stay-12",
    ],
  };

  for (const [slug, expectedIds] of Object.entries(expectedBySlug)) {
    const campaign = PROMOTION_CAMPAIGNS.find((c) => c.slug === slug)!;
    const matched = matchPropertiesForCampaign(PROPERTIES, campaign);
    assert.deepEqual(
      matched.map((p) => p.id),
      expectedIds,
      `Mismatch for campaign ${slug}`
    );

    const detailParsed = DealDetailSchema.safeParse({
      campaign,
      vouchers: resolveCampaignVouchers(campaign, PROMOTION_VOUCHERS),
      properties: matched,
    });
    assert.equal(detailParsed.success, true);
  }

  const sanMay = PROMOTION_CAMPAIGNS.find((c) => c.slug === "san-may-da-lat-sapa")!;
  const diacriticCampaign = {
    ...sanMay,
    targetFilter: {
      destinations: ["da lat", "SA PA"],
      propertyTypes: ["homestay" as const],
    },
  };
  assert.deepEqual(
    matchPropertiesForCampaign(PROPERTIES, diacriticCampaign).map((p) => p.id),
    ["stay-01", "stay-04", "stay-11"]
  );
});

test("evaluatePromotionVoucher enforces NEW_USER_ONLY and hasPriorSuccessfulBookings status boundaries", () => {
  assert.equal(
    hasPriorSuccessfulBookings([
      { status: "cancelled" },
      { status: "expired" },
      { status: "payment_failed" },
      { status: "pending_payment" },
    ]),
    false
  );
  assert.equal(hasPriorSuccessfulBookings([{ status: "confirmed" }]), true);
  assert.equal(hasPriorSuccessfulBookings([{ status: "completed" }]), true);

  const guestWelcome = evaluatePromotionVoucher("WELCOME150", 1_500_000, PROMOTION_VOUCHERS, {
    now: NOV_24,
    isAuthenticated: false,
  });
  assert.equal(guestWelcome.ok, true);
  if (guestWelcome.ok) {
    assert.equal(guestWelcome.discount, 150000);
  }

  const firstTimeMember = evaluatePromotionVoucher("WELCOME150", 1_500_000, PROMOTION_VOUCHERS, {
    now: NOV_24,
    isAuthenticated: true,
    hasPriorSuccessfulBookings: false,
  });
  assert.equal(firstTimeMember.ok, true);

  const repeatMember = evaluatePromotionVoucher("WELCOME150", 1_500_000, PROMOTION_VOUCHERS, {
    now: NOV_24,
    isAuthenticated: true,
    hasPriorSuccessfulBookings: true,
  });
  assert.equal(repeatMember.ok, false);
  if (!repeatMember.ok) {
    assert.equal(repeatMember.reason, "NEW_USER_ONLY");
    assert.equal(
      repeatMember.message,
      'Mã "WELCOME150" chỉ áp dụng cho đơn đặt phòng đầu tiên của bạn trên LuxeStay.'
    );
  }
});

test("evaluatePromotionVoucher enforces PROPERTY_NOT_ELIGIBLE and resolveEligibleVoucherForProperty falls back cleanly", () => {
  const homestayInvalid = evaluatePromotionVoucher("HOMESTAY10", 2_000_000, PROMOTION_VOUCHERS, {
    now: NOV_24,
    property: stay03,
  });
  assert.equal(homestayInvalid.ok, false);
  if (!homestayInvalid.ok) {
    assert.equal(homestayInvalid.reason, "PROPERTY_NOT_ELIGIBLE");
  }

  const homestayValid = evaluatePromotionVoucher("HOMESTAY10", 2_000_000, PROMOTION_VOUCHERS, {
    now: NOV_24,
    property: stay01,
  });
  assert.equal(homestayValid.ok, true);
  if (homestayValid.ok) {
    assert.equal(homestayValid.discount, 200000);
  }

  const sanMayCampaign = PROMOTION_CAMPAIGNS.find((c) => c.slug === "san-may-da-lat-sapa")!;
  const campaignVouchers = resolveCampaignVouchers(sanMayCampaign, PROMOTION_VOUCHERS);
  assert.deepEqual(
    campaignVouchers.map((v) => v.code),
    ["WELCOME150", "HOMESTAY10"]
  );

  const homestay10 = PROMOTION_VOUCHERS.find((v) => v.code === "HOMESTAY10")!;
  assert.equal(isVoucherEligibleForProperty(homestay10, stay03), false);
  assert.equal(isVoucherEligibleForProperty(homestay10, stay01), true);

  assert.equal(
    resolveEligibleVoucherForProperty(homestay10, campaignVouchers, stay03)?.code,
    "WELCOME150"
  );
  assert.equal(
    resolveEligibleVoucherForProperty(homestay10, campaignVouchers, stay01)?.code,
    "HOMESTAY10"
  );

  const vipOnMountain = evaluatePromotionVoucher("VIPRESORT1M", 5_000_000, PROMOTION_VOUCHERS, {
    now: NOV_24,
    isAuthenticated: true,
    property: stay01,
  });
  assert.equal(vipOnMountain.ok, false);
  if (!vipOnMountain.ok) {
    assert.equal(vipOnMountain.reason, "PROPERTY_NOT_ELIGIBLE");
  }

  const vipOnLuxury = evaluatePromotionVoucher("VIPRESORT1M", 5_000_000, PROMOTION_VOUCHERS, {
    now: NOV_24,
    isAuthenticated: true,
    property: stay08,
  });
  assert.equal(vipOnLuxury.ok, true);
  if (vipOnLuxury.ok) {
    assert.equal(vipOnLuxury.discount, 1000000);
  }

  const vipUnauth = evaluatePromotionVoucher("VIPRESORT1M", 5_000_000, PROMOTION_VOUCHERS, {
    now: NOV_24,
    isAuthenticated: false,
    property: stay01,
  });
  assert.equal(vipUnauth.ok, false);
  if (!vipUnauth.ok) {
    assert.equal(vipUnauth.reason, "MEMBER_ONLY");
  }
});

test("filterVouchersByAudience, resolveCampaignVouchers, and buildVoucherTermsList work deterministically", () => {
  assert.equal(filterVouchersByAudience(PROMOTION_VOUCHERS, "new-user", NOV_24).length, 3);
  assert.equal(filterVouchersByAudience(PROMOTION_VOUCHERS, "member", NOV_24).length, 1);
  assert.equal(filterVouchersByAudience(PROMOTION_VOUCHERS, "all", NOV_24).length, 6);
  assert.equal(filterVouchersByAudience(PROMOTION_VOUCHERS, "all", DEC_05).length, 4);

  const blackFriday = PROMOTION_CAMPAIGNS.find((c) => c.slug === "black-friday-2026")!;
  const deduped = resolveCampaignVouchers(
    {
      ...blackFriday,
      voucherCodes: ["welcome150", "UNKNOWN", "WELCOME150", "summervibe"],
    },
    PROMOTION_VOUCHERS
  );
  assert.deepEqual(
    deduped.map((v) => v.code),
    ["WELCOME150", "SUMMERVIBE"]
  );

  const homestay10 = PROMOTION_VOUCHERS.find((v) => v.code === "HOMESTAY10")!;
  assert.deepEqual(buildVoucherTermsList(homestay10), homestay10.terms);

  const derivedTerms = buildVoucherTermsList({
    ...homestay10,
    terms: undefined,
  });
  assert.ok(derivedTerms.length >= 4);
  assert.ok(derivedTerms.some((t) => t.includes("700.000")));
  assert.ok(derivedTerms.some((t) => t.includes("300.000")));
  assert.ok(derivedTerms.some((t) => t.includes("Homestay")));
});
