import { Hono } from "hono";
import {
  API_ENDPOINTS,
  ValidateVoucherInputSchema,
  buildApiError,
  buildApiSuccess,
} from "@luxestay/contracts";
import { evaluatePromotionVoucher } from "@luxestay/domain";
import { buildMeta } from "../../middleware/errorHandler.js";
import type { ApiEnvBindings } from "../../types.js";
import type { CatalogService } from "./service.js";

export function createCatalogRoutes(catalogService: CatalogService) {
  const routes = new Hono<ApiEnvBindings>();

  routes.get(API_ENDPOINTS.catalog, async (c) => {
    const snapshot = await catalogService.getCatalogSnapshot();
    return c.json(buildApiSuccess(snapshot, buildMeta(c)), 200);
  });

  routes.get("/api/v1/properties/:id", async (c) => {
    const id = c.req.param("id");
    const property = await catalogService.getPropertyById(id);
    if (!property) {
      return c.json(
        buildApiError(
          "NOT_FOUND",
          "Không tìm thấy chỗ nghỉ theo mã yêu cầu.",
          { propertyId: id },
          buildMeta(c)
        ),
        404
      );
    }

    return c.json(buildApiSuccess(property, buildMeta(c)), 200);
  });

  routes.post(API_ENDPOINTS.validateVoucher, async (c) => {
    let rawBody: unknown;
    try {
      rawBody = await c.req.json();
    } catch {
      return c.json(
        buildApiError("INVALID_JSON", "Dữ liệu kiểm tra mã giảm giá không hợp lệ.", undefined, buildMeta(c)),
        400
      );
    }

    const parsed = ValidateVoucherInputSchema.safeParse(rawBody);
    if (!parsed.success) {
      return c.json(
        buildApiError(
          "VALIDATION_ERROR",
          parsed.error.issues[0]?.message ?? "Mã giảm giá hoặc tổng tiền không hợp lệ.",
          undefined,
          buildMeta(c)
        ),
        400
      );
    }

    const snapshot = await catalogService.getCatalogSnapshot();
    const evaluation = evaluatePromotionVoucher(
      parsed.data.code,
      parsed.data.subtotal,
      snapshot.promotions.vouchers,
      { isAuthenticated: Boolean(c.get("authUser")) }
    );

    if (!evaluation.ok) {
      return c.json(
        buildApiSuccess(
          {
            valid: false,
            code: evaluation.code,
            discount: 0,
            message: evaluation.message,
          },
          buildMeta(c)
        ),
        200
      );
    }

    return c.json(
      buildApiSuccess(
        {
          valid: true,
          code: evaluation.code,
          discount: evaluation.discount,
          message: evaluation.message,
          voucher: evaluation.voucher,
        },
        buildMeta(c)
      ),
      200
    );
  });

  return routes;
}
