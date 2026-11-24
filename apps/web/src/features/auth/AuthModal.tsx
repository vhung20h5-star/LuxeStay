"use client";

import React, { useState } from "react";
import { AlertCircle, CheckCircle2, KeyRound, Mail, ShieldCheck, Smartphone, Sparkles } from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import { HttpApiError } from "@/shared/ports/errors";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import { Modal } from "@/shared/ui/Modal";

type AuthTab = "login" | "register" | "otp";

export function AuthModal() {
  const { authModalOpen, setAuthModalOpen, login, register, requestOtp, verifyOtp } = useAuth();
  const [tab, setTab] = useState<AuthTab>("login");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Register state
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regPassword, setRegPassword] = useState("");

  // OTP state
  const [otpIdentifier, setOtpIdentifier] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpFullName, setOtpFullName] = useState("");
  const [otpSentTo, setOtpSentTo] = useState<{
    identifier: string;
    channel: "email" | "sms";
    devCode?: string;
  } | null>(null);

  const resetMessages = () => {
    setErrorMessage(null);
  };

  const handleClose = () => {
    resetMessages();
    setAuthModalOpen(false);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    setIsSubmitting(true);
    try {
      await login({ email: loginEmail, password: loginPassword });
      setLoginPassword("");
    } catch (err) {
      setErrorMessage(
        err instanceof HttpApiError ? err.message : "Đăng nhập thất bại. Vui lòng thử lại!"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    setIsSubmitting(true);
    try {
      await register({
        fullName: regName,
        email: regEmail,
        phone: regPhone.trim() || undefined,
        password: regPassword,
      });
      setRegPassword("");
    } catch (err) {
      setErrorMessage(
        err instanceof HttpApiError ? err.message : "Đăng ký thất bại. Vui lòng thử lại!"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    setIsSubmitting(true);
    try {
      const res = await requestOtp({ identifier: otpIdentifier });
      setOtpSentTo({
        identifier: res.identifier,
        channel: res.channel,
        devCode: res.devCode,
      });
    } catch (err) {
      setErrorMessage(
        err instanceof HttpApiError ? err.message : "Không thể gửi mã OTP lúc này."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpSentTo) return;
    resetMessages();
    setIsSubmitting(true);
    try {
      await verifyOtp({
        identifier: otpSentTo.identifier,
        code: otpCode,
        fullName: otpFullName.trim() || undefined,
      });
      setOtpCode("");
      setOtpSentTo(null);
    } catch (err) {
      setErrorMessage(
        err instanceof HttpApiError ? err.message : "Xác thực mã OTP thất bại."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      overlayId="auth-modal"
      overlayKind="auth-modal"
      isOpen={authModalOpen}
      onClose={handleClose}
      ariaLabel="Tài khoản LuxeStay"
      maxWidth="md"
    >
      <div className="space-y-5">
        {/* Header */}
        <div className="text-center">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Sparkles className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-black text-slate-900">Tài khoản thành viên LuxeStay</h3>
          <p className="text-xs text-slate-500 mt-1">
            Đồng bộ danh sách yêu thích, quản lý lịch sử đơn đặt phòng và áp dụng mã ưu đãi độc quyền.
          </p>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="grid grid-cols-3 gap-1 p-1 rounded-2xl bg-slate-100 text-xs font-bold">
          {[
            { id: "login" as const, label: "Đăng nhập", icon: KeyRound },
            { id: "register" as const, label: "Đăng ký", icon: Mail },
            { id: "otp" as const, label: "OTP nhanh", icon: Smartphone },
          ].map((item) => {
            const Icon = item.icon;
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setTab(item.id);
                  resetMessages();
                }}
                className={`py-2 px-2 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                  active
                    ? "bg-white text-emerald-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Error banner */}
        {errorMessage && (
          <div
            role="alert"
            className="p-3 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-2 text-xs font-semibold text-rose-800"
          >
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Tab 1: Login */}
        {tab === "login" && (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <Input
              label="Email"
              type="email"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              placeholder="ban@example.com"
              required
            />
            <Input
              label="Mật khẩu"
              type="password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              placeholder="Nhập mật khẩu của bạn"
              required
            />
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting}
              className="w-full justify-center font-bold"
            >
              Đăng nhập ngay
            </Button>
          </form>
        )}

        {/* Tab 2: Register */}
        {tab === "register" && (
          <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
            <Input
              label="Họ và tên"
              value={regName}
              onChange={(e) => setRegName(e.target.value)}
              placeholder="Nguyễn Minh Anh"
              required
            />
            <Input
              label="Email"
              type="email"
              value={regEmail}
              onChange={(e) => setRegEmail(e.target.value)}
              placeholder="minhanh@example.com"
              required
            />
            <Input
              label="Số điện thoại (Tùy chọn)"
              value={regPhone}
              onChange={(e) => setRegPhone(e.target.value)}
              placeholder="0912 345 678"
            />
            <Input
              label="Mật khẩu (tối thiểu 6 ký tự)"
              type="password"
              value={regPassword}
              onChange={(e) => setRegPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting}
              className="w-full justify-center font-bold"
            >
              Tạo tài khoản LuxeStay
            </Button>
          </form>
        )}

        {/* Tab 3: OTP Passwordless */}
        {tab === "otp" && !otpSentTo && (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <Input
              label="Số điện thoại Việt Nam hoặc Email"
              value={otpIdentifier}
              onChange={(e) => setOtpIdentifier(e.target.value)}
              placeholder="0912 345 678 hoặc email@example.com"
              required
            />
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting}
              className="w-full justify-center font-bold"
            >
              Gửi mã xác thực 6 chữ số
            </Button>
          </form>
        )}

        {tab === "otp" && otpSentTo && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>
                  Đã gửi mã OTP qua {otpSentTo.channel === "sms" ? "SMS" : "Email"} tới{" "}
                  <strong>{otpSentTo.identifier}</strong>
                </span>
              </div>
              {otpSentTo.devCode && (
                <div className="flex items-center justify-between gap-2 pt-1">
                  <span className="text-[11px] text-emerald-800">
                    Mã thử nghiệm (Dev Sandbox):{" "}
                    <strong className="font-mono text-sm tracking-widest">
                      {otpSentTo.devCode}
                    </strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => setOtpCode(otpSentTo.devCode ?? "")}
                    className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold transition-colors"
                  >
                    Điền nhanh
                  </button>
                </div>
              )}
            </div>

            <Input
              label="Mã xác thực 6 chữ số"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value)}
              placeholder="123456"
              maxLength={6}
              required
            />
            <Input
              label="Tên hiển thị (nếu đăng nhập lần đầu)"
              value={otpFullName}
              onChange={(e) => setOtpFullName(e.target.value)}
              placeholder="Ví dụ: Trần Gia Bảo"
            />

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setOtpSentTo(null);
                  setOtpCode("");
                  resetMessages();
                }}
              >
                Đổi SĐT/Email
              </Button>
              <Button
                type="submit"
                variant="primary"
                isLoading={isSubmitting}
                className="flex-1 justify-center font-bold"
              >
                Xác thực &amp; Đăng nhập
              </Button>
            </div>
          </form>
        )}

        {/* Security footer */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            Phiên bảo mật HttpOnly Cookie
          </span>
          <button
            type="button"
            onClick={handleClose}
            className="font-semibold text-slate-500 hover:text-slate-700"
          >
            Để sau
          </button>
        </div>
      </div>
    </Modal>
  );
}
