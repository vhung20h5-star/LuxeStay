import {
  API_ENDPOINTS,
  ApiErrorResponseSchema,
  PaymentGatewaySessionSchema,
  PaymentWebhookResultSchema,
  VoucherValidationResultSchema,
  createApiSuccessSchema,
  type PromotionVoucher,
} from "@luxestay/contracts";
import { evaluatePromotionVoucher } from "@luxestay/domain";
import { z } from "zod";
import { HttpApiError, isAbortError } from "./errors";
import type { PaymentGatewayPort } from "./types";

const GatewaySessionSuccessSchema = createApiSuccessSchema(PaymentGatewaySessionSchema);
const WebhookResultSuccessSchema = createApiSuccessSchema(PaymentWebhookResultSchema);
const VoucherValidationSuccessSchema = createApiSuccessSchema(VoucherValidationResultSchema);

async function parseResponse<T extends z.ZodTypeAny>(
  response: Response,
  schema: T,
  fallbackMessage: string
): Promise<z.infer<T>> {
  let rawBody: unknown;
  try {
    rawBody = await response.json();
  } catch {
    throw new HttpApiError({
      status: response.status,
      code: "CONTRACT_MISMATCH",
      message: fallbackMessage,
      requestId: response.headers.get("x-request-id") ?? undefined,
    });
  }

  if (!response.ok) {
    const parsedErr = ApiErrorResponseSchema.safeParse(rawBody);
    if (parsedErr.success) {
      throw new HttpApiError({
        status: response.status,
        code: parsedErr.data.error.code,
        message: parsedErr.data.error.message,
        details: parsedErr.data.error.details,
        requestId:
          parsedErr.data.meta?.requestId ?? response.headers.get("x-request-id") ?? undefined,
      });
    }
    throw new HttpApiError({
      status: response.status,
      code: "INTERNAL_ERROR",
      message: fallbackMessage,
      requestId: response.headers.get("x-request-id") ?? undefined,
    });
  }

  const parsed = schema.safeParse(rawBody);
  if (!parsed.success) {
    throw new HttpApiError({
      status: response.status,
      code: "CONTRACT_MISMATCH",
      message: "Phản hồi thanh toán từ máy chủ không khớp hợp đồng @luxestay/contracts.",
      details: parsed.error.issues,
      requestId: response.headers.get("x-request-id") ?? undefined,
    });
  }

  return parsed.data;
}

export function createHttpPaymentGatewayPort(options?: {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
}): PaymentGatewayPort {
  const baseUrl = (options?.baseUrl ?? "http://localhost:4000").replace(/\/+$/, "");

  async function callApi<T extends z.ZodTypeAny>(
    path: string,
    init: RequestInit,
    schema: T,
    fallbackMessage: string
  ): Promise<z.infer<T>> {
    const fetchFn = options?.fetchImpl ?? (typeof fetch !== "undefined" ? fetch : undefined);
    if (!fetchFn) {
      throw new HttpApiError({
        status: 0,
        code: "NETWORK_ERROR",
        message: "Fetch API không khả dụng trong môi trường hiện tại.",
      });
    }

    let response: Response;
    try {
      response = await fetchFn(`${baseUrl}${path}`, {
        ...init,
        credentials: "include",
        headers: {
          Accept: "application/json",
          ...(init.body ? { "Content-Type": "application/json" } : {}),
          ...init.headers,
        },
      });
    } catch (err) {
      if (isAbortError(err)) throw err;
      throw new HttpApiError({
        status: 0,
        code: "NETWORK_ERROR",
        message: "Không thể kết nối máy chủ thanh toán LuxeStay.",
        details: err instanceof Error ? err.message : undefined,
      });
    }

    return parseResponse(response, schema, fallbackMessage);
  }

  return {
    async getGatewaySession(transactionId, callOptions) {
      const res = await callApi(
        API_ENDPOINTS.paymentById(transactionId),
        { method: "GET", cache: "no-store", signal: callOptions?.signal },
        GatewaySessionSuccessSchema,
        "Không thể tải phiên cổng thanh toán."
      );
      return res.data;
    },

    async simulateOutcome(transactionId, input, callOptions) {
      const res = await callApi(
        API_ENDPOINTS.paymentSimulate(transactionId),
        { method: "POST", body: JSON.stringify(input), signal: callOptions?.signal },
        WebhookResultSuccessSchema,
        "Không thể mô phỏng kết quả thanh toán."
      );
      return res.data;
    },

    async validateVoucher(input, callOptions) {
      const res = await callApi(
        API_ENDPOINTS.validateVoucher,
        { method: "POST", body: JSON.stringify(input), signal: callOptions?.signal },
        VoucherValidationSuccessSchema,
        "Không thể kiểm tra mã giảm giá."
      );
      return res.data;
    },
  };
}

export function createMockPaymentGatewayPort(options?: {
  vouchers?: readonly PromotionVoucher[];
}): PaymentGatewayPort {
  return {
    async getGatewaySession(transactionId) {
      throw new HttpApiError({
        status: 404,
        code: "NOT_FOUND",
        message: `Cổng thanh toán Sandbox (${transactionId}) chỉ khả dụng ở chế độ API.`,
      });
    },
    async simulateOutcome() {
      throw new HttpApiError({
        status: 403,
        code: "FORBIDDEN",
        message: "Cổng thanh toán Sandbox chỉ khả dụng ở chế độ API.",
      });
    },
    async validateVoucher(input) {
      const evaluated = evaluatePromotionVoucher(
        input.code,
        input.subtotal,
        options?.vouchers ?? []
      );
      if (!evaluated.ok) {
        return {
          valid: false,
          code: evaluated.code,
          discount: 0,
          message: evaluated.message,
        };
      }
      return {
        valid: true,
        code: evaluated.code,
        discount: evaluated.discount,
        message: evaluated.message,
        voucher: evaluated.voucher,
      };
    },
  };
}
