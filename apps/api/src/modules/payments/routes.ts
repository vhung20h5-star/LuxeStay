import { Hono } from "hono";
import {
  PaymentProviderSchema,
  PaymentSimulateInputSchema,
  buildApiError,
  buildApiSuccess,
} from "@luxestay/contracts";
import { buildMeta } from "../../middleware/errorHandler.js";
import type { ApiEnvBindings } from "../../types.js";
import type { PaymentService } from "./service.js";
import { WEBHOOK_SIGNATURE_HEADER } from "./signature.js";

export function createPaymentRoutes(paymentService: PaymentService) {
  const routes = new Hono<ApiEnvBindings>();

  routes.get("/api/v1/payments/:transactionId", async (c) => {
    const result = await paymentService.getGatewaySession(c.req.param("transactionId"));
    if (!result.ok) {
      return c.json(
        buildApiError(result.code, result.message, undefined, buildMeta(c)),
        result.status
      );
    }
    return c.json(buildApiSuccess(result.data, buildMeta(c)), 200);
  });

  routes.post("/api/v1/payments/:transactionId/simulate", async (c) => {
    let rawBody: unknown;
    try {
      rawBody = await c.req.json();
    } catch {
      return c.json(
        buildApiError("INVALID_JSON", "Dữ liệu mô phỏng thanh toán không hợp lệ.", undefined, buildMeta(c)),
        400
      );
    }

    const parsed = PaymentSimulateInputSchema.safeParse(rawBody);
    if (!parsed.success) {
      return c.json(
        buildApiError(
          "VALIDATION_ERROR",
          parsed.error.issues[0]?.message ?? "Trạng thái mô phỏng thanh toán không hợp lệ.",
          undefined,
          buildMeta(c)
        ),
        400
      );
    }

    const result = await paymentService.simulateSandboxOutcome(
      c.req.param("transactionId"),
      parsed.data
    );
    if (!result.ok) {
      return c.json(
        buildApiError(result.code, result.message, undefined, buildMeta(c)),
        result.status
      );
    }
    return c.json(buildApiSuccess(result.data, buildMeta(c)), 200);
  });

  routes.post("/api/v1/payments/webhook/:provider", async (c) => {
    const providerParsed = PaymentProviderSchema.safeParse(
      c.req.param("provider").trim().toLowerCase()
    );
    if (!providerParsed.success) {
      return c.json(
        buildApiError("VALIDATION_ERROR", "Cổng thanh toán không được hỗ trợ.", undefined, buildMeta(c)),
        400
      );
    }

    const rawBody = await c.req.text();
    const signature = c.req.header(WEBHOOK_SIGNATURE_HEADER);
    const result = await paymentService.processWebhook(providerParsed.data, rawBody, signature);
    if (!result.ok) {
      return c.json(
        buildApiError(result.code, result.message, undefined, buildMeta(c)),
        result.status
      );
    }

    return c.json(buildApiSuccess(result.data, buildMeta(c)), 200);
  });

  return routes;
}
