import type { Metadata } from "next";
import { ActivitiesHubView } from "@/features/activities/ActivitiesHubView";
import { loadActivitiesCatalog } from "@/shared/ports/activitiesPort";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Trải nghiệm, Tour & Đưa đón Sân bay | LuxeStay",
  description:
    "Khám phá dịch vụ xe riêng đưa đón sân bay, tour bản địa tuyển chọn và trải nghiệm văn hóa ẩm thực trên toàn Việt Nam cùng LuxeStay.",
};

export default async function ActivitiesPage() {
  const catalog = await loadActivitiesCatalog();
  return <ActivitiesHubView initialCatalog={catalog} />;
}
