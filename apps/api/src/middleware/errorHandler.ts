import type { Context, ErrorHandler, NotFoundHandler } from "hono";
import { buildApiError, type ApiMeta } from "@luxestay/contracts";
import type { ApiEnvBindings } from "../types.js";

export function buildMeta(c: Context<ApiEnvBindings>): ApiMeta {
  return {
    requestId: c.get("requestId"),
    timestamp: new Date().toISOString(),
  };
}

export const notFoundHandler: NotFoundHandler<ApiEnvBindings> = (c) => {
  return c.json(
    buildApiError("NOT_FOUND", `Không tìm thấy đường dẫn ${c.req.path}.`, undefined, buildMeta(c)),
    404
  );
};

export const errorHandler: ErrorHandler<ApiEnvBindings> = (err, c) => {
  console.error("[luxestay-api] Unhandled error:", err);
  return c.json(
    buildApiError(
      "INTERNAL_ERROR",
      "Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.",
      undefined,
      buildMeta(c)
    ),
    500
  );
};
