import { Hono, type Context } from "hono";
import { deleteCookie, setCookie } from "hono/cookie";
import {
  API_ENDPOINTS,
  LoginInputSchema,
  OtpRequestInputSchema,
  OtpVerifyInputSchema,
  RegisterInputSchema,
  buildApiError,
  buildApiSuccess,
} from "@luxestay/contracts";
import { SESSION_COOKIE_NAME } from "../../middleware/auth.js";
import { buildMeta } from "../../middleware/errorHandler.js";
import type { ApiEnvBindings } from "../../types.js";
import type { AuthService } from "./service.js";

export function createAuthRoutes(
  authService: AuthService,
  options: { sessionTtlDays: number; secureCookie: boolean }
) {
  const routes = new Hono<ApiEnvBindings>();
  const maxAgeSeconds = Math.max(1, options.sessionTtlDays) * 86_400;

  function applySessionCookie(c: Context<ApiEnvBindings>, token: string) {
    setCookie(c, SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "Lax",
      secure: options.secureCookie,
      path: "/",
      maxAge: maxAgeSeconds,
    });
  }

  routes.get(API_ENDPOINTS.authMe, (c) => {
    return c.json(buildApiSuccess({ user: c.get("authUser") }, buildMeta(c)), 200);
  });

  routes.post(API_ENDPOINTS.authRegister, async (c) => {
    let rawBody: unknown;
    try {
      rawBody = await c.req.json();
    } catch {
      return c.json(
        buildApiError("INVALID_JSON", "Dữ liệu đăng ký không đúng định dạng JSON.", undefined, buildMeta(c)),
        400
      );
    }

    const parsed = RegisterInputSchema.safeParse(rawBody);
    if (!parsed.success) {
      return c.json(
        buildApiError(
          "VALIDATION_ERROR",
          parsed.error.issues[0]?.message ?? "Thông tin đăng ký chưa hợp lệ.",
          parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
          buildMeta(c)
        ),
        400
      );
    }

    const result = await authService.register(parsed.data);
    if (!result.ok) {
      return c.json(buildApiError(result.code, result.message, undefined, buildMeta(c)), result.status);
    }

    if (result.sessionToken) applySessionCookie(c, result.sessionToken);
    return c.json(buildApiSuccess(result.data, buildMeta(c)), 201);
  });

  routes.post(API_ENDPOINTS.authLogin, async (c) => {
    let rawBody: unknown;
    try {
      rawBody = await c.req.json();
    } catch {
      return c.json(
        buildApiError("INVALID_JSON", "Dữ liệu đăng nhập không đúng định dạng JSON.", undefined, buildMeta(c)),
        400
      );
    }

    const parsed = LoginInputSchema.safeParse(rawBody);
    if (!parsed.success) {
      return c.json(
        buildApiError(
          "VALIDATION_ERROR",
          parsed.error.issues[0]?.message ?? "Thông tin đăng nhập chưa hợp lệ.",
          parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
          buildMeta(c)
        ),
        400
      );
    }

    const result = await authService.login(parsed.data);
    if (!result.ok) {
      return c.json(buildApiError(result.code, result.message, undefined, buildMeta(c)), result.status);
    }

    if (result.sessionToken) applySessionCookie(c, result.sessionToken);
    return c.json(buildApiSuccess(result.data, buildMeta(c)), 200);
  });

  routes.post(API_ENDPOINTS.authOtpRequest, async (c) => {
    let rawBody: unknown;
    try {
      rawBody = await c.req.json();
    } catch {
      return c.json(
        buildApiError("INVALID_JSON", "Dữ liệu yêu cầu OTP không đúng định dạng JSON.", undefined, buildMeta(c)),
        400
      );
    }

    const parsed = OtpRequestInputSchema.safeParse(rawBody);
    if (!parsed.success) {
      return c.json(
        buildApiError(
          "VALIDATION_ERROR",
          parsed.error.issues[0]?.message ?? "Email hoặc số điện thoại không hợp lệ.",
          undefined,
          buildMeta(c)
        ),
        400
      );
    }

    const result = await authService.requestOtp(parsed.data);
    if (!result.ok) {
      return c.json(buildApiError(result.code, result.message, undefined, buildMeta(c)), result.status);
    }
    return c.json(buildApiSuccess(result.data, buildMeta(c)), 200);
  });

  routes.post(API_ENDPOINTS.authOtpVerify, async (c) => {
    let rawBody: unknown;
    try {
      rawBody = await c.req.json();
    } catch {
      return c.json(
        buildApiError("INVALID_JSON", "Dữ liệu xác thực OTP không đúng định dạng JSON.", undefined, buildMeta(c)),
        400
      );
    }

    const parsed = OtpVerifyInputSchema.safeParse(rawBody);
    if (!parsed.success) {
      return c.json(
        buildApiError(
          "VALIDATION_ERROR",
          parsed.error.issues[0]?.message ?? "Mã OTP không hợp lệ.",
          undefined,
          buildMeta(c)
        ),
        400
      );
    }

    const result = await authService.verifyOtp(parsed.data);
    if (!result.ok) {
      return c.json(buildApiError(result.code, result.message, undefined, buildMeta(c)), result.status);
    }

    if (result.sessionToken) applySessionCookie(c, result.sessionToken);
    return c.json(buildApiSuccess(result.data, buildMeta(c)), 200);
  });

  routes.post(API_ENDPOINTS.authLogout, async (c) => {
    await authService.logout(c.get("sessionToken"));
    deleteCookie(c, SESSION_COOKIE_NAME, { path: "/" });
    return c.json(buildApiSuccess({ loggedOut: true as const }, buildMeta(c)), 200);
  });

  return routes;
}
