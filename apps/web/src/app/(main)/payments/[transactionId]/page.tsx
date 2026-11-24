import type { Metadata } from "next";
import { PaymentGatewayView } from "@/features/payment/PaymentGatewayView";

export const metadata: Metadata = {
  title: "Cổng thanh toán Sandbox | LuxeStay",
  description: "Hoàn tất thanh toán đặt phòng an toàn qua cổng thanh toán LuxeStay.",
};

export default async function PaymentGatewayPage({
  params,
}: {
  params: Promise<{ transactionId: string }>;
}) {
  const { transactionId } = await params;
  return <PaymentGatewayView transactionId={decodeURIComponent(transactionId)} />;
}
