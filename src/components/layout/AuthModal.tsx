"use client";

import React from "react";
import { Sparkles } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

export interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  return (
    <Modal
      overlayId="auth-modal"
      overlayKind="auth-modal"
      isOpen={isOpen}
      onClose={onClose}
      ariaLabel="Đăng nhập LuxeStay"
      maxWidth="sm"
    >
      <div className="text-center py-2">
        <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Sparkles className="w-6 h-6" />
        </div>
        <h3 className="text-xl font-bold text-slate-900">Chào mừng đến với LuxeStay</h3>
        <p className="text-xs text-slate-500 mt-1 mb-6">
          Đăng nhập để nhận ưu đãi thành viên giảm tới 25% cho chuyến đi tiếp theo
        </p>
        <div className="space-y-3">
          <Button variant="outline" className="w-full justify-center" onClick={onClose}>
            Tiếp tục với Google
          </Button>
          <Button variant="primary" className="w-full justify-center" onClick={onClose}>
            Tiếp tục với Số điện thoại
          </Button>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="mt-4 text-xs font-medium text-slate-400 hover:text-slate-600"
        >
          Để sau, xem phòng trước
        </button>
      </div>
    </Modal>
  );
}
