import {
  API_ENDPOINTS,
  ApiErrorResponseSchema,
  DealDetailSchema,
  DealsHubSchema,
  createApiSuccessSchema,
  type CatalogSnapshot,
  type DealDetail,
  type DealsHub,
  type PromotionCampaign,
} from "@luxestay/contracts";
import { matchPropertiesForCampaign, resolveCampaignVouchers } from "@luxestay/domain";
import { PROMOTION_CAMPAIGNS, SEED_CATALOG_SNAPSHOT } from "@luxestay/domain/seed";
import type { z } from "zod";
import { getServerWebEnv, type DataMode } from "../config/env";
import { HttpApiError, isAbortError } from "./errors";
import type { DealsRepository } from "./types";

const DealsHubApiSuccessSchema = createApiSuccessSchema(DealsHubSchema);
const DealDetailApiSuccessSchema = createApiSuccessSchema(DealDetailSchema);

export interface HttpDealsRepositoryOptions {
  baseUrl: string;
  fetchImpl?: typeof fetch;
}

function joinUrl(baseUrl: string, path: string): string {
  const normalizedBase = baseUrl.replace(/\/+$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}

async function fetchDealContract<TSchema extends z.ZodTypeAny>(options: {
  baseUrl: string;
  path: string;
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
  schema: TSchema;
  nullOn404: boolean;
  invalidJsonMessage: string;
  httpErrorLabel: string;
  contractMismatchMessage: string;
}): Promise<z.infer<TSchema>["data"] | null> {
  const fetchFn = options.fetchImpl ?? (typeof fetch !== "undefined" ? fetch : undefined);
  if (!fetchFn) {
    throw new HttpApiError({
      status: 0,
      code: "NETWORK_ERROR",
      message: "Fetch API không khả dụng trong môi trường hiện tại.",
    });
  }

  const endpoint = joinUrl(options.baseUrl, options.path);
  let response: Response;
  try {
    response = await fetchFn(endpoint, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: options.signal,
    });
  } catch (err) {
    if (isAbortError(err)) throw err;
    throw new HttpApiError({
      status: 0,
      code: "NETWORK_ERROR",
      message: `Không thể kết nối máy chủ LuxeStay API (${options.baseUrl || "same-origin"}). Vui lòng kiểm tra dịch vụ Backend hoặc chuyển sang NEXT_PUBLIC_DATA_MODE=mock.`,
      details: err instanceof Error ? err.message : undefined,
    });
  }

  if (options.nullOn404 && response.status === 404) {
    return null;
  }

  let rawBody: unknown;
  try {
    rawBody = await response.json();
  } catch {
    throw new HttpApiError({
      status: response.status,
      code: "CONTRACT_MISMATCH",
      message: options.invalidJsonMessage,
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
      message: `Máy chủ trả về lỗi HTTP ${response.status} ${options.httpErrorLabel}.`,
      requestId: response.headers.get("x-request-id") ?? undefined,
    });
  }

  const parsedSuccess = options.schema.safeParse(rawBody);
  if (!parsedSuccess.success) {
    throw new HttpApiError({
      status: response.status,
      code: "CONTRACT_MISMATCH",
      message: options.contractMismatchMessage,
      details: parsedSuccess.error.issues,
      requestId: response.headers.get("x-request-id") ?? undefined,
    });
  }

  return parsedSuccess.data.data;
}

/** Creates an HTTP DealsRepository backed by the LuxeStay backend deals endpoints. */
export function createHttpDealsRepository(
  options: HttpDealsRepositoryOptions
): DealsRepository {
  return {
    async getDealsHub(callOptions): Promise<DealsHub> {
      const data = await fetchDealContract({
        baseUrl: options.baseUrl,
        path: API_ENDPOINTS.deals,
        fetchImpl: options.fetchImpl,
        signal: callOptions?.signal,
        schema: DealsHubApiSuccessSchema,
        nullOn404: false,
        invalidJsonMessage: "Phản hồi danh sách ưu đãi từ máy chủ không đúng định dạng JSON.",
        httpErrorLabel: "khi tải trang ưu đãi",
        contractMismatchMessage:
          "Dữ liệu ưu đãi từ máy chủ không khớp hợp đồng @luxestay/contracts.",
      });
      if (!data) {
        throw new HttpApiError({
          status: 404,
          code: "NOT_FOUND",
          message: "Không tìm thấy dữ liệu ưu đãi từ máy chủ.",
        });
      }
      return data;
    },

    async getDealBySlug(slug: string, callOptions): Promise<DealDetail | null> {
      const normalized = slug.trim().toLowerCase();
      if (!normalized) return null;

      return fetchDealContract({
        baseUrl: options.baseUrl,
        path: API_ENDPOINTS.dealBySlug(normalized),
        fetchImpl: options.fetchImpl,
        signal: callOptions?.signal,
        schema: DealDetailApiSuccessSchema,
        nullOn404: true,
        invalidJsonMessage: "Phản hồi chi tiết ưu đãi từ máy chủ không đúng định dạng JSON.",
        httpErrorLabel: "khi tải chi tiết ưu đãi",
        contractMismatchMessage:
          "Dữ liệu chi tiết ưu đãi không khớp hợp đồng @luxestay/contracts.",
      });
    },
  };
}

/** Creates an in-memory mock DealsRepository backed by seed catalog and campaigns. */
export function createMockDealsRepository(options?: {
  snapshot?: CatalogSnapshot;
  campaigns?: readonly PromotionCampaign[];
}): DealsRepository {
  const snapshot = options?.snapshot ?? SEED_CATALOG_SNAPSHOT;
  const campaigns = options?.campaigns ?? PROMOTION_CAMPAIGNS;

  return {
    async getDealsHub(): Promise<DealsHub> {
      return {
        expiryLabel: snapshot.promotions.expiryLabel,
        vouchers: snapshot.promotions.vouchers,
        campaigns,
      };
    },

    async getDealBySlug(slug: string): Promise<DealDetail | null> {
      const normalized = slug.trim().toLowerCase();
      if (!normalized) return null;

      const campaign = campaigns.find(
        (item) => item.slug.trim().toLowerCase() === normalized
      );
      if (!campaign || !campaign.isActive) {
        return null;
      }

      const vouchers = resolveCampaignVouchers(campaign, snapshot.promotions.vouchers);
      const properties = matchPropertiesForCampaign(snapshot.properties, campaign);

      return {
        campaign,
        vouchers,
        properties,
      };
    },
  };
}

/** Instantiates the appropriate DealsRepository for the active data mode. */
export function createDealsRepositoryForMode(options: {
  mode: DataMode;
  apiBaseUrl: string;
  fetchImpl?: typeof fetch;
}): DealsRepository {
  if (options.mode === "mock") {
    return createMockDealsRepository();
  }
  return createHttpDealsRepository({
    baseUrl: options.apiBaseUrl,
    fetchImpl: options.fetchImpl,
  });
}

/** Server loader for the /deals hub page using getServerWebEnv(). */
export async function loadDealsHub(): Promise<DealsHub> {
  const env = getServerWebEnv();
  const repo = createDealsRepositoryForMode({
    mode: env.dataMode,
    apiBaseUrl: env.serverApiBaseUrl,
  });
  return repo.getDealsHub();
}

/** Server loader for /deals/[slug] campaign detail pages using getServerWebEnv(). */
export async function loadDealBySlug(slug: string): Promise<DealDetail | null> {
  const env = getServerWebEnv();
  const repo = createDealsRepositoryForMode({
    mode: env.dataMode,
    apiBaseUrl: env.serverApiBaseUrl,
  });
  return repo.getDealBySlug(slug);
}
