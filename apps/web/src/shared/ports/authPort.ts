import {
  API_ENDPOINTS,
  ApiErrorResponseSchema,
  AuthSessionDataSchema,
  FavoritesListDataSchema,
  OtpRequestResultSchema,
  createApiSuccessSchema,
  type AuthUser,
  type OtpRequestResult,
} from "@luxestay/contracts";
import { z } from "zod";
import type { DataMode } from "../config/env";
import { HttpApiError, isAbortError } from "./errors";
import type { AuthPort } from "./types";

const AuthSessionSuccessSchema = createApiSuccessSchema(AuthSessionDataSchema);
const OtpRequestSuccessSchema = createApiSuccessSchema(OtpRequestResultSchema);
const FavoritesSuccessSchema = createApiSuccessSchema(FavoritesListDataSchema);
const LogoutSuccessSchema = createApiSuccessSchema(z.object({ loggedOut: z.literal(true) }));

async function parseJsonContract<T extends z.ZodTypeAny>(
  response: Response,
  schema: T,
  fallbackMessage: string
): Promise<z.infer<T>> {
  let rawBody: unknown;
  try {
    rawBody = await response.json();
  } catch {
    throw new HttpApiError({
      status: response.status,
      code: "CONTRACT_MISMATCH",
      message: fallbackMessage,
      requestId: response.headers.get("x-request-id") ?? undefined,
    });
  }

  if (!response.ok) {
    const parsedErr = ApiErrorResponseSchema.safeParse(rawBody);
    if (parsedErr.success) {
      throw new HttpApiError({
        status: response.status,
        code: parsedErr.data.error.code,
        message: parsedErr.data.error.message,
        details: parsedErr.data.error.details,
        requestId:
          parsedErr.data.meta?.requestId ?? response.headers.get("x-request-id") ?? undefined,
      });
    }
    throw new HttpApiError({
      status: response.status,
      code: "INTERNAL_ERROR",
      message: fallbackMessage,
      requestId: response.headers.get("x-request-id") ?? undefined,
    });
  }

  const parsed = schema.safeParse(rawBody);
  if (!parsed.success) {
    throw new HttpApiError({
      status: response.status,
      code: "CONTRACT_MISMATCH",
      message: "Dữ liệu tài khoản từ máy chủ không khớp hợp đồng @luxestay/contracts.",
      details: parsed.error.issues,
      requestId: response.headers.get("x-request-id") ?? undefined,
    });
  }

  return parsed.data;
}

export function createHttpAuthPort(options?: {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
}): AuthPort {
  const baseUrl = (options?.baseUrl ?? "http://localhost:4000").replace(/\/+$/, "");

  async function requestJson<T extends z.ZodTypeAny>(
    path: string,
    init: RequestInit,
    schema: T,
    fallbackMessage: string
  ): Promise<z.infer<T>> {
    const fetchFn = options?.fetchImpl ?? (typeof fetch !== "undefined" ? fetch : undefined);
    if (!fetchFn) {
      throw new HttpApiError({
        status: 0,
        code: "NETWORK_ERROR",
        message: "Fetch API không khả dụng trong môi trường hiện tại.",
      });
    }

    let response: Response;
    try {
      response = await fetchFn(`${baseUrl}${path}`, {
        ...init,
        credentials: "include",
        headers: {
          Accept: "application/json",
          ...(init.body ? { "Content-Type": "application/json" } : {}),
          ...init.headers,
        },
      });
    } catch (err) {
      if (isAbortError(err)) throw err;
      throw new HttpApiError({
        status: 0,
        code: "NETWORK_ERROR",
        message: "Không thể kết nối máy chủ xác thực LuxeStay.",
        details: err instanceof Error ? err.message : undefined,
      });
    }

    return parseJsonContract(response, schema, fallbackMessage);
  }

  return {
    async me(callOptions) {
      const res = await requestJson(
        API_ENDPOINTS.authMe,
        { method: "GET", cache: "no-store", signal: callOptions?.signal },
        AuthSessionSuccessSchema,
        "Không thể kiểm tra phiên đăng nhập."
      );
      return res.data.user;
    },

    async register(input) {
      const res = await requestJson(
        API_ENDPOINTS.authRegister,
        { method: "POST", body: JSON.stringify(input) },
        AuthSessionSuccessSchema,
        "Không thể đăng ký tài khoản."
      );
      if (!res.data.user) {
        throw new HttpApiError({
          status: 500,
          code: "CONTRACT_MISMATCH",
          message: "Máy chủ không trả về thông tin người dùng sau đăng ký.",
        });
      }
      return res.data.user;
    },

    async login(input) {
      const res = await requestJson(
        API_ENDPOINTS.authLogin,
        { method: "POST", body: JSON.stringify(input) },
        AuthSessionSuccessSchema,
        "Không thể đăng nhập tài khoản."
      );
      if (!res.data.user) {
        throw new HttpApiError({
          status: 500,
          code: "CONTRACT_MISMATCH",
          message: "Máy chủ không trả về thông tin người dùng sau đăng nhập.",
        });
      }
      return res.data.user;
    },

    async requestOtp(input) {
      const res = await requestJson(
        API_ENDPOINTS.authOtpRequest,
        { method: "POST", body: JSON.stringify(input) },
        OtpRequestSuccessSchema,
        "Không thể gửi mã OTP."
      );
      return res.data;
    },

    async verifyOtp(input) {
      const res = await requestJson(
        API_ENDPOINTS.authOtpVerify,
        { method: "POST", body: JSON.stringify(input) },
        AuthSessionSuccessSchema,
        "Không thể xác thực mã OTP."
      );
      if (!res.data.user) {
        throw new HttpApiError({
          status: 500,
          code: "CONTRACT_MISMATCH",
          message: "Máy chủ không trả về phiên người dùng sau xác thực OTP.",
        });
      }
      return res.data.user;
    },

    async logout() {
      await requestJson(
        API_ENDPOINTS.authLogout,
        { method: "POST" },
        LogoutSuccessSchema,
        "Không thể đăng xuất."
      );
    },

    async getRemoteFavorites() {
      const res = await requestJson(
        API_ENDPOINTS.favorites,
        { method: "GET", cache: "no-store" },
        FavoritesSuccessSchema,
        "Không thể tải danh sách yêu thích."
      );
      return res.data.propertyIds;
    },

    async syncFavorites(propertyIds, mode = "merge") {
      const res = await requestJson(
        `${API_ENDPOINTS.favorites}?mode=${mode}`,
        { method: "PUT", body: JSON.stringify({ propertyIds }) },
        FavoritesSuccessSchema,
        "Không thể đồng bộ danh sách yêu thích."
      );
      return res.data.propertyIds;
    },

    async toggleRemoteFavorite(propertyId) {
      const res = await requestJson(
        API_ENDPOINTS.toggleFavorite(propertyId),
        { method: "POST" },
        FavoritesSuccessSchema,
        "Không thể cập nhật trạng thái yêu thích."
      );
      return res.data.propertyIds;
    },
  };
}

export function createMockAuthPort(): AuthPort {
  let currentUser: AuthUser | null = null;
  let remoteFavorites: string[] = [];

  return {
    async me() {
      return currentUser;
    },
    async register(input) {
      currentUser = {
        id: "USR-MOCK01",
        email: input.email.trim().toLowerCase(),
        phone: input.phone?.trim() || undefined,
        fullName: input.fullName.trim(),
        provider: "password",
        role: "guest",
        createdAt: new Date().toISOString(),
      };
      return currentUser;
    },
    async login(input) {
      const normalizedEmail = input.email.trim().toLowerCase();
      const role =
        normalizedEmail === "admin@luxestay.vn"
          ? "admin"
          : normalizedEmail === "host@luxestay.vn"
            ? "host"
            : "guest";
      const id =
        role === "admin"
          ? "USR-ADMIN-01"
          : role === "host"
            ? "USR-HOST-01"
            : "USR-MOCK01";
      currentUser = {
        id,
        email: normalizedEmail,
        fullName:
          role === "admin"
            ? "Quản trị viên LuxeStay"
            : role === "host"
              ? "Minh Quân Host"
              : normalizedEmail.split("@")[0] || "Thành viên LuxeStay",
        provider: "password",
        role,
        createdAt: new Date().toISOString(),
      };
      return currentUser;
    },
    async requestOtp(input): Promise<OtpRequestResult> {
      return {
        identifier: input.identifier.trim(),
        channel: input.identifier.includes("@") ? "email" : "sms",
        expiresAt: new Date(Date.now() + 5 * 60_000).toISOString(),
        devCode: "123456",
      };
    },
    async verifyOtp(input) {
      if (input.code.trim() !== "123456") {
        throw new HttpApiError({
          status: 401,
          code: "UNAUTHORIZED",
          message: "Mã OTP thử nghiệm (mock mode) là 123456.",
        });
      }
      currentUser = {
        id: "USR-MOCK-OTP",
        email: input.identifier.includes("@")
          ? input.identifier.trim().toLowerCase()
          : "otp.guest@luxestay.vn",
        phone: input.identifier.includes("@") ? undefined : input.identifier.trim(),
        fullName: input.fullName?.trim() || "Thành viên OTP",
        provider: "otp",
        role: "guest",
        createdAt: new Date().toISOString(),
      };
      return currentUser;
    },
    async logout() {
      currentUser = null;
    },
    async getRemoteFavorites() {
      return Object.freeze([...remoteFavorites]);
    },
    async syncFavorites(propertyIds, mode = "merge") {
      remoteFavorites =
        mode === "replace"
          ? [...new Set(propertyIds)]
          : [...new Set([...remoteFavorites, ...propertyIds])];
      return Object.freeze([...remoteFavorites]);
    },
    async toggleRemoteFavorite(propertyId) {
      remoteFavorites = remoteFavorites.includes(propertyId)
        ? remoteFavorites.filter((id) => id !== propertyId)
        : [...remoteFavorites, propertyId];
      return Object.freeze([...remoteFavorites]);
    },
  };
}

export function createAuthPortForMode(options: {
  mode: DataMode;
  apiBaseUrl: string;
  fetchImpl?: typeof fetch;
}): AuthPort {
  return options.mode === "api"
    ? createHttpAuthPort({ baseUrl: options.apiBaseUrl, fetchImpl: options.fetchImpl })
    : createMockAuthPort();
}
