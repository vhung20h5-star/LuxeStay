import type { TestimonialItem } from "@luxestay/contracts";

export const TESTIMONIALS: readonly TestimonialItem[] = Object.freeze([
  {
    id: "t-1",
    name: "Nguyễn Hoàng Nam",
    role: "Du khách từ Hà Nội",
    avatar:
      "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80",
    rating: 5,
    stayName: "Mây Lang Thang Wooden Villa (Đà Lạt)",
    content:
      "Mình đặt phòng qua LuxeStay rất mượt, giao diện đẹp và thông tin minh bạch. Căn homestay gỗ ở Đà Lạt sáng sớm săn mây đẹp nghẹt thở, chủ nhà còn chuẩn bị sẵn trà nóng đón tiếp cực kỳ ấm cúng!",
    tripType: "Chuyến đi nghỉ dưỡng 3 ngày 2 đêm",
  },
  {
    id: "t-2",
    name: "Trần Mai Anh",
    role: "Du khách từ TP. Hồ Chí Minh",
    avatar:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80",
    rating: 5,
    stayName: "The Coral Luxury Villa (Phú Quốc)",
    content:
      "Hồ bơi vô cực view biển ngắm hoàng hôn đỉnh nhất mình từng trải nghiệm. Đặt phòng trên app có bảo hiểm và hỗ trợ hủy miễn phí nên gia đình mình rất yên tâm. Chắc chắn sẽ tiếp tục ủng hộ!",
    tripType: "Kỳ nghỉ gia đình 4 người",
  },
  {
    id: "t-3",
    name: "Lê Minh Trí",
    role: "Travel Blogger",
    avatar:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80",
    rating: 5,
    stayName: "Aira Panorama Mountain Retreat (Sa Pa)",
    content:
      "Dịch vụ 5 sao chuẩn mực. Phòng tắm có bồn ngâm thảo mộc người Dao, ban công mở ra trọn thung lũng Mường Hoa. Trải nghiệm thanh toán qua MoMo & VNPAY cực nhanh chóng trong 30 giây.",
    tripType: "Chuyến du lịch cặp đôi",
  },
]);
