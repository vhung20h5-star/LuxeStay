import { Hono } from "hono";
import { buildApiError, buildApiSuccess } from "@luxestay/contracts";
import { buildMeta } from "../../middleware/errorHandler.js";
import type { ApiEnvBindings } from "../../types.js";
import type { AvailabilityService } from "./service.js";

export function createAvailabilityRoutes(availabilityService: AvailabilityService) {
  const routes = new Hono<ApiEnvBindings>();

  routes.get("/api/v1/properties/:id/availability", async (c) => {
    const propertyId = c.req.param("id");
    const from = c.req.query("from") ?? undefined;
    const to = c.req.query("to") ?? undefined;

    const result = await availabilityService.getPropertyAvailability(propertyId, {
      from,
      to,
    });

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
