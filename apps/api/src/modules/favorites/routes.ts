import { Hono } from "hono";
import {
  API_ENDPOINTS,
  FavoritesSyncInputSchema,
  buildApiError,
  buildApiSuccess,
} from "@luxestay/contracts";
import { buildMeta } from "../../middleware/errorHandler.js";
import type { ApiEnvBindings } from "../../types.js";
import type { FavoritesService } from "./service.js";

export function createFavoritesRoutes(favoritesService: FavoritesService) {
  const routes = new Hono<ApiEnvBindings>();

  routes.get(API_ENDPOINTS.favorites, async (c) => {
    const authUser = c.get("authUser");
    if (!authUser) {
      return c.json(
        buildApiError("UNAUTHORIZED", "Vui lòng đăng nhập để xem danh sách yêu thích.", undefined, buildMeta(c)),
        401
      );
    }

    const propertyIds = await favoritesService.getFavorites(authUser.id);
    return c.json(buildApiSuccess({ propertyIds }, buildMeta(c)), 200);
  });

  routes.put(API_ENDPOINTS.favorites, async (c) => {
    const authUser = c.get("authUser");
    if (!authUser) {
      return c.json(
        buildApiError("UNAUTHORIZED", "Vui lòng đăng nhập để đồng bộ danh sách yêu thích.", undefined, buildMeta(c)),
        401
      );
    }

    let rawBody: unknown;
    try {
      rawBody = await c.req.json();
    } catch {
      return c.json(
        buildApiError("INVALID_JSON", "Dữ liệu danh sách yêu thích không đúng định dạng JSON.", undefined, buildMeta(c)),
        400
      );
    }

    const parsed = FavoritesSyncInputSchema.safeParse(rawBody);
    if (!parsed.success) {
      return c.json(
        buildApiError("VALIDATION_ERROR", "Danh sách mã chỗ nghỉ yêu thích không hợp lệ.", undefined, buildMeta(c)),
        400
      );
    }

    const mode = c.req.query("mode") === "replace" ? "replace" : "merge";
    const propertyIds = await favoritesService.syncFavorites(
      authUser.id,
      parsed.data.propertyIds,
      mode
    );
    return c.json(buildApiSuccess({ propertyIds }, buildMeta(c)), 200);
  });

  routes.post("/api/v1/favorites/:propertyId/toggle", async (c) => {
    const authUser = c.get("authUser");
    if (!authUser) {
      return c.json(
        buildApiError("UNAUTHORIZED", "Vui lòng đăng nhập để cập nhật danh sách yêu thích.", undefined, buildMeta(c)),
        401
      );
    }

    const result = await favoritesService.toggleFavorite(authUser.id, c.req.param("propertyId"));
    if (!result.ok) {
      return c.json(buildApiError("NOT_FOUND", result.message, undefined, buildMeta(c)), 404);
    }

    return c.json(buildApiSuccess({ propertyIds: result.propertyIds }, buildMeta(c)), 200);
  });

  return routes;
}
