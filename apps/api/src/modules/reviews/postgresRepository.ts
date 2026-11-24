import { eq } from "drizzle-orm";
import type { PropertyReview } from "@luxestay/contracts";
import { recalculatePropertyRating } from "@luxestay/domain";
import type { LuxeStayDb } from "../../db/client.js";
import { propertiesTable, reviewsTable } from "../../db/schema/index.js";
import type { ApiReviewRepository, CreateVerifiedReviewRepoResult } from "./repository.js";

function isUniqueViolation(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const candidate = err as { code?: unknown; cause?: { code?: unknown } };
  return candidate.code === "23505" || candidate.cause?.code === "23505";
}

export function createPostgresReviewRepository(db: LuxeStayDb): ApiReviewRepository {
  return {
    async hasReviewForBooking(bookingId: string): Promise<boolean> {
      const normalized = bookingId.trim().toUpperCase();
      if (!normalized) return false;
      const rows = await db
        .select({ id: reviewsTable.id })
        .from(reviewsTable)
        .where(eq(reviewsTable.bookingId, normalized))
        .limit(1);
      return rows.length > 0;
    },

    async createVerifiedReview({ propertyId, review }): Promise<CreateVerifiedReviewRepoResult> {
      const normalizedPropertyId = propertyId.trim();
      const normalizedBookingId = review.bookingId?.trim().toUpperCase();

      try {
        return await db.transaction(async (tx) => {
          // Lock property row so concurrent verified reviews compute accurate rating & review_count
          const propRows = await tx
            .select({
              id: propertiesTable.id,
              rating: propertiesTable.rating,
              reviewCount: propertiesTable.reviewCount,
            })
            .from(propertiesTable)
            .where(eq(propertiesTable.id, normalizedPropertyId))
            .for("update");

          const property = propRows[0];
          if (!property) {
            return {
              ok: false,
              status: 404,
              code: "NOT_FOUND",
              message: `Không tìm thấy chỗ nghỉ với mã "${normalizedPropertyId}".`,
            };
          }

          if (normalizedBookingId) {
            const existingByBooking = await tx
              .select({ id: reviewsTable.id })
              .from(reviewsTable)
              .where(eq(reviewsTable.bookingId, normalizedBookingId))
              .limit(1);

            if (existingByBooking.length > 0) {
              return {
                ok: false,
                status: 409,
                code: "CONFLICT",
                message: "Đơn đặt phòng này đã được gửi đánh giá xác thực trước đó.",
              };
            }
          }

          const existingRatings = await tx
            .select({ rating: reviewsTable.rating })
            .from(reviewsTable)
            .where(eq(reviewsTable.propertyId, normalizedPropertyId));

          const { rating, reviewCount } = recalculatePropertyRating(
            property.rating,
            property.reviewCount,
            existingRatings,
            review.rating
          );

          const createdAt = review.createdAt ? new Date(review.createdAt) : new Date();
          await tx.insert(reviewsTable).values({
            id: review.id,
            propertyId: normalizedPropertyId,
            authorName: review.authorName,
            authorAvatar: review.authorAvatar,
            rating: review.rating,
            date: review.date,
            comment: review.comment,
            bookingId: normalizedBookingId ?? null,
            userId: review.userId ?? null,
            isVerified: true,
            createdAt,
            sortOrder: -1,
          });

          await tx
            .update(propertiesTable)
            .set({ rating, reviewCount })
            .where(eq(propertiesTable.id, normalizedPropertyId));

          const savedReview: PropertyReview = Object.freeze({
            ...review,
            ...(normalizedBookingId ? { bookingId: normalizedBookingId } : {}),
            isVerified: true,
            createdAt: createdAt.toISOString(),
          });

          return {
            ok: true,
            review: savedReview,
            rating,
            reviewCount,
          };
        });
      } catch (err) {
        if (isUniqueViolation(err)) {
          return {
            ok: false,
            status: 409,
            code: "CONFLICT",
            message: "Đơn đặt phòng này đã được gửi đánh giá xác thực trước đó.",
          };
        }
        throw err;
      }
    },
  };
}
