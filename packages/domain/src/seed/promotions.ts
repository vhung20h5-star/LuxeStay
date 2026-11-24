import type { PromotionVoucher } from "@luxestay/contracts";

export const PROMOTION_EXPIRY_LABEL = "30/11/2026";

export const PROMOTION_VOUCHERS: readonly PromotionVoucher[] = Object.freeze([
  {
    id: "voucher-250",
    code: "LUXESTAY250",
    description: "Giảm 250.000đ cho đơn từ 1.5tr",
    tone: "emerald",
  },
  {
    id: "voucher-summer",
    code: "SUMMERVIBE",
    description: "Giảm 10% tối đa 500.000đ",
    tone: "amber",
  },
]);
