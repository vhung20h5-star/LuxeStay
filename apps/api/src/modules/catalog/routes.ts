import { Hono } from "hono";
import { API_ENDPOINTS, buildApiError, buildApiSuccess } from "@luxestay/contracts";
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

  return routes;
}
