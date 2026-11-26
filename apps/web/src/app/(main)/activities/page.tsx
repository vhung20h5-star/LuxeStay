import type { Metadata } from "next";
import { parseActivitiesQueryFromSearchParams } from "@luxestay/domain";
import { ActivitiesHubView } from "@/features/activities/ActivitiesHubView";
import { loadActivitiesCatalog } from "@/shared/ports/activitiesPort";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Hoạt động & Vui chơi Nổi tiếng Việt Nam | LuxeStay",
  description:
    "Khám phá điểm tham quan biểu tượng (Bà Nà Hills, VinWonders, Fansipan, Đại Nội Huế), tour bản địa, show diễn và tiện ích du lịch (xe sân bay, eSIM 4G, Fast-Track) trên toàn Việt Nam.",
};

export default async function ActivitiesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [catalog, resolvedSearchParams] = await Promise.all([
    loadActivitiesCatalog(),
    searchParams,
  ]);
  const initialQuery = parseActivitiesQueryFromSearchParams(resolvedSearchParams);

  return <ActivitiesHubView initialCatalog={catalog} initialQuery={initialQuery} />;
}
