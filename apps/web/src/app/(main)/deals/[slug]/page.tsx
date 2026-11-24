import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DealDetailView } from "@/features/promotions/DealDetailView";
import { loadDealBySlug } from "@/shared/ports/dealsPort";

export const dynamic = "force-dynamic";

const getDealBySlug = cache((slug: string) => loadDealBySlug(slug));

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const detail = await getDealBySlug(slug);
  if (!detail) {
    return {
      title: "Không tìm thấy ưu đãi | LuxeStay",
      description:
        "Chương trình ưu đãi bạn đang tìm không tồn tại hoặc đã ngừng áp dụng.",
    };
  }

  const title = `${detail.campaign.title} | Ưu đãi LuxeStay`;
  const description = `${detail.campaign.subtitle} • ${detail.campaign.highlightText} (${detail.campaign.periodLabel}).`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: detail.campaign.image
        ? [{ url: detail.campaign.image, alt: detail.campaign.title }]
        : [],
    },
  };
}

export default async function DealDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const detail = await getDealBySlug(slug);

  if (!detail) {
    notFound();
  }

  const nowIso = new Date().toISOString();
  return <DealDetailView key={detail.campaign.slug} detail={detail} nowIso={nowIso} />;
}
