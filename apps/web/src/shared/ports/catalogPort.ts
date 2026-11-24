import {
  API_ENDPOINTS,
  ApiErrorResponseSchema,
  CatalogSnapshotSchema,
  PropertySchema,
  createApiSuccessSchema,
  type CatalogSnapshot,
  type Property,
} from "@luxestay/contracts";
import { SEED_CATALOG_SNAPSHOT } from "@luxestay/domain/seed";
import { getServerWebEnv, type DataMode } from "../config/env";
import { HttpApiError, isAbortError } from "./errors";
import type { CatalogRepository } from "./types";

const CatalogApiSuccessSchema = createApiSuccessSchema(CatalogSnapshotSchema);
const PropertyApiSuccessSchema = createApiSuccessSchema(PropertySchema);

export interface HttpCatalogRepositoryOptions {
  baseUrl: string;
  fetchImpl?: typeof fetch;
}

function joinUrl(baseUrl: string, path: string): string {
  const normalizedBase = baseUrl.replace(/\/+$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}

export function createHttpCatalogRepository(
  options: HttpCatalogRepositoryOptions
): CatalogRepository {
  const catalogEndpoint = joinUrl(options.baseUrl, API_ENDPOINTS.catalog);

  return {
    async getSnapshot(callOptions): Promise<CatalogSnapshot> {
      const fetchFn = options.fetchImpl ?? (typeof fetch !== "undefined" ? fetch : undefined);
      if (!fetchFn) {
        throw new HttpApiError({
          status: 0,
          code: "NETWORK_ERROR",
          message: "Fetch API không khả dụng trong môi trường hiện tại.",
        });
      }

      let response: Response;
      try {
        response = await fetchFn(catalogEndpoint, {
          method: "GET",
          headers: { Accept: "application/json" },
          cache: "no-store",
          signal: callOptions?.signal,
        });
      } catch (err) {
        if (isAbortError(err)) throw err;
        throw new HttpApiError({
          status: 0,
          code: "NETWORK_ERROR",
          message: `Không thể kết nối máy chủ LuxeStay API (${options.baseUrl}). Vui lòng kiểm tra dịch vụ Backend hoặc chuyển sang NEXT_PUBLIC_DATA_MODE=mock.`,
          details: err instanceof Error ? err.message : undefined,
        });
      }

      let rawBody: unknown;
      try {
        rawBody = await response.json();
      } catch {
        throw new HttpApiError({
          status: response.status,
          code: "CONTRACT_MISMATCH",
          message: "Phản hồi danh mục từ máy chủ không đúng định dạng JSON.",
          requestId: response.headers.get("x-request-id") ?? undefined,
        });
      }

      if (!response.ok) {
        const parsedError = ApiErrorResponseSchema.safeParse(rawBody);
        if (parsedError.success) {
          throw new HttpApiError({
            status: response.status,
            code: parsedError.data.error.code,
            message: parsedError.data.error.message,
            details: parsedError.data.error.details,
            requestId:
              parsedError.data.meta?.requestId ??
              response.headers.get("x-request-id") ??
              undefined,
          });
        }
        throw new HttpApiError({
          status: response.status,
          code: "INTERNAL_ERROR",
          message: `Máy chủ danh mục trả về lỗi HTTP ${response.status}.`,
          requestId: response.headers.get("x-request-id") ?? undefined,
        });
      }

      const parsedSuccess = CatalogApiSuccessSchema.safeParse(rawBody);
      if (!parsedSuccess.success) {
        throw new HttpApiError({
          status: response.status,
          code: "CONTRACT_MISMATCH",
          message: "Dữ liệu danh mục từ máy chủ không khớp hợp đồng @luxestay/contracts.",
          details: parsedSuccess.error.issues,
          requestId: response.headers.get("x-request-id") ?? undefined,
        });
      }

      return parsedSuccess.data.data;
    },

    async getPropertyById(id: string, callOptions): Promise<Property | null> {
      const normalized = id.trim();
      if (!normalized) return null;

      const fetchFn = options.fetchImpl ?? (typeof fetch !== "undefined" ? fetch : undefined);
      if (!fetchFn) {
        throw new HttpApiError({
          status: 0,
          code: "NETWORK_ERROR",
          message: "Fetch API không khả dụng trong môi trường hiện tại.",
        });
      }

      const endpoint = joinUrl(options.baseUrl, API_ENDPOINTS.propertyById(normalized));
      let response: Response;
      try {
        response = await fetchFn(endpoint, {
          method: "GET",
          headers: { Accept: "application/json" },
          cache: "no-store",
          signal: callOptions?.signal,
        });
      } catch (err) {
        if (isAbortError(err)) throw err;
        throw new HttpApiError({
          status: 0,
          code: "NETWORK_ERROR",
          message: `Không thể kết nối máy chủ LuxeStay API (${options.baseUrl}).`,
          details: err instanceof Error ? err.message : undefined,
        });
      }

      if (response.status === 404) {
        return null;
      }

      let rawBody: unknown;
      try {
        rawBody = await response.json();
      } catch {
        throw new HttpApiError({
          status: response.status,
          code: "CONTRACT_MISMATCH",
          message: "Phản hồi thông tin chỗ nghỉ không đúng định dạng JSON.",
          requestId: response.headers.get("x-request-id") ?? undefined,
        });
      }

      if (!response.ok) {
        const parsedError = ApiErrorResponseSchema.safeParse(rawBody);
        if (parsedError.success) {
          throw new HttpApiError({
            status: response.status,
            code: parsedError.data.error.code,
            message: parsedError.data.error.message,
            details: parsedError.data.error.details,
            requestId:
              parsedError.data.meta?.requestId ??
              response.headers.get("x-request-id") ??
              undefined,
          });
        }
        throw new HttpApiError({
          status: response.status,
          code: "INTERNAL_ERROR",
          message: `Máy chủ trả về lỗi HTTP ${response.status} khi tải chỗ nghỉ.`,
          requestId: response.headers.get("x-request-id") ?? undefined,
        });
      }

      const parsedSuccess = PropertyApiSuccessSchema.safeParse(rawBody);
      if (!parsedSuccess.success) {
        throw new HttpApiError({
          status: response.status,
          code: "CONTRACT_MISMATCH",
          message: "Dữ liệu chỗ nghỉ không khớp hợp đồng @luxestay/contracts.",
          details: parsedSuccess.error.issues,
          requestId: response.headers.get("x-request-id") ?? undefined,
        });
      }

      return parsedSuccess.data.data;
    },
  };
}

export function createMockCatalogRepository(
  snapshot: CatalogSnapshot = SEED_CATALOG_SNAPSHOT
): CatalogRepository {
  return {
    async getSnapshot() {
      return snapshot;
    },
    async getPropertyById(id: string) {
      const normalized = id.trim();
      return snapshot.properties.find((property) => property.id === normalized) ?? null;
    },
  };
}

export function createCatalogRepositoryForMode(options: {
  mode: DataMode;
  apiBaseUrl: string;
  fetchImpl?: typeof fetch;
}): CatalogRepository {
  if (options.mode === "mock") {
    return createMockCatalogRepository();
  }
  return createHttpCatalogRepository({
    baseUrl: options.apiBaseUrl,
    fetchImpl: options.fetchImpl,
  });
}

export async function loadInitialCatalog(): Promise<{
  catalog: CatalogSnapshot;
  dataMode: DataMode;
  publicApiBaseUrl: string;
}> {
  const env = getServerWebEnv();
  const repo = createCatalogRepositoryForMode({
    mode: env.dataMode,
    apiBaseUrl: env.serverApiBaseUrl,
  });
  const catalog = await repo.getSnapshot();
  return {
    catalog,
    dataMode: env.dataMode,
    publicApiBaseUrl: env.publicApiBaseUrl,
  };
}

export async function loadPropertyById(id: string): Promise<Property | null> {
  const env = getServerWebEnv();
  const repo = createCatalogRepositoryForMode({
    mode: env.dataMode,
    apiBaseUrl: env.serverApiBaseUrl,
  });
  return repo.getPropertyById(id);
}
