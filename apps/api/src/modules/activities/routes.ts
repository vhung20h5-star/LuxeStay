import { Hono } from "hono";
import {
  API_ENDPOINTS,
  ActivitiesQueryParamsSchema,
  CancelReservationInputSchema,
  ServiceBookingIntentSchema,
  buildApiError,
  buildApiSuccess,
} from "@luxestay/contracts";
import { buildMeta } from "../../middleware/errorHandler.js";
import type { ApiEnvBindings } from "../../types.js";
import type { ActivitiesService } from "./service.js";

export function createActivitiesRoutes(activitiesService: ActivitiesService) {
  const routes = new Hono<ApiEnvBindings>();

  routes.get(API_ENDPOINTS.activities, async (c) => {
    const rawMaxPrice = c.req.query("maxPrice");
    const parsedMaxPrice =
      rawMaxPrice !== undefined && rawMaxPrice.trim() !== "" ? Number(rawMaxPrice) : undefined;

    const parsedQuery = ActivitiesQueryParamsSchema.safeParse({
      city: c.req.query("city") || undefined,
      search: c.req.query("search") || undefined,
      category: c.req.query("category") || undefined,
      period: c.req.query("period") || undefined,
      maxPrice: Number.isFinite(parsedMaxPrice) ? parsedMaxPrice : undefined,
      sortBy: c.req.query("sortBy") || undefined,
    });

    if (!parsedQuery.success) {
      return c.json(
        buildApiError(
          "VALIDATION_ERROR",
          "Tham số lọc dịch vụ không hợp lệ.",
          parsedQuery.error.issues,
          buildMeta(c)
        ),
        400
      );
    }

    const catalog = await activitiesService.listActivities(parsedQuery.data);
    return c.json(buildApiSuccess(catalog, buildMeta(c)), 200);
  });

  // MUST be registered BEFORE /api/v1/activities/:slug
  routes.post(API_ENDPOINTS.activityBookings, async (c) => {
    let rawBody: unknown;
    try {
      rawBody = await c.req.json();
    } catch {
      return c.json(
        buildApiError(
          "INVALID_JSON",
          "Dữ liệu đặt dịch vụ không đúng định dạng JSON.",
          undefined,
          buildMeta(c)
        ),
        400
      );
    }

    const parsed = ServiceBookingIntentSchema.safeParse(rawBody);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      return c.json(
        buildApiError(
          "VALIDATION_ERROR",
          firstIssue?.message ?? "Dữ liệu đặt dịch vụ không hợp lệ.",
          parsed.error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
          buildMeta(c)
        ),
        400
      );
    }

    const result = await activitiesService.createActivityBooking(parsed.data, {
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

  routes.get(API_ENDPOINTS.myActivityBookings, async (c) => {
    const authUser = c.get("authUser");
    if (!authUser) {
      return c.json(
        buildApiError(
          "UNAUTHORIZED",
          "Vui lòng đăng nhập để xem lịch sử đặt trải nghiệm & đưa đón.",
          undefined,
          buildMeta(c)
        ),
        401
      );
    }

    const bookings = await activitiesService.listMyActivityBookings(authUser.id);
    return c.json(buildApiSuccess({ bookings }, buildMeta(c)), 200);
  });

  routes.get("/api/v1/activities/bookings/:bookingId", async (c) => {
    const bookingId = c.req.param("bookingId");
    const contact = c.req.query("contact")?.trim() || undefined;
    const authUser = c.get("authUser");

    if (!authUser && !contact) {
      return c.json(
        buildApiError(
          "VALIDATION_ERROR",
          "Vui lòng đăng nhập hoặc nhập email/số điện thoại để tra cứu đơn dịch vụ.",
          undefined,
          buildMeta(c)
        ),
        400
      );
    }

    const result = await activitiesService.lookupActivityBooking(bookingId, {
      contact,
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

  routes.patch("/api/v1/activities/bookings/:bookingId/cancel", async (c) => {
    const bookingId = c.req.param("bookingId");
    const authUser = c.get("authUser");
    let rawBody: unknown = {};
    try {
      rawBody = await c.req.json();
    } catch {
      rawBody = {};
    }

    const parsed = CancelReservationInputSchema.safeParse(rawBody);
    if (!parsed.success) {
      return c.json(
        buildApiError(
          "VALIDATION_ERROR",
          parsed.error.issues[0]?.message ?? "Dữ liệu hủy đơn dịch vụ không hợp lệ.",
          undefined,
          buildMeta(c)
        ),
        400
      );
    }

    if (!authUser && !parsed.data.contact) {
      return c.json(
        buildApiError(
          "VALIDATION_ERROR",
          "Vui lòng đăng nhập hoặc cung cấp email/số điện thoại để hủy đơn dịch vụ.",
          undefined,
          buildMeta(c)
        ),
        400
      );
    }

    const result = await activitiesService.cancelActivityBooking(bookingId, parsed.data, {
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

  routes.get("/api/v1/activities/:slug", async (c) => {
    const slug = c.req.param("slug");
    const detail = await activitiesService.getActivityDetailBySlug(slug);
    if (!detail) {
      return c.json(
        buildApiError(
          "NOT_FOUND",
          "Không tìm thấy hoạt động hoặc dịch vụ đưa đón theo đường dẫn này.",
          { slug },
          buildMeta(c)
        ),
        404
      );
    }

    return c.json(buildApiSuccess(detail, buildMeta(c)), 200);
  });

  return routes;
}
