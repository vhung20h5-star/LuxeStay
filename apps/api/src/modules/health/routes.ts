import { Hono } from "hono";
import { API_ENDPOINTS, buildApiSuccess } from "@luxestay/contracts";
import { buildMeta } from "../../middleware/errorHandler.js";
import type { ApiEnvBindings } from "../../types.js";

export function createHealthRoutes() {
  const routes = new Hono<ApiEnvBindings>();

  routes.get(API_ENDPOINTS.health, (c) => {
    return c.json(
      buildApiSuccess({ status: "ok" as const, service: "luxestay-api" }, buildMeta(c)),
      200
    );
  });

  return routes;
}
