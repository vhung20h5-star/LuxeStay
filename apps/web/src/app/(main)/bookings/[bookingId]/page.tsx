import type { Metadata } from "next";
import { BookingDetailView } from "@/features/booking/BookingDetailView";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}): Promise<Metadata> {
  const { bookingId } = await params;
  const normalized = bookingId.toUpperCase();
  return {
    title: `Đơn đặt phòng ${normalized} | LuxeStay`,
    description: `Xem chi tiết vé điện tử và quản lý đơn đặt phòng ${normalized} tại LuxeStay.`,
  };
}

export default async function BookingDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ bookingId: string }>;
  searchParams: Promise<{ contact?: string | string[] }>;
}) {
  const { bookingId } = await params;
  const query = await searchParams;
  const initialContact = Array.isArray(query.contact)
    ? (query.contact[0] ?? "")
    : (query.contact ?? "");

  return (
    <BookingDetailView
      bookingId={bookingId}
      initialContact={initialContact}
    />
  );
}
