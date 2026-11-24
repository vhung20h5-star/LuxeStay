"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  AlertCircle,
  CheckCircle2,
  Lock,
  ShieldCheck,
  Sparkles,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import type { BookingQuote } from "@luxestay/contracts";
import {
  describeSelectedAmenity,
  evaluatePromotionVoucher,
  formatAmenitiesFeeSummary,
  formatVND,
} from "@luxestay/domain";
import { useAuth } from "@/features/auth/AuthContext";
import { useBookingSession, useCatalog } from "@/features/booking/BookingContext";
import { SeasonalPricingSummary } from "@/features/property/SeasonalPricingSummary";
import { useOverlayLayer } from "@/shared/overlay/OverlayContext";
import { HttpApiError, isAbortError } from "@/shared/ports/errors";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";

function BookingCheckoutContent({ quote }: { quote: BookingQuote }) {
  const router = useRouter();
  const { user } = useAuth();
  const { promotions } = useCatalog();
  const {
    setCheckoutProperty,
    removeBookingAmenity,
    setBookingPromoCode,
    submitCheckout,
    paymentGateway,
  } = useBookingSession();
  const { property, nights, guests, checkIn, checkOut, selectedAmenities, pricing } = quote;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Form state (auto-populated from logged-in account when available)
  const [fullName, setFullName] = useState(user?.fullName ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [email, setEmail] = useState(
    user?.email && !user.email.endsWith(".local") ? user.email : ""
  );
  const [note, setNote] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"momo" | "vnpay" | "card" | "hotel">("vnpay");

  // Voucher input state
  const [voucherInput, setVoucherInput] = useState(pricing.appliedPromoCode ?? "");
  const [voucherFeedback, setVoucherFeedback] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);
  const [isValidatingVoucher, setIsValidatingVoucher] = useState(false);

  const subtotal = pricing.nightsTotal + pricing.cleaningFee + pricing.amenitiesFee;

  const fillDemoGuestInfo = () => {
    setFullName("Khách Hàng Trải Nghiệm");
    setPhone("0912 345 678");
    setEmail("demo.guest@luxestay.vn");
    setNote("Vui lòng chuẩn bị phòng tầng cao view thoáng giúp mình.");
    setErrorMessage(null);
  };

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const handleClose = () => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setIsSubmitting(false);
    setCheckoutProperty(null);
  };

  const overlayLayer = useOverlayLayer({
    id: "checkout-modal",
    kind: "checkout-modal",
    isOpen: true,
    onClose: handleClose,
  });

  const handleApplyVoucher = async (rawCode?: string) => {
    const codeToTry = (rawCode ?? voucherInput).trim().toUpperCase();
    setVoucherInput(codeToTry);
    if (!codeToTry) {
      setBookingPromoCode(null);
      setVoucherFeedback(null);
      return;
    }

    setIsValidatingVoucher(true);
    try {
      // Quick client validation first, then verify against server endpoint
      const localEval = evaluatePromotionVoucher(codeToTry, subtotal, promotions.vouchers, {
        isAuthenticated: Boolean(user),
      });
      if (!localEval.ok) {
        setBookingPromoCode(null);
        setVoucherFeedback({ tone: "error", message: localEval.message });
        return;
      }

      const serverRes = await paymentGateway.validateVoucher({ code: codeToTry, subtotal });
      if (!serverRes.valid) {
        setBookingPromoCode(null);
        setVoucherFeedback({ tone: "error", message: serverRes.message });
        return;
      }

      setBookingPromoCode(serverRes.code);
      setVoucherFeedback({ tone: "success", message: serverRes.message });
    } catch (err) {
      setBookingPromoCode(null);
      setVoucherFeedback({
        tone: "error",
        message:
          err instanceof HttpApiError ? err.message : "Không thể kiểm tra mã giảm giá lúc này.",
      });
    } finally {
      setIsValidatingVoucher(false);
    }
  };

  const handleRemoveVoucher = () => {
    setVoucherInput("");
    setBookingPromoCode(null);
    setVoucherFeedback(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsSubmitting(true);
    try {
      const result = await submitCheckout(
        {
          fullName,
          phone,
          email,
          note,
          paymentMethod,
          promoCode: pricing.appliedPromoCode,
        },
        controller.signal
      );

      if (!result.ok) {
        setErrorMessage(result.error);
        setIsSubmitting(false);
        return;
      }

      if (result.booking.status === "pending_payment" && result.booking.payment?.checkoutUrl) {
        router.push(result.booking.payment.checkoutUrl);
      }
    } catch (err) {
      if (isAbortError(err)) {
        return;
      }
      if (err instanceof HttpApiError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("Có lỗi xảy ra khi xác nhận đặt phòng. Vui lòng thử lại!");
      }
      setIsSubmitting(false);
    }
  };

  const guestSummary = [
    `${guests.adults} người lớn`,
    guests.children > 0 ? `${guests.children} trẻ em` : null,
    guests.rooms > 1 ? `${guests.rooms} phòng` : null,
  ]
    .filter(Boolean)
    .join(", ");

  const isOnlinePayment = paymentMethod !== "hotel";

  return (
    <div
      className="fixed inset-0 overflow-y-auto"
      style={{ zIndex: overlayLayer.zIndex }}
    >
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleClose}
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-md"
        aria-hidden="true"
      />

      <div className="min-h-full flex items-center justify-center p-3 sm:p-6 my-4">
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Xác nhận đặt phòng"
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden z-10 my-auto"
        >
          {/* Header */}
          <div className="p-5 sm:px-6 bg-white border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-slate-900">Xác nhận đặt phòng</h3>
              <p className="text-xs text-slate-500">
                Hoàn tất chỉ trong 1 phút • Bảo mật 256-bit SSL
              </p>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="p-2 text-slate-400 hover:text-slate-700 rounded-full"
              aria-label="Đóng"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form
            onSubmit={handleSubmit}
            noValidate
            className="p-5 sm:p-8 space-y-6 max-h-[80vh] overflow-y-auto"
          >
            {/* Stay Summary Card */}
            <div className="flex gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div className="relative w-20 h-20 rounded-xl overflow-hidden shrink-0">
                <Image
                  src={property.images[0]}
                  alt={property.title}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">
                  {property.location.city}
                </div>
                <h4 className="text-sm font-bold text-slate-900 truncate mt-0.5">
                  {property.title}
                </h4>
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-500 mt-1">
                  <span>★ {property.rating}</span>
                  <span>•</span>
                  <span>{nights} đêm nghỉ</span>
                  <span>•</span>
                  <span>{guestSummary}</span>
                  <span>•</span>
                  <span className="font-semibold text-slate-700">
                    {checkIn} → {checkOut}
                  </span>
                </div>
              </div>
            </div>

            {/* Selected Resort Amenities & Services (Removable) */}
            {selectedAmenities.length > 0 && (
              <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    <span>Tiện ích &amp; dịch vụ đi kèm đã chọn ({selectedAmenities.length})</span>
                  </div>
                  <span className="text-xs font-bold text-emerald-700">
                    {formatAmenitiesFeeSummary(pricing.amenitiesFee)}
                  </span>
                </div>

                <div className="space-y-2">
                  {selectedAmenities.map((item) => {
                    const display = describeSelectedAmenity(item);
                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-white border border-emerald-100"
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-800 truncate">
                            {item.name}
                          </div>
                          <div className="text-[11px] text-slate-500">{display.subtitle}</div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`text-xs font-bold ${
                              display.tone === "paid" ? "text-amber-700" : "text-teal-700"
                            }`}
                          >
                            {display.checkoutFee}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeBookingAmenity(item.id)}
                            disabled={isSubmitting}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-40"
                            title="Bỏ dịch vụ này"
                            aria-label={`Bỏ ${item.name}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 1: Guest Information */}
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                  <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs">
                    1
                  </div>
                  <span>Thông tin khách lưu trú</span>
                </div>
                <button
                  type="button"
                  onClick={fillDemoGuestInfo}
                  className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100/80 px-2.5 py-1 rounded-lg transition-colors"
                >
                  Điền nhanh thông tin mẫu
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Họ và tên đầy đủ"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ví dụ: Nguyễn Văn A"
                  required
                />
                <Input
                  label="Số điện thoại"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0912 345 678"
                  required
                />
              </div>

              <Input
                label="Email nhận vé xác nhận"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                required
              />

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Ghi chú cho chủ nhà (Tùy chọn)
                </label>
                <textarea
                  rows={2}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Ví dụ: Nhận phòng muộn sau 19h, mã chuyến bay đón sân bay..."
                  className="w-full rounded-xl bg-slate-50 border border-slate-200 p-3 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600"
                />
              </div>
            </div>

            <div className="h-px bg-slate-100" />

            {/* Step 2: Voucher / Promo Code Engine */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs">
                  2
                </div>
                <span>Mã giảm giá (Voucher)</span>
              </div>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Tag className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={voucherInput}
                    onChange={(e) => setVoucherInput(e.target.value.toUpperCase())}
                    placeholder="Nhập mã ưu đãi (VD: LUXESTAY250, SUMMERVIBE)"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono font-bold text-slate-900 uppercase focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600"
                  />
                </div>
                {pricing.appliedPromoCode ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleRemoveVoucher}
                    className="shrink-0 text-xs"
                  >
                    Gỡ mã
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="primary"
                    isLoading={isValidatingVoucher}
                    onClick={() => void handleApplyVoucher()}
                    className="shrink-0 text-xs font-bold"
                  >
                    Áp dụng
                  </Button>
                )}
              </div>

              {/* Quick-pick available vouchers */}
              {promotions.vouchers.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] text-slate-500 font-medium">Mã có sẵn:</span>
                  {promotions.vouchers.map((voucher) => {
                    const isApplied = pricing.appliedPromoCode === voucher.code;
                    return (
                      <button
                        key={voucher.id}
                        type="button"
                        onClick={() => void handleApplyVoucher(voucher.code)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-all ${
                          isApplied
                            ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                            : "border-slate-200 bg-white hover:border-emerald-400 text-slate-700"
                        }`}
                      >
                        <span className="font-mono font-bold">{voucher.code}</span>
                        <span className="text-slate-400">•</span>
                        <span className="truncate max-w-44">{voucher.description}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {voucherFeedback && (
                <div
                  className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                    voucherFeedback.tone === "success"
                      ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                      : "bg-amber-50 border border-amber-200 text-amber-900"
                  }`}
                >
                  {voucherFeedback.tone === "success" ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  )}
                  <span>{voucherFeedback.message}</span>
                </div>
              )}
            </div>

            <div className="h-px bg-slate-100" />

            {/* Step 3: Payment Method */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs">
                  3
                </div>
                <span>Phương thức thanh toán</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  {
                    id: "vnpay" as const,
                    label: "VNPAY QR Ngân Hàng",
                    desc: "Chuyển sang cổng VNPAY Sandbox",
                    badge: "Miễn phí GD",
                  },
                  {
                    id: "momo" as const,
                    label: "Ví Điện Tử MoMo",
                    desc: "Chuyển sang cổng MoMo Sandbox",
                    badge: "Khuyên dùng",
                  },
                  {
                    id: "card" as const,
                    label: "Thẻ Quốc Tế (Visa/Master)",
                    desc: "Chuyển sang cổng thẻ Sandbox",
                  },
                  {
                    id: "hotel" as const,
                    label: "Thanh toán tại chỗ nghỉ",
                    desc: "Xác nhận ngay • Trả khi check-in",
                  },
                ].map((pm) => (
                  <button
                    key={pm.id}
                    type="button"
                    onClick={() => setPaymentMethod(pm.id)}
                    className={`flex items-start gap-3 p-3.5 rounded-2xl border text-left transition-all ${
                      paymentMethod === pm.id
                        ? "border-emerald-600 bg-emerald-50/50 shadow-xs"
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full border mt-1 flex items-center justify-center ${
                        paymentMethod === pm.id
                          ? "border-emerald-600 bg-emerald-600 text-white"
                          : "border-slate-300"
                      }`}
                    >
                      {paymentMethod === pm.id && (
                        <div className="w-1.5 h-1.5 rounded-full bg-white" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-bold text-slate-900">{pm.label}</span>
                        {pm.badge && (
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded shrink-0">
                            {pm.badge}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-500 block mt-0.5">{pm.desc}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="h-px bg-slate-100" />

            {/* Total breakdown */}
            <div className="p-4 rounded-2xl bg-slate-50 space-y-2 text-xs">
              <SeasonalPricingSummary
                pricing={pricing}
                nights={nights}
                rooms={guests.rooms}
              />
              <div className="flex justify-between text-slate-600">
                <span>Phí dịch vụ &amp; dọn dẹp</span>
                <span>{formatVND(pricing.cleaningFee)}</span>
              </div>
              {selectedAmenities.length > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Tiện ích &amp; dịch vụ đi kèm ({selectedAmenities.length})</span>
                  <span className="font-semibold text-slate-800">
                    {formatAmenitiesFeeSummary(pricing.amenitiesFee)}
                  </span>
                </div>
              )}
              {pricing.discount > 0 && (
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>
                    Mã ưu đãi{" "}
                    {pricing.appliedPromoCode ? `(${pricing.appliedPromoCode})` : ""}
                  </span>
                  <span>-{formatVND(pricing.discount)}</span>
                </div>
              )}
              <div className="pt-2 border-t border-slate-200 flex justify-between text-base font-bold text-slate-900">
                <span>Tổng số tiền thanh toán</span>
                <span className="text-lg font-black text-emerald-700">
                  {formatVND(pricing.total)}
                </span>
              </div>
            </div>

            {/* Submit Action */}
            <div className="space-y-3">
              {errorMessage && (
                <div
                  role="alert"
                  className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 flex items-center gap-2.5 text-xs font-semibold text-rose-800"
                >
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={isSubmitting}
                className="w-full justify-center shadow-lg shadow-emerald-600/30 font-bold"
              >
                <Lock className="w-4 h-4 mr-2" />
                {isOnlinePayment
                  ? `Tiếp tục thanh toán (${formatVND(pricing.total)})`
                  : `Xác nhận đặt phòng ngay (${formatVND(pricing.total)})`}
              </Button>

              <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Bảo hiểm chuyến đi LuxeSafe miễn phí kèm theo</span>
              </div>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}

export function BookingCheckoutModal() {
  const { checkoutProperty, bookingQuote } = useBookingSession();

  if (!checkoutProperty || !bookingQuote) return null;

  return <BookingCheckoutContent key={checkoutProperty.id} quote={bookingQuote} />;
}
