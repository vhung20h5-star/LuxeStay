import Link from "next/link";
import { Compass } from "lucide-react";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-16">
      <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200/80 shadow-xl p-8 text-center space-y-5">
        <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
          <Compass className="w-7 h-7" />
        </div>
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">
            Lỗi 404
          </p>
          <h1 className="text-2xl font-black text-slate-900">
            Không tìm thấy trang bạn yêu cầu
          </h1>
          <p className="text-sm text-slate-500">
            Đường dẫn có thể đã thay đổi hoặc chỗ nghỉ không còn khả dụng.
          </p>
        </div>
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors"
        >
          Quay về trang chủ LuxeStay
        </Link>
      </div>
    </div>
  );
}
