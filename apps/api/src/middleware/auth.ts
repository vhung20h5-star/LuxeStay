import { getCookie } from "hono/cookie";
import type { MiddlewareHandler } from "hono";
import type { ApiEnvBindings } from "../types.js";
import type { AuthService } from "../modules/auth/service.js";

export const SESSION_COOKIE_NAME = "luxestay_session";

export function createAuthSessionMiddleware(
  authService: AuthService
): MiddlewareHandler<ApiEnvBindings> {
  return async (c, next) => {
    const rawToken = getCookie(c, SESSION_COOKIE_NAME) ?? null;
    c.set("sessionToken", rawToken);
    if (!rawToken) {
      c.set("authUser", null);
      await next();
      return;
    }

    const user = await authService.resolveSession(rawToken);
    c.set("authUser", user);
    await next();
  };
}
