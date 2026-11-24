import type { Metadata } from "next";
import { DealsCenterView } from "@/features/promotions/DealsCenterView";
import { loadDealsHub } from "@/shared/ports/dealsPort";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Ưu đãi & Mã giảm giá | LuxeStay",
  description:
    "Khám phá kho mã giảm giá, deal bạn mới và các chiến dịch ưu đãi nghỉ dưỡng độc quyền trên LuxeStay.",
};

export default async function DealsPage() {
  const dealsHub = await loadDealsHub();
  return <DealsCenterView initialDeals={dealsHub} />;
}
