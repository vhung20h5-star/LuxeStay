import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { formatVND } from "@luxestay/domain";
import { StayDetailView } from "@/features/property/StayDetailView";
import { loadPropertyById } from "@/shared/ports/catalogPort";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const property = await loadPropertyById(id);
  if (!property) {
    return {
      title: "Không tìm thấy chỗ nghỉ | LuxeStay",
      description: "Chỗ nghỉ bạn đang tìm không tồn tại hoặc đã ngừng nhận đặt phòng.",
    };
  }

  const title = `${property.title} — ${property.location.city} | LuxeStay`;
  const description = `${property.subtitle} • Từ ${formatVND(property.pricePerNight)}/đêm • ★ ${property.rating} (${property.reviewCount} đánh giá).`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: property.images[0] ? [{ url: property.images[0], alt: property.title }] : [],
    },
  };
}

export default async function StayDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const property = await loadPropertyById(id);

  if (!property) {
    notFound();
  }

  return <StayDetailView property={property} />;
}
