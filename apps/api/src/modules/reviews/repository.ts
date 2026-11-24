import type { PropertyReview } from "@luxestay/contracts";
import { recalculatePropertyRating } from "@luxestay/domain";
import type { ApiCatalogRepository, InMemoryCatalogRepository } from "../catalog/repository.js";

export type CreateVerifiedReviewRepoResult =
  | {
      ok: true;
      review: PropertyReview;
      rating: number;
      reviewCount: number;
    }
  | {
      ok: false;
      status: 404 | 409;
      code: "NOT_FOUND" | "CONFLICT";
      message: string;
    };

export interface ApiReviewRepository {
  hasReviewForBooking(bookingId: string): Promise<boolean>;
  createVerifiedReview(params: {
    propertyId: string;
    review: PropertyReview;
  }): Promise<CreateVerifiedReviewRepoResult>;
}

function isInMemoryCatalog(repo: ApiCatalogRepository): repo is InMemoryCatalogRepository {
  return typeof (repo as Partial<InMemoryCatalogRepository>).applyVerifiedReview === "function";
}

export function createInMemoryReviewRepository(deps: {
  catalogRepository: ApiCatalogRepository;
}): ApiReviewRepository {
  const reviewedBookingIds = new Set<string>();
  const propertyLocks = new Map<string, Promise<void>>();

  async function withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const prev = propertyLocks.get(key) ?? Promise.resolve();
    let release!: () => void;
    const next = new Promise<void>((resolve) => {
      release = resolve;
    });
    const chained = prev.then(() => next);
    propertyLocks.set(key, chained);
    await prev;
    try {
      return await fn();
    } finally {
      release();
      if (propertyLocks.get(key) === chained) {
        propertyLocks.delete(key);
      }
    }
  }

  return {
    async hasReviewForBooking(bookingId: string) {
      return reviewedBookingIds.has(bookingId.trim().toUpperCase());
    },

    async createVerifiedReview({ propertyId, review }) {
      return withLock(propertyId.trim(), async () => {
        const bookingId = review.bookingId?.trim().toUpperCase();
        if (bookingId && reviewedBookingIds.has(bookingId)) {
          return {
            ok: false,
            status: 409,
            code: "CONFLICT",
            message: "Đơn đặt phòng này đã được gửi đánh giá xác thực trước đó.",
          };
        }

        const property = await deps.catalogRepository.getPropertyById(propertyId);
        if (!property) {
          return {
            ok: false,
            status: 404,
            code: "NOT_FOUND",
            message: `Không tìm thấy chỗ nghỉ với mã "${propertyId}".`,
          };
        }

        const { rating, reviewCount } = recalculatePropertyRating(
          property.rating,
          property.reviewCount,
          property.reviews,
          review.rating
        );

        const frozenReview: PropertyReview = Object.freeze({
          ...review,
          ...(bookingId ? { bookingId } : {}),
          isVerified: true,
        });

        if (bookingId) {
          reviewedBookingIds.add(bookingId);
        }

        if (isInMemoryCatalog(deps.catalogRepository)) {
          deps.catalogRepository.applyVerifiedReview(
            property.id,
            frozenReview,
            rating,
            reviewCount
          );
        }

        return {
          ok: true,
          review: frozenReview,
          rating,
          reviewCount,
        };
      });
    },
  };
}
