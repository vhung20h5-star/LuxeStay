import type { PromotionVoucher, Property } from "@luxestay/contracts";
import {
  isVoucherEligibleForProperty,
  resolveVoucherScopeLabels,
} from "./deals.js";
import { formatVND } from "./utils.js";

export type VoucherErrorReason =
  | "EMPTY"
  | "NOT_FOUND"
  | "INACTIVE"
  | "EXPIRED"
  | "MIN_ORDER"
  | "MEMBER_ONLY"
  | "NEW_USER_ONLY"
  | "PROPERTY_NOT_ELIGIBLE";

export type VoucherEvaluationResult =
  | {
      ok: true;
      code: string;
      voucher: PromotionVoucher;
      discount: number;
      message: string;
    }
  | {
      ok: false;
      code: string;
      reason: VoucherErrorReason;
      message: string;
    };

export function normalizeVoucherCode(code: string | undefined | null): string {
  if (!code) return "";
  return code.trim().toUpperCase();
}

function buildPropertyEligibilityMessage(
  code: string,
  voucher: PromotionVoucher
): string {
  const { propertyTypeLabels, categoryLabels } = resolveVoucherScopeLabels(voucher);
  if (propertyTypeLabels.length > 0 && categoryLabels.length > 0) {
    return `Mã "${code}" chỉ áp dụng cho loại hình ${propertyTypeLabels.join(", ")} thuộc nhóm ${categoryLabels.join(", ")}.`;
  }
  if (propertyTypeLabels.length > 0) {
    return `Mã "${code}" chỉ áp dụng cho chỗ nghỉ thuộc loại hình: ${propertyTypeLabels.join(", ")}.`;
  }
  if (categoryLabels.length > 0) {
    return `Mã "${code}" chỉ áp dụng cho chỗ nghỉ thuộc danh mục: ${categoryLabels.join(", ")}.`;
  }
  return `Mã "${code}" không áp dụng cho chỗ nghỉ này.`;
}

export function evaluatePromotionVoucher(
  rawCode: string | undefined | null,
  subtotal: number,
  vouchers: readonly PromotionVoucher[],
  options?: {
    now?: Date;
    isAuthenticated?: boolean;
    hasPriorSuccessfulBookings?: boolean;
    property?: Pick<Property, "propertyType" | "category">;
  }
): VoucherEvaluationResult {
  const code = normalizeVoucherCode(rawCode);
  if (!code) {
    return {
      ok: false,
      code: "",
      reason: "EMPTY",
      message: "Vui lòng nhập mã giảm giá.",
    };
  }

  const voucher = vouchers.find((item) => normalizeVoucherCode(item.code) === code);
  if (!voucher) {
    return {
      ok: false,
      code,
      reason: "NOT_FOUND",
      message: `Mã giảm giá "${code}" không tồn tại hoặc không hợp lệ.`,
    };
  }

  if (voucher.isActive === false) {
    return {
      ok: false,
      code,
      reason: "INACTIVE",
      message: `Mã giảm giá "${code}" hiện đã ngừng áp dụng.`,
    };
  }

  const now = options?.now ?? new Date();
  const expiresAtMs = Date.parse(voucher.expiresAt);
  if (Number.isFinite(expiresAtMs) && now.getTime() > expiresAtMs) {
    return {
      ok: false,
      code,
      reason: "EXPIRED",
      message: `Mã giảm giá "${code}" đã hết hạn sử dụng.`,
    };
  }

  if (voucher.memberOnly && !options?.isAuthenticated) {
    return {
      ok: false,
      code,
      reason: "MEMBER_ONLY",
      message: `Mã "${code}" chỉ áp dụng cho thành viên đã đăng nhập LuxeStay.`,
    };
  }

  if (
    voucher.newUserOnly &&
    options?.isAuthenticated &&
    options?.hasPriorSuccessfulBookings === true
  ) {
    return {
      ok: false,
      code,
      reason: "NEW_USER_ONLY",
      message: `Mã "${code}" chỉ áp dụng cho đơn đặt phòng đầu tiên của bạn trên LuxeStay.`,
    };
  }

  if (options?.property && !isVoucherEligibleForProperty(voucher, options.property)) {
    return {
      ok: false,
      code,
      reason: "PROPERTY_NOT_ELIGIBLE",
      message: buildPropertyEligibilityMessage(code, voucher),
    };
  }

  const safeSubtotal = Math.max(0, Math.round(Number.isFinite(subtotal) ? subtotal : 0));
  const minOrderTotal = voucher.minOrderTotal ?? 0;
  if (safeSubtotal < minOrderTotal) {
    return {
      ok: false,
      code,
      reason: "MIN_ORDER",
      message: `Mã "${code}" áp dụng cho đơn từ ${formatVND(minOrderTotal)} trở lên.`,
    };
  }

  let rawDiscount = 0;
  if (voucher.discountType === "percent") {
    rawDiscount = Math.round((safeSubtotal * voucher.discountValue) / 100);
    if (voucher.maxDiscount !== undefined) {
      rawDiscount = Math.min(rawDiscount, voucher.maxDiscount);
    }
  } else {
    rawDiscount = Math.round(voucher.discountValue);
  }

  const discount = Math.max(0, Math.min(safeSubtotal, rawDiscount));

  return {
    ok: true,
    code: voucher.code.toUpperCase(),
    voucher,
    discount,
    message: `Áp dụng mã ${voucher.code.toUpperCase()} thành công — giảm ${formatVND(discount)}.`,
  };
}
