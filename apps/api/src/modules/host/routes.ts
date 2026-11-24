import { Hono, type Context } from "hono";
import {
  API_ENDPOINTS,
  CreateHostPropertyInputSchema,
  ReservationStatusSchema,
  UpdateHostPropertyInputSchema,
  UpsertHostAvailabilityInputSchema,
  buildApiError,
  buildApiSuccess,
  type AuthUser,
} from "@luxestay/contracts";
import { isHostOrAdmin } from "@luxestay/domain";
import { buildMeta } from "../../middleware/errorHandler.js";
import type { ApiEnvBindings } from "../../types.js";
import type { HostService } from "./service.js";

function requireHostOrAdmin(
  c: Context<ApiEnvBindings>
): { ok: true; actor: AuthUser } | { ok: false; response: Response } {
  const actor = c.get("authUser");
  if (!actor) {
    return {
      ok: false,
      response: c.json(
        buildApiError(
          "UNAUTHORIZED",
          "Vui lòng đăng nhập để truy cập Cổng Chủ nhà & Quản trị.",
          undefined,
          buildMeta(c)
        ),
        401
      ),
    };
  }

  if (!isHostOrAdmin(actor.role)) {
    return {
      ok: false,
      response: c.json(
        buildApiError(
          "FORBIDDEN",
          "Tài khoản của bạn không có quyền Chủ nhà (Host) hoặc Quản trị viên (Admin).",
          undefined,
          buildMeta(c)
        ),
        403
      ),
    };
  }

  return { ok: true, actor };
}

export function createHostRoutes(hostService: HostService) {
  const routes = new Hono<ApiEnvBindings>();

  routes.get(API_ENDPOINTS.hostProperties, async (c) => {
    const guard = requireHostOrAdmin(c);
    if (!guard.ok) return guard.response;

    const properties = await hostService.listProperties(guard.actor);
    return c.json(buildApiSuccess({ properties }, buildMeta(c)), 200);
  });

  routes.post(API_ENDPOINTS.hostProperties, async (c) => {
    const guard = requireHostOrAdmin(c);
    if (!guard.ok) return guard.response;

    let rawBody: unknown;
    try {
      rawBody = await c.req.json();
    } catch {
      return c.json(
        buildApiError(
          "INVALID_JSON",
          "Dữ liệu tạo chỗ nghỉ không đúng định dạng JSON.",
          undefined,
          buildMeta(c)
        ),
        400
      );
    }

    const parsed = CreateHostPropertyInputSchema.safeParse(rawBody);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      return c.json(
        buildApiError(
          "VALIDATION_ERROR",
          firstIssue?.message ?? "Dữ liệu chỗ nghỉ không hợp lệ.",
          parsed.error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
          buildMeta(c)
        ),
        400
      );
    }

    const result = await hostService.createProperty(guard.actor, parsed.data);
    if (!result.ok) {
      return c.json(
        buildApiError(result.code, result.message, undefined, buildMeta(c)),
        result.status
      );
    }

    return c.json(buildApiSuccess(result.data, buildMeta(c)), 201);
  });

  routes.patch("/api/v1/host/properties/:id", async (c) => {
    const guard = requireHostOrAdmin(c);
    if (!guard.ok) return guard.response;

    let rawBody: unknown;
    try {
      rawBody = await c.req.json();
    } catch {
      return c.json(
        buildApiError(
          "INVALID_JSON",
          "Dữ liệu cập nhật chỗ nghỉ không đúng định dạng JSON.",
          undefined,
          buildMeta(c)
        ),
        400
      );
    }

    const parsed = UpdateHostPropertyInputSchema.safeParse(rawBody);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      return c.json(
        buildApiError(
          "VALIDATION_ERROR",
          firstIssue?.message ?? "Dữ liệu cập nhật chỗ nghỉ không hợp lệ.",
          parsed.error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
          buildMeta(c)
        ),
        400
      );
    }

    const result = await hostService.updateProperty(
      guard.actor,
      c.req.param("id"),
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

  routes.delete("/api/v1/host/properties/:id", async (c) => {
    const guard = requireHostOrAdmin(c);
    if (!guard.ok) return guard.response;

    const result = await hostService.deleteProperty(guard.actor, c.req.param("id"));
    if (!result.ok) {
      return c.json(
        buildApiError(result.code, result.message, undefined, buildMeta(c)),
        result.status
      );
    }

    return c.json(buildApiSuccess(result.data, buildMeta(c)), 200);
  });

  routes.put("/api/v1/host/properties/:id/availability", async (c) => {
    const guard = requireHostOrAdmin(c);
    if (!guard.ok) return guard.response;

    let rawBody: unknown;
    try {
      rawBody = await c.req.json();
    } catch {
      return c.json(
        buildApiError(
          "INVALID_JSON",
          "Dữ liệu cập nhật lịch phòng không đúng định dạng JSON.",
          undefined,
          buildMeta(c)
        ),
        400
      );
    }

    const parsed = UpsertHostAvailabilityInputSchema.safeParse(rawBody);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      return c.json(
        buildApiError(
          "VALIDATION_ERROR",
          firstIssue?.message ?? "Dữ liệu cập nhật lịch phòng không hợp lệ.",
          parsed.error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
          buildMeta(c)
        ),
        400
      );
    }

    const result = await hostService.upsertAvailability(
      guard.actor,
      c.req.param("id"),
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

  routes.get(API_ENDPOINTS.hostReservations, async (c) => {
    const guard = requireHostOrAdmin(c);
    if (!guard.ok) return guard.response;

    const propertyId = c.req.query("propertyId")?.trim() || undefined;
    const rawStatus = c.req.query("status")?.trim();
    const parsedStatus = rawStatus ? ReservationStatusSchema.safeParse(rawStatus) : null;
    if (parsedStatus && !parsedStatus.success) {
      return c.json(
        buildApiError(
          "VALIDATION_ERROR",
          "Tham số status không hợp lệ.",
          undefined,
          buildMeta(c)
        ),
        400
      );
    }

    const bookings = await hostService.listReservations(guard.actor, {
      propertyId,
      status: parsedStatus?.success ? parsedStatus.data : undefined,
    });
    return c.json(buildApiSuccess({ bookings }, buildMeta(c)), 200);
  });

  routes.get(API_ENDPOINTS.hostAnalytics, async (c) => {
    const guard = requireHostOrAdmin(c);
    if (!guard.ok) return guard.response;

    const analytics = await hostService.getAnalytics(guard.actor);
    return c.json(buildApiSuccess(analytics, buildMeta(c)), 200);
  });

  return routes;
}
