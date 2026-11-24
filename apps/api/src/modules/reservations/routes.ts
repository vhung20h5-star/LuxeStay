import { Hono } from "hono";
import {
  API_ENDPOINTS,
  CancelReservationInputSchema,
  ReservationLookupInputSchema,
  ServerReservationIntentSchema,
  buildApiError,
  buildApiSuccess,
} from "@luxestay/contracts";
import { buildMeta } from "../../middleware/errorHandler.js";
import type { ApiEnvBindings } from "../../types.js";
import type { ReservationService } from "./service.js";

export function createReservationRoutes(reservationService: ReservationService) {
  const routes = new Hono<ApiEnvBindings>();

  routes.post(API_ENDPOINTS.reservations, async (c) => {
    let rawBody: unknown;
    try {
      rawBody = await c.req.json();
    } catch {
      return c.json(
        buildApiError(
          "INVALID_JSON",
          "Dữ liệu yêu cầu đặt phòng không đúng định dạng JSON.",
          undefined,
          buildMeta(c)
        ),
        400
      );
    }

    const parsed = ServerReservationIntentSchema.safeParse(rawBody);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      return c.json(
        buildApiError(
          "VALIDATION_ERROR",
          firstIssue?.message ?? "Dữ liệu đặt phòng không hợp lệ.",
          parsed.error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
          buildMeta(c)
        ),
        400
      );
    }

    const result = await reservationService.createReservation(parsed.data);
    if (!result.ok) {
      return c.json(
        buildApiError(result.code, result.message, undefined, buildMeta(c)),
        result.status
      );
    }

    return c.json(buildApiSuccess(result.booking, buildMeta(c)), 201);
  });

  routes.get("/api/v1/reservations/:bookingId", async (c) => {
    const parsed = ReservationLookupInputSchema.safeParse({
      bookingId: c.req.param("bookingId"),
      contact: c.req.query("contact") ?? "",
    });

    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      return c.json(
        buildApiError(
          "VALIDATION_ERROR",
          firstIssue?.message ?? "Thiếu mã đặt phòng hoặc thông tin liên hệ.",
          parsed.error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
          buildMeta(c)
        ),
        400
      );
    }

    const result = await reservationService.lookupReservation(
      parsed.data.bookingId,
      parsed.data.contact
    );
    if (!result.ok) {
      return c.json(
        buildApiError(result.code, result.message, undefined, buildMeta(c)),
        result.status
      );
    }

    return c.json(buildApiSuccess(result.booking, buildMeta(c)), 200);
  });

  routes.patch("/api/v1/reservations/:bookingId/cancel", async (c) => {
    const bookingId = c.req.param("bookingId");
    let rawBody: unknown;
    try {
      rawBody = await c.req.json();
    } catch {
      return c.json(
        buildApiError(
          "INVALID_JSON",
          "Dữ liệu yêu cầu hủy phòng không đúng định dạng JSON.",
          undefined,
          buildMeta(c)
        ),
        400
      );
    }

    const parsed = CancelReservationInputSchema.safeParse(rawBody);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      return c.json(
        buildApiError(
          "VALIDATION_ERROR",
          firstIssue?.message ?? "Thiếu thông tin xác nhận hủy đặt phòng.",
          parsed.error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
          buildMeta(c)
        ),
        400
      );
    }

    const result = await reservationService.cancelReservation(bookingId, parsed.data);
    if (!result.ok) {
      return c.json(
        buildApiError(result.code, result.message, undefined, buildMeta(c)),
        result.status
      );
    }

    return c.json(buildApiSuccess(result.booking, buildMeta(c)), 200);
  });

  return routes;
}
