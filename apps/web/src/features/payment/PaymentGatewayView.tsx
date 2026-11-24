"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  CreditCard,
  QrCode,
  ShieldCheck,
  Wallet,
  XCircle,
} from "lucide-react";
import type { PaymentGatewaySession, PaymentOutcome, PaymentProvider } from "@luxestay/contracts";
import { formatVND } from "@luxestay/domain";
import { useBookingSession } from "@/features/booking/BookingContext";
import { HttpApiError, isAbortError } from "@/shared/ports/errors";
import { Button } from "@/shared/ui/Button";

const PROVIDER_META: Record<
  PaymentProvider,
  { name: string; gradient: string; accent: string; description: string }
> = {
  vnpay: {
    name: "VNPAY QR Sandbox",
    gradient: "from-sky-700 via-blue-700 to-indigo-800",
    accent: "text-sky-200",
    description: "Cổng thanh toán quét mã QR ngân hàng nội địa (môi trường thử nghiệm)",
  },
  momo: {
    name: "MoMo Wallet Sandbox",
    gradient: "from-pink-600 via-rose-600 to-fuchsia-700",
    accent: "text-pink-100",
    description: "Ví điện tử MoMo (môi trường thử nghiệm HMAC Webhook)",
  },
  card: {
    name: "Visa / Mastercard Sandbox",
    gradient: "from-slate-800 via-slate-900 to-emerald-950",
    accent: "text-emerald-200",
    description: "Cổng thanh toán thẻ quốc tế 3D-Secure (môi trường thử nghiệm)",
  },
};

function formatRemainingTime(expiresAtIso: string, nowMs: number): string {
  const diffSec = Math.max(0, Math.floor((Date.parse(expiresAtIso) - nowMs) / 1000));
  const mins = Math.floor(diffSec / 60);
  const secs = diffSec % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export function PaymentGatewayView({ transactionId }: { transactionId: string }) {
  const router = useRouter();
  const { paymentGateway } = useBookingSession();

  const [session, setSession] = useState<PaymentGatewaySession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [simulatingOutcome, setSimulatingOutcome] = useState<PaymentOutcome | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const controller = new AbortController();
    paymentGateway
      .getGatewaySession(transactionId, { signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) {
          setSession(data);
          setIsLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted || isAbortError(err)) return;
        setErrorMessage(
          err instanceof HttpApiError
            ? err.message
            : "Không thể tải thông tin phiên thanh toán."
        );
        setIsLoading(false);
      });

    return () => controller.abort();
  }, [paymentGateway, transactionId]);

  useEffect(() => {
    if (!session || session.transaction.status !== "pending") return;
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [session]);

  const handleSimulate = async (outcome: PaymentOutcome) => {
    if (!session) return;
    setErrorMessage(null);
    setSimulatingOutcome(outcome);
    try {
      const result = await paymentGateway.simulateOutcome(session.transaction.transactionId, {
        outcome,
        reason:
          outcome === "failed"
            ? "Người dùng hủy giao dịch trên cổng thanh toán Sandbox"
            : outcome === "expired"
              ? "Hết thời gian giữ chỗ thanh toán"
              : undefined,
      });

      setSession((prev) =>
        prev
          ? {
              ...prev,
              transaction: result.transaction,
              bookingSummary: {
                ...prev.bookingSummary,
                status: result.bookingStatus,
              },
            }
          : prev
      );

      if (outcome === "succeeded") {
        const bookingUrl = `/bookings/${encodeURIComponent(session.bookingSummary.bookingId)}?contact=${encodeURIComponent(session.bookingSummary.guestEmail)}`;
        router.push(bookingUrl);
      }
    } catch (err) {
      setErrorMessage(
        err instanceof HttpApiError
          ? err.message
          : "Không thể xử lý kết quả mô phỏng thanh toán."
      );
    } finally {
      setSimulatingOutcome(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-slate-50 px-4">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 rounded-full border-4 border-emerald-200 border-t-emerald-600 animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-600">
            Đang kết nối cổng thanh toán{" "}
            <span className="font-mono">{transactionId.toUpperCase()}</span>...
          </p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-[70vh] bg-slate-50 py-14 px-4">
        <div className="max-w-lg mx-auto bg-white rounded-3xl border border-slate-200 shadow-xl p-8 text-center space-y-4">
          <XCircle className="w-12 h-12 text-rose-500 mx-auto" />
          <h1 className="text-xl font-black text-slate-900">Không tìm thấy giao dịch</h1>
          <p className="text-xs sm:text-sm text-slate-500">{errorMessage}</p>
          <Link
            href="/bookings"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700"
          >
            Quay lại quản lý đơn đặt phòng
          </Link>
        </div>
      </div>
    );
  }

  const { transaction, bookingSummary, sandboxEnabled } = session;
  const providerMeta = PROVIDER_META[transaction.provider];
  const isPending = transaction.status === "pending";
  const bookingDetailHref = `/bookings/${encodeURIComponent(bookingSummary.bookingId)}?contact=${encodeURIComponent(bookingSummary.guestEmail)}`;

  return (
    <div className="min-h-[80vh] bg-slate-50 py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto space-y-5">
        <Link
          href={bookingDetailHref}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-emerald-700"
        >
          <ArrowLeft className="w-4 h-4" />
          Xem đơn đặt phòng {bookingSummary.bookingId}
        </Link>

        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xl overflow-hidden">
          {/* Provider Header */}
          <div className={`p-6 sm:p-8 text-white bg-gradient-to-r ${providerMeta.gradient}`}>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center">
                  {transaction.provider === "vnpay" ? (
                    <QrCode className="w-6 h-6" />
                  ) : transaction.provider === "momo" ? (
                    <Wallet className="w-6 h-6" />
                  ) : (
                    <CreditCard className="w-6 h-6" />
                  )}
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white/20">
                    HMAC-SHA256 Verified Gateway
                  </span>
                  <h1 className="text-xl sm:text-2xl font-black mt-1">{providerMeta.name}</h1>
                  <p className={`text-xs ${providerMeta.accent}`}>{providerMeta.description}</p>
                </div>
              </div>

              {isPending && (
                <div className="px-4 py-2 rounded-2xl bg-black/25 backdrop-blur-md text-right">
                  <span className="text-[10px] uppercase font-bold text-white/75 flex items-center justify-end gap-1">
                    <Clock className="w-3 h-3" /> Thời hạn thanh toán
                  </span>
                  <span className="font-mono text-lg font-black text-amber-300">
                    {formatRemainingTime(transaction.expiresAt, nowMs)}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            {/* Transaction & Booking Summary */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Mã giao dịch</span>
                <span className="font-mono font-bold text-slate-900">
                  {transaction.transactionId}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Mã đặt phòng</span>
                <span className="font-mono font-bold text-emerald-700">
                  {bookingSummary.bookingId}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Chỗ nghỉ</span>
                <span className="font-bold text-slate-900 text-right">
                  {bookingSummary.propertyTitle} ({bookingSummary.propertyCity})
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Lịch trình</span>
                <span className="font-semibold text-slate-700">
                  {bookingSummary.checkIn} → {bookingSummary.checkOut} ({bookingSummary.nights} đêm)
                </span>
              </div>
              <div className="pt-3 border-t border-slate-200 flex justify-between items-baseline">
                <span className="font-bold text-slate-800 text-sm">Số tiền cần thanh toán</span>
                <span className="text-2xl font-black text-emerald-700">
                  {formatVND(transaction.amount)}
                </span>
              </div>
            </div>

            {errorMessage && (
              <div
                role="alert"
                className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 flex items-center gap-2 text-xs font-semibold text-rose-800"
              >
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Status & Sandbox Controls */}
            {isPending ? (
              <div className="space-y-4">
                <div className="p-5 rounded-2xl border-2 border-dashed border-emerald-200 bg-emerald-50/40 text-center space-y-2">
                  <QrCode className="w-16 h-16 text-emerald-700 mx-auto" />
                  <p className="text-sm font-bold text-slate-900">
                    Mô phỏng phản hồi Webhook từ cổng {transaction.provider.toUpperCase()}
                  </p>
                  <p className="text-xs text-slate-600 max-w-md mx-auto">
                    Mỗi nút bên dưới sẽ tạo sự kiện webhook thật, ký chữ ký{" "}
                    <span className="font-mono font-semibold">HMAC-SHA256</span>, kiểm tra chống
                    trùng (idempotency) và tự động gửi email xác nhận vé điện tử khi thành công.
                  </p>
                </div>

                {sandboxEnabled ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <Button
                      type="button"
                      variant="primary"
                      isLoading={simulatingOutcome === "succeeded"}
                      disabled={simulatingOutcome !== null}
                      onClick={() => void handleSimulate("succeeded")}
                      className="justify-center font-bold"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-1.5" />
                      Thanh toán thành công
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      isLoading={simulatingOutcome === "failed"}
                      disabled={simulatingOutcome !== null}
                      onClick={() => void handleSimulate("failed")}
                      className="justify-center font-semibold text-rose-700 border-rose-200 hover:bg-rose-50"
                    >
                      <XCircle className="w-4 h-4 mr-1.5" />
                      Mô phỏng thất bại
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      isLoading={simulatingOutcome === "expired"}
                      disabled={simulatingOutcome !== null}
                      onClick={() => void handleSimulate("expired")}
                      className="justify-center font-semibold text-amber-700 border-amber-200 hover:bg-amber-50"
                    >
                      <Clock className="w-4 h-4 mr-1.5" />
                      Hết hạn GD
                    </Button>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
                    Chế độ Sandbox đã bị tắt ở môi trường production. Vui lòng hoàn tất trên cổng
                    thanh toán đối tác.
                  </div>
                )}
              </div>
            ) : (
              <div
                className={`p-5 rounded-2xl border text-center space-y-3 ${
                  transaction.status === "succeeded"
                    ? "bg-emerald-50 border-emerald-200"
                    : "bg-rose-50 border-rose-200"
                }`}
              >
                {transaction.status === "succeeded" ? (
                  <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                ) : (
                  <XCircle className="w-10 h-10 text-rose-600 mx-auto" />
                )}
                <h2 className="text-lg font-black text-slate-900">
                  {transaction.status === "succeeded"
                    ? "Thanh toán đã hoàn tất!"
                    : transaction.status === "expired"
                      ? "Giao dịch đã hết hạn"
                      : "Thanh toán không thành công"}
                </h2>
                {transaction.failureReason && (
                  <p className="text-xs text-rose-800">{transaction.failureReason}</p>
                )}
                <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                  <Link
                    href={bookingDetailHref}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                  >
                    Xem vé điện tử &amp; Email xác nhận
                  </Link>
                  <Link
                    href="/"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold"
                  >
                    Về trang chủ
                  </Link>
                </div>
              </div>
            )}

            <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Xác thực Webhook HMAC-SHA256 &amp; Chống xử lý trùng Idempotency</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
