import type { Metadata } from "next";
import { BookingLookupView } from "@/features/booking/BookingLookupView";

export const metadata: Metadata = {
  title: "Tra cứu & Quản lý Đặt phòng | LuxeStay",
  description:
    "Tra cứu vé điện tử, kiểm tra thông tin kỳ nghỉ hoặc hủy đặt phòng miễn phí trên LuxeStay bằng mã đặt phòng và email/số điện thoại.",
};

export default function BookingsLookupPage() {
  return <BookingLookupView />;
}
