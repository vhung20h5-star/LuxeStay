import { randomUUID } from "node:crypto";
import type {
  AuthUser,
  CreateReviewInput,
  CreateReviewResult,
  ErrorCode,
  PropertyReview,
} from "@luxestay/contracts";
import { evaluateReviewEligibility } from "@luxestay/domain";
import type { ApiCatalogRepository } from "../catalog/repository.js";
import type { ApiReservationRepository } from "../reservations/repository.js";
import type { ApiReviewRepository } from "./repository.js";

export type CreateReviewOperationResult =
  | { ok: true; result: CreateReviewResult }
  | { ok: false; code: ErrorCode; message: string; status: 400 | 403 | 404 | 409 };

export interface ReviewService {
  createVerifiedReview(
    propertyId: string,
    input: CreateReviewInput,
    context?: { authUser?: AuthUser | null; now?: Date }
  ): Promise<CreateReviewOperationResult>;
}

const DEFAULT_REVIEWER_AVATAR =
  "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80";

function formatVietnameseReviewDate(date: Date): string {
  return `Tháng ${date.getMonth() + 1}, ${date.getFullYear()}`;
}

export function createReviewService(deps: {
  catalogRepository: ApiCatalogRepository;
  reservationRepository: ApiReservationRepository;
  reviewRepository: ApiReviewRepository;
}): ReviewService {
  return {
    async createVerifiedReview(propertyId, input, context) {
      const normalizedPropertyId = propertyId.trim();
      const property = await deps.catalogRepository.getPropertyById(normalizedPropertyId);
      if (!property) {
        return {
          ok: false,
          code: "NOT_FOUND",
          message: `Không tìm thấy chỗ nghỉ với mã "${normalizedPropertyId}".`,
          status: 404,
        };
      }

      const normalizedBookingId = input.bookingId.trim().toUpperCase();
      const booking = await deps.reservationRepository.findById(normalizedBookingId);
      if (!booking) {
        return {
          ok: false,
          code: "NOT_FOUND",
          message: `Không tìm thấy đơn đặt phòng với mã ${normalizedBookingId}.`,
          status: 404,
        };
      }

      if (booking.property.id !== normalizedPropertyId) {
        return {
          ok: false,
          code: "VALIDATION_ERROR",
          message: "Đơn đặt phòng này không thuộc chỗ nghỉ bạn đang gửi đánh giá.",
          status: 400,
        };
      }

      const alreadyReviewed = await deps.reviewRepository.hasReviewForBooking(normalizedBookingId);
      const reviewedSet = alreadyReviewed ? new Set([normalizedBookingId]) : new Set<string>();
      const authUser = context?.authUser ?? null;
      const now = context?.now ?? new Date();

      const eligibility = evaluateReviewEligibility(
        booking,
        reviewedSet,
        {
          contact: input.contact,
          authenticatedUserId: authUser?.id,
        },
        { now }
      );

      if (!eligibility.ok) {
        return {
          ok: false,
          code: eligibility.code,
          message: eligibility.error,
          status: eligibility.status,
        };
      }

      const newReview: PropertyReview = Object.freeze({
        id: `rev-${randomUUID().replace(/-/g, "").slice(0, 10)}`,
        authorName: authUser?.fullName?.trim() || booking.guestInfo.fullName,
        authorAvatar: authUser?.avatar || DEFAULT_REVIEWER_AVATAR,
        rating: input.rating,
        date: formatVietnameseReviewDate(now),
        comment: input.comment.trim(),
        bookingId: normalizedBookingId,
        ...(authUser?.id || booking.userId ? { userId: authUser?.id ?? booking.userId } : {}),
        isVerified: true,
        createdAt: now.toISOString(),
      });

      const saved = await deps.reviewRepository.createVerifiedReview({
        propertyId: normalizedPropertyId,
        review: newReview,
      });

      if (!saved.ok) {
        return {
          ok: false,
          code: saved.code,
          message: saved.message,
          status: saved.status,
        };
      }

      return {
        ok: true,
        result: {
          review: saved.review,
          propertyRating: saved.rating,
          propertyReviewCount: saved.reviewCount,
        },
      };
    },
  };
}
