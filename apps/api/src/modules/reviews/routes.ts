import { Hono } from "hono";
import {
  CreateReviewInputSchema,
  buildApiError,
  buildApiSuccess,
} from "@luxestay/contracts";
import { buildMeta } from "../../middleware/errorHandler.js";
import type { ApiEnvBindings } from "../../types.js";
import type { ReviewService } from "./service.js";

export function createReviewRoutes(reviewService: ReviewService) {
  const routes = new Hono<ApiEnvBindings>();

  routes.post("/api/v1/properties/:id/reviews", async (c) => {
    const propertyId = c.req.param("id");
    const authUser = c.get("authUser");

    let rawBody: unknown;
    try {
      rawBody = await c.req.json();
    } catch {
      return c.json(
        buildApiError(
          "INVALID_JSON",
          "Dữ liệu gửi đánh giá không đúng định dạng JSON.",
          undefined,
          buildMeta(c)
        ),
        400
      );
    }

    const parsed = CreateReviewInputSchema.safeParse(rawBody);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      return c.json(
        buildApiError(
          "VALIDATION_ERROR",
          firstIssue?.message ?? "Nội dung đánh giá không hợp lệ.",
          parsed.error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
          buildMeta(c)
        ),
        400
      );
    }

    if (!authUser && !parsed.data.contact) {
      return c.json(
        buildApiError(
          "VALIDATION_ERROR",
          "Vui lòng đăng nhập hoặc cung cấp email/số điện thoại đặt phòng để xác thực chủ đơn.",
          undefined,
          buildMeta(c)
        ),
        400
      );
    }

    const result = await reviewService.createVerifiedReview(propertyId, parsed.data, {
      authUser,
    });
    if (!result.ok) {
      return c.json(
        buildApiError(result.code, result.message, undefined, buildMeta(c)),
        result.status
      );
    }

    return c.json(buildApiSuccess(result.result, buildMeta(c)), 201);
  });

  return routes;
}
