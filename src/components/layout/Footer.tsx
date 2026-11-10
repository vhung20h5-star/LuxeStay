"use client";

import React, { useState } from "react";
import { Sparkles, Heart, ShieldCheck, Headphones, Award, Send, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function Footer() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSubscribed(true);
    setTimeout(() => {
      setEmail("");
      setSubscribed(false);
    }, 4000);
  };

  return (
    <footer className="bg-slate-900 text-slate-300 pt-16 pb-12 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Value Props Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-12 border-b border-slate-800">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-500/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-white font-bold text-base">Cam kết hoàn tiền 100%</h4>
              <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                Hỗ trợ hủy phòng miễn phí trước 48h tại hàng nghìn khách sạn & homestay đối tác.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="p-3 bg-amber-500/10 text-amber-400 rounded-2xl border border-amber-500/20">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-white font-bold text-base">Tuyển chọn chất lượng 5 Sao</h4>
              <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                Tất cả phòng nghỉ đều được chuyên gia trải nghiệm và thẩm định thực tế trước khi lên sàn.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="p-3 bg-teal-500/10 text-teal-400 rounded-2xl border border-teal-500/20">
              <Headphones className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-white font-bold text-base">Hỗ trợ chăm sóc 24/7</h4>
              <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                Đội ngũ tư vấn viên luôn túc trực hỗ trợ check-in, đổi phòng và tư vấn lịch trình bất kỳ lúc nào.
              </p>
            </div>
          </div>
        </div>

        {/* Main Footer Links */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-10 py-12">
          {/* Brand Info */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white">
                <Sparkles className="w-5 h-5" />
              </div>
              <span className="text-2xl font-black tracking-tight text-white">
                Luxe<span className="text-emerald-400">Stay</span>
              </span>
            </div>
            <p className="text-slate-400 text-sm max-w-sm leading-relaxed">
              Nền tảng đặt phòng khách sạn, homestay & villa nghỉ dưỡng hàng đầu Việt Nam. Mang đến kỳ nghỉ trong mơ với mức giá tốt nhất và trải nghiệm tuyệt hảo.
            </p>
            <div className="pt-2">
              <form onSubmit={handleSubscribe} className="flex gap-2 max-w-sm">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Nhận voucher 200.000đ qua email..."
                  className="bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-2 text-xs flex-1 focus:outline-none focus:border-emerald-500 transition-colors"
                />
                <Button variant="primary" size="sm" type="submit">
                  {subscribed ? <Check className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                </Button>
              </form>
              {subscribed && (
                <p className="text-emerald-400 text-xs mt-2 font-medium">
                  Cảm ơn bạn! Mã ưu đãi đã được gửi tới hòm thư.
                </p>
              )}
            </div>
          </div>

          {/* Col 1 */}
          <div>
            <h5 className="text-white font-semibold text-sm mb-3">Điểm đến nổi bật</h5>
            <ul className="space-y-2 text-xs text-slate-400">
              <li><a href="#properties-section" className="hover:text-emerald-400 transition-colors">Homestay Đà Lạt</a></li>
              <li><a href="#properties-section" className="hover:text-emerald-400 transition-colors">Resort Phú Quốc</a></li>
              <li><a href="#properties-section" className="hover:text-emerald-400 transition-colors">Khách sạn Sa Pa</a></li>
              <li><a href="#properties-section" className="hover:text-emerald-400 transition-colors">Villa ven biển Đà Nẵng</a></li>
              <li><a href="#properties-section" className="hover:text-emerald-400 transition-colors">Ecolodge Ninh Bình</a></li>
              <li><a href="#properties-section" className="hover:text-emerald-400 transition-colors">Phố Cổ Hội An</a></li>
            </ul>
          </div>

          {/* Col 2 */}
          <div>
            <h5 className="text-white font-semibold text-sm mb-3">Loại hình lưu trú</h5>
            <ul className="space-y-2 text-xs text-slate-400">
              <li><a href="#properties-section" className="hover:text-emerald-400 transition-colors">Biệt thự view biển</a></li>
              <li><a href="#properties-section" className="hover:text-emerald-400 transition-colors">Nhà gỗ rừng thông</a></li>
              <li><a href="#properties-section" className="hover:text-emerald-400 transition-colors">Glamping & Lều cắm trại</a></li>
              <li><a href="#properties-section" className="hover:text-emerald-400 transition-colors">Khách sạn trung tâm phố</a></li>
              <li><a href="#properties-section" className="hover:text-emerald-400 transition-colors">Căn hộ Penthouse</a></li>
              <li><a href="#properties-section" className="hover:text-emerald-400 transition-colors">Bungalow sinh thái</a></li>
            </ul>
          </div>

          {/* Col 3 */}
          <div>
            <h5 className="text-white font-semibold text-sm mb-3">Về LuxeStay</h5>
            <ul className="space-y-2 text-xs text-slate-400">
              <li><a href="#" className="hover:text-emerald-400 transition-colors">Câu chuyện thương hiệu</a></li>
              <li><a href="#" className="hover:text-emerald-400 transition-colors">Dành cho chủ nhà (Host)</a></li>
              <li><a href="#" className="hover:text-emerald-400 transition-colors">Chính sách bảo mật</a></li>
              <li><a href="#" className="hover:text-emerald-400 transition-colors">Điều khoản dịch vụ</a></li>
              <li><a href="#" className="hover:text-emerald-400 transition-colors">Quy chế hoạt động sàn</a></li>
              <li><a href="#" className="hover:text-emerald-400 transition-colors">Liên hệ báo chí</a></li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© 2026 LuxeStay Inc. Bảo lưu mọi quyền. Thiết kế tinh tế cho trải nghiệm du lịch đỉnh cao.</p>
          <div className="flex items-center gap-4 text-slate-400">
            <span>Tiếng Việt (VN)</span>
            <span>•</span>
            <span>VNĐ (đ)</span>
            <span>•</span>
            <span className="flex items-center gap-1 text-slate-400">
              Made with <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500 inline" /> for Vietnam Travel
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}

