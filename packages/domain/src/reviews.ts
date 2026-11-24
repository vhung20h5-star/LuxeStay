import type { BookingDetails, PropertyReview } from "@luxestay/contracts";
import { parseBookingDateToIso, parseIsoDateParts } from "./availability.js";
import { canAccessReservation } from "./bookingSession.js";

export type ReviewEligibilityResult =
  | { ok: true }
  | {
      ok: false;
      status: 403 | 409;
      code: "FORBIDDEN" | "CONFLICT";
      error: string;
    };

export function hasCheckoutDatePassed(
  checkOutStr: string,
  now: Date = new Date()
): boolean {
  const iso = parseBookingDateToIso(checkOutStr);
  if (!iso) return false;
  const parts = parseIsoDateParts(iso);
  if (!parts) return false;
  // Standard check-out time is 12:00 local time on checkOut date
  const checkOutDate = new Date(parts.year, parts.month - 1, parts.day, 12, 0, 0, 0);
  return now.getTime() >= checkOutDate.getTime();
}

export function evaluateReviewEligibility(
  booking: BookingDetails,
  existingReviewedBookingIds: ReadonlySet<string>,
  credentials: { contact?: string; authenticatedUserId?: string },
  options?: { now?: Date }
): ReviewEligibilityResult {
  if (!canAccessReservation(booking, credentials)) {
    return {
      ok: false,
      status: 403,
      code: "FORBIDDEN",
      error: "Bạn không có quyền gửi đánh giá cho đơn đặt phòng này.",
    };
  }

  const bookingId = booking.bookingId?.trim().toUpperCase();
  if (bookingId && existingReviewedBookingIds.has(bookingId)) {
    return {
      ok: false,
      status: 409,
      code: "CONFLICT",
      error: "Đơn đặt phòng này đã được gửi đánh giá xác thực trước đó.",
    };
  }

  const now = options?.now ?? new Date();
  const isCompleted = booking.status === "completed";
  const isConfirmedPastCheckout =
    booking.status === "confirmed" && hasCheckoutDatePassed(booking.checkOut, now);

  if (!isCompleted && !isConfirmedPastCheckout) {
    return {
      ok: false,
      status: 409,
      code: "CONFLICT",
      error:
        "Chỉ khách đã hoàn tất lưu trú (đơn ở trạng thái hoàn tất hoặc đã qua ngày trả phòng) mới có thể gửi đánh giá xác thực.",
    };
  }

  return { ok: true };
}

/**
 * Recalculates property rating & reviewCount cleanly when adding a new verified review.
 * Preserves historical seeded reviewCount baselines when stored review rows are a sample subset.
 */
export function recalculatePropertyRating(
  previousRating: number,
  previousReviewCount: number,
  existingReviews: readonly Pick<PropertyReview, "rating">[],
  newRating: number
): { rating: number; reviewCount: number } {
  const safeNewRating = Math.min(5, Math.max(1, newRating));
  const safePrevCount = Math.max(0, Math.floor(previousReviewCount));
  const safePrevRating = Math.min(5, Math.max(0, previousRating));

  if (safePrevCount <= existingReviews.length) {
    const allRatings = [...existingReviews.map((r) => r.rating), safeNewRating];
    const sum = allRatings.reduce((acc, r) => acc + r, 0);
    const avg = Math.round((sum / allRatings.length) * 100) / 100;
    return {
      rating: Math.min(5, Math.max(0, avg)),
      reviewCount: allRatings.length,
    };
  }

  const nextCount = safePrevCount + 1;
  const weightedSum = safePrevRating * safePrevCount + safeNewRating;
  const nextRating = Math.round((weightedSum / nextCount) * 100) / 100;
  return {
    rating: Math.min(5, Math.max(0, nextRating)),
    reviewCount: nextCount,
  };
}
