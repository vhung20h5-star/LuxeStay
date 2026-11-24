import { Hono } from "hono";
import { API_ENDPOINTS, buildApiError, buildApiSuccess } from "@luxestay/contracts";
import { buildMeta } from "../../middleware/errorHandler.js";
import type { ApiEnvBindings } from "../../types.js";
import type { DealsService } from "./service.js";

/** Registers public HTTP routes for the independent deals hub and campaign detail pages. */
export function createDealsRoutes(dealsService: DealsService) {
  const routes = new Hono<ApiEnvBindings>();

  routes.get(API_ENDPOINTS.deals, async (c) => {
    const hub = await dealsService.getDealsHub();
    return c.json(buildApiSuccess(hub, buildMeta(c)), 200);
  });

  routes.get("/api/v1/deals/:slug", async (c) => {
    const slug = c.req.param("slug");
    const detail = await dealsService.getDealBySlug(slug);
    if (!detail) {
      return c.json(
        buildApiError(
          "NOT_FOUND",
          "Không tìm thấy chương trình ưu đãi theo đường dẫn yêu cầu.",
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
