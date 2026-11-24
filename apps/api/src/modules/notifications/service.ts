import type { BookingDetails, NotificationLog, NotificationType } from "@luxestay/contracts";
import { formatVND } from "@luxestay/domain";
import { generateId } from "../auth/crypto.js";
import type { ApiNotificationRepository } from "./repository.js";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildBookingEmailContent(
  booking: BookingDetails,
  type: NotificationType
): { subject: string; previewText: string; htmlBody: string } {
  const code = booking.bookingId ?? "LX-PENDING";
  const title = escapeHtml(booking.property.title);
  const guest = escapeHtml(booking.guestInfo.fullName);
  const totalText = formatVND(booking.pricing.total);
  const promoLine = booking.pricing.appliedPromoCode
    ? `<p style="margin:4px 0;color:#047857;">Mã ưu đãi áp dụng: <strong>${escapeHtml(booking.pricing.appliedPromoCode)}</strong> (-${formatVND(booking.pricing.discount)})</p>`
    : "";

  if (type === "booking_confirmed") {
    return {
      subject: `[LuxeStay] Xác nhận vé điện tử ${code} — ${booking.property.title}`,
      previewText: `Đặt phòng thành công tại ${booking.property.title} (${booking.checkIn} - ${booking.checkOut}). Tổng thanh toán: ${totalText}.`,
      htmlBody: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px;border:1px solid #e2e8f0;border-radius:16px;">
          <h2 style="color:#047857;margin-top:0;">Xác nhận đặt phòng thành công!</h2>
          <p>Xin chào <strong>${guest}</strong>,</p>
          <p>Vé điện tử của bạn tại <strong>${title}</strong> đã được xác nhận.</p>
          <div style="background:#f8fafc;padding:16px;border-radius:12px;margin:16px 0;">
            <p style="margin:4px 0;">Mã đặt phòng: <strong>${escapeHtml(code)}</strong></p>
            <p style="margin:4px 0;">Nhận phòng: <strong>14:00 • ${escapeHtml(booking.checkIn)}</strong></p>
            <p style="margin:4px 0;">Trả phòng: <strong>12:00 • ${escapeHtml(booking.checkOut)}</strong> (${booking.nights} đêm)</p>
            ${promoLine}
            <p style="margin:8px 0 0;font-size:16px;">Tổng thanh toán: <strong style="color:#047857;">${totalText}</strong></p>
          </div>
          <p style="font-size:12px;color:#64748b;">Chủ nhà ${escapeHtml(booking.property.host.name)} sẽ liên hệ hướng dẫn nhận phòng qua SĐT ${escapeHtml(booking.guestInfo.phone)}.</p>
        </div>
      `.trim(),
    };
  }

  if (type === "booking_cancelled") {
    const reasonHtml = booking.cancellationReason
      ? `<p style="margin:4px 0;">Lý do hủy: ${escapeHtml(booking.cancellationReason)}</p>`
      : "";
    return {
      subject: `[LuxeStay] Xác nhận hủy đặt phòng ${code}`,
      previewText: `Đơn đặt phòng ${code} tại ${booking.property.title} đã được hủy thành công.`,
      htmlBody: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px;border:1px solid #fecdd3;border-radius:16px;">
          <h2 style="color:#be123c;margin-top:0;">Đơn đặt phòng đã được hủy</h2>
          <p>Xin chào <strong>${guest}</strong>,</p>
          <p>Đơn đặt phòng <strong>${escapeHtml(code)}</strong> tại <strong>${title}</strong> đã chuyển sang trạng thái đã hủy.</p>
          ${reasonHtml}
          <p style="font-size:12px;color:#64748b;">Nếu có khoản thanh toán trực tuyến đã hoàn tất, LuxeStay sẽ xử lý hoàn tiền trong 3–5 ngày làm việc.</p>
        </div>
      `.trim(),
    };
  }

  return {
    subject: `[LuxeStay] Thanh toán chưa hoàn tất cho đơn ${code}`,
    previewText: `Giao dịch thanh toán cho đơn ${code} không thành công. Bạn có thể đặt lại phòng bất cứ lúc nào.`,
    htmlBody: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px;border:1px solid #fde68a;border-radius:16px;">
        <h2 style="color:#b45309;margin-top:0;">Thanh toán chưa hoàn tất</h2>
        <p>Xin chào <strong>${guest}</strong>,</p>
        <p>Giao dịch thanh toán cho đơn <strong>${escapeHtml(code)}</strong> tại <strong>${title}</strong> đã thất bại hoặc hết hạn.</p>
      </div>
    `.trim(),
  };
}

export interface NotificationService {
  sendBookingNotification(
    booking: BookingDetails,
    type: NotificationType
  ): Promise<NotificationLog>;
  listForBooking(bookingId: string): Promise<readonly NotificationLog[]>;
}

export function createNotificationService(deps: {
  notificationRepository: ApiNotificationRepository;
  webhookUrl?: string;
}): NotificationService {
  return {
    async sendBookingNotification(booking, type) {
      const bookingId = booking.bookingId?.trim().toUpperCase();
      if (!bookingId) {
        throw new Error("Cannot send notification without bookingId.");
      }

      const content = buildBookingEmailContent(booking, type);
      let status: "sent" | "logged" = "logged";

      if (deps.webhookUrl) {
        try {
          const res = await fetch(deps.webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              to: booking.guestInfo.email,
              subject: content.subject,
              html: content.htmlBody,
              bookingId,
              type,
            }),
          });
          if (res.ok) status = "sent";
        } catch {
          status = "logged";
        }
      }

      const log: NotificationLog = {
        id: generateId("NTF"),
        bookingId,
        recipientEmail: booking.guestInfo.email,
        channel: "email",
        type,
        subject: content.subject,
        previewText: content.previewText,
        htmlBody: content.htmlBody,
        status,
        createdAt: new Date().toISOString(),
      };

      return deps.notificationRepository.save(log);
    },

    async listForBooking(bookingId) {
      return deps.notificationRepository.listByBookingId(bookingId);
    },
  };
}
