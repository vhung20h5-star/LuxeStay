"use client";

import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/shared/ui/Button";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-16">
      <div className="max-w-lg w-full bg-white rounded-3xl border border-slate-200/80 shadow-xl p-8 text-center space-y-5">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-black text-slate-900">
            Không thể tải dữ liệu LuxeStay
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            {error.message ||
              "Đã xảy ra sự cố kết nối đến máy chủ dịch vụ. Vui lòng thử lại sau ít phút."}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Button variant="primary" onClick={reset} className="justify-center">
            <RefreshCw className="w-4 h-4 mr-2" />
            Thử tải lại
          </Button>
        </div>
      </div>
    </div>
  );
}
