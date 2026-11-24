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

    const result = await reservationService.createReservation(parsed.data, {
      authUser: c.get("authUser"),
    });
    if (!result.ok) {
      return c.json(
        buildApiError(result.code, result.message, undefined, buildMeta(c)),
        result.status
      );
    }

    return c.json(buildApiSuccess(result.booking, buildMeta(c)), 201);
  });

  // MUST be registered BEFORE /api/v1/reservations/:bookingId
  routes.get(API_ENDPOINTS.myReservations, async (c) => {
    const authUser = c.get("authUser");
    if (!authUser) {
      return c.json(
        buildApiError(
          "UNAUTHORIZED",
          "Vui lòng đăng nhập để xem lịch sử đơn đặt phòng của bạn.",
          undefined,
          buildMeta(c)
        ),
        401
      );
    }

    const bookings = await reservationService.listMyReservations(authUser.id);
    return c.json(buildApiSuccess({ bookings }, buildMeta(c)), 200);
  });

  routes.get("/api/v1/reservations/:bookingId/notifications", async (c) => {
    const bookingId = c.req.param("bookingId");
    const contact = c.req.query("contact")?.trim() || undefined;
    const authUser = c.get("authUser");

    if (!authUser && !contact) {
      return c.json(
        buildApiError(
          "VALIDATION_ERROR",
          "Vui lòng đăng nhập hoặc cung cấp email/số điện thoại để xem thông báo đơn.",
          undefined,
          buildMeta(c)
        ),
        400
      );
    }

    const result = await reservationService.listReservationNotifications(bookingId, {
      contact,
      authUser,
    });
    if (!result.ok) {
      return c.json(
        buildApiError(result.code, result.message, undefined, buildMeta(c)),
        result.status
      );
    }

    return c.json(buildApiSuccess({ notifications: result.notifications }, buildMeta(c)), 200);
  });

  routes.get("/api/v1/reservations/:bookingId", async (c) => {
    const bookingIdParam = c.req.param("bookingId");
    const contactQuery = c.req.query("contact") ?? "";
    const authUser = c.get("authUser");

    if (!authUser) {
      const parsed = ReservationLookupInputSchema.safeParse({
        bookingId: bookingIdParam,
        contact: contactQuery,
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
    }

    const result = await reservationService.lookupReservation(bookingIdParam, {
      contact: contactQuery.trim() || undefined,
      authUser,
    });
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
    const authUser = c.get("authUser");
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
    if (!parsed.success || (!authUser && !parsed.data.contact)) {
      const message = !parsed.success
        ? (parsed.error.issues[0]?.message ?? "Thiếu thông tin xác nhận hủy đặt phòng.")
        : "Vui lòng nhập email hoặc số điện thoại để xác nhận chủ đơn.";
      return c.json(buildApiError("VALIDATION_ERROR", message, undefined, buildMeta(c)), 400);
    }

    const result = await reservationService.cancelReservation(bookingId, parsed.data, {
      authUser,
    });
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
