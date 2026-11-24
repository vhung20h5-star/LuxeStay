import type { PromotionVoucher } from "@luxestay/contracts";

export const PROMOTION_EXPIRY_LABEL = "30/11/2026";

export const PROMOTION_VOUCHERS: readonly PromotionVoucher[] = Object.freeze([
  {
    id: "voucher-250",
    code: "LUXESTAY250",
    description: "Giảm 250.000đ cho đơn từ 1.5tr",
    tone: "emerald",
    discountType: "fixed",
    discountValue: 250000,
    minOrderTotal: 1500000,
    expiresAt: "2026-11-30T23:59:59.000Z",
    isActive: true,
    memberOnly: false,
  },
  {
    id: "voucher-summer",
    code: "SUMMERVIBE",
    description: "Giảm 10% tối đa 500.000đ",
    tone: "amber",
    discountType: "percent",
    discountValue: 10,
    minOrderTotal: 0,
    maxDiscount: 500000,
    expiresAt: "2026-11-30T23:59:59.000Z",
    isActive: true,
    memberOnly: false,
  },
]);
