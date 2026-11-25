import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ActivityDetailView } from "@/features/activities/ActivityDetailView";
import { loadActivityBySlug } from "@/shared/ports/activitiesPort";

export const dynamic = "force-dynamic";

const getActivityDetail = cache((slug: string) => loadActivityBySlug(slug));

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const detail = await getActivityDetail(slug);
  if (!detail) {
    return {
      title: "Không tìm thấy dịch vụ | LuxeStay",
      description: "Hoạt động hoặc dịch vụ đưa đón bạn tìm kiếm không tồn tại.",
    };
  }

  return {
    title: `${detail.activity.title} | LuxeStay`,
    description: detail.activity.subtitle,
  };
}

export default async function ActivityDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const detail = await getActivityDetail(slug);
  if (!detail) {
    notFound();
  }

  return <ActivityDetailView key={detail.activity.slug} detail={detail} />;
}
