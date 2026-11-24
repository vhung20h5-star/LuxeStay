"use client";

import React from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="vi">
      <body className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-900 p-6 font-sans">
        <div className="max-w-lg w-full bg-white rounded-3xl border border-slate-200 shadow-xl p-8 text-center space-y-4">
          <h1 className="text-2xl font-bold text-slate-900">
            LuxeStay đang tạm gián đoạn
          </h1>
          <p className="text-sm text-slate-600">
            {error.message || "Hệ thống gặp sự cố ngoài dự kiến. Vui lòng tải lại trang."}
          </p>
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors"
          >
            Thử lại
          </button>
        </div>
      </body>
    </html>
  );
}
