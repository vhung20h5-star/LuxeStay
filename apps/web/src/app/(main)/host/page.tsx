import type { Metadata } from "next";
import { HostPortalView } from "@/features/host/HostPortalView";
import { getServerWebEnv } from "@/shared/config/env";

export const metadata: Metadata = {
  title: "Cổng Chủ nhà & Quản trị | LuxeStay",
  description:
    "Quản lý danh sách chỗ nghỉ, khóa ngày & giá đặc biệt, đơn đặt phòng khách và báo cáo doanh thu trên LuxeStay.",
};

export default function HostPortalPage() {
  const env = getServerWebEnv();
  return <HostPortalView dataMode={env.dataMode} apiBaseUrl={env.publicApiBaseUrl} />;
}
