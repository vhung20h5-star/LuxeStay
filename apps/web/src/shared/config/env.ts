import { z } from "zod";

export const DataModeSchema = z.enum(["api", "mock"]);
export type DataMode = z.infer<typeof DataModeSchema>;

const SAME_ORIGIN_TOKENS = new Set(["/", "same-origin"]);

function isSameOriginToken(value: string): boolean {
  return SAME_ORIGIN_TOKENS.has(value.trim().toLowerCase());
}

const PublicApiBaseUrlSchema = z
  .string()
  .trim()
  .refine(
    (value) => isSameOriginToken(value) || z.string().url().safeParse(value).success,
    { message: 'Must be a valid URL or "/" for same-origin API routing' }
  )
  .default("http://localhost:4000");

const PublicWebEnvSchema = z.object({
  NEXT_PUBLIC_DATA_MODE: DataModeSchema.default("api"),
  NEXT_PUBLIC_API_BASE_URL: PublicApiBaseUrlSchema,
});

const ServerWebEnvSchema = PublicWebEnvSchema.extend({
  API_BASE_URL: z.string().url().optional(),
  VERCEL_URL: z.string().trim().min(1).optional(),
});

export interface PublicWebEnv {
  dataMode: DataMode;
  publicApiBaseUrl: string;
}

export interface ServerWebEnv extends PublicWebEnv {
  serverApiBaseUrl: string;
}

function normalizeBaseUrl(url: string): string {
  const trimmed = url.trim();
  if (isSameOriginToken(trimmed)) {
    return "";
  }
  return trimmed.replace(/\/+$/, "");
}

function normalizeVercelUrl(rawHost: string | undefined): string | undefined {
  const trimmed = rawHost?.trim();
  if (!trimmed) return undefined;
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    return normalizeBaseUrl(new URL(withProtocol).origin);
  } catch {
    return undefined;
  }
}

function optionalTrimmed(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function getPublicWebEnv(
  raw: Record<string, string | undefined> = {
    NEXT_PUBLIC_DATA_MODE: process.env.NEXT_PUBLIC_DATA_MODE,
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
  }
): PublicWebEnv {
  const parsed = PublicWebEnvSchema.safeParse({
    NEXT_PUBLIC_DATA_MODE: optionalTrimmed(raw.NEXT_PUBLIC_DATA_MODE),
    NEXT_PUBLIC_API_BASE_URL: optionalTrimmed(raw.NEXT_PUBLIC_API_BASE_URL),
  });

  if (!parsed.success) {
    const details = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Invalid @luxestay/web public environment configuration: ${details}`);
  }

  return {
    dataMode: parsed.data.NEXT_PUBLIC_DATA_MODE,
    publicApiBaseUrl: normalizeBaseUrl(parsed.data.NEXT_PUBLIC_API_BASE_URL),
  };
}

export function getServerWebEnv(
  raw: Record<string, string | undefined> = process.env
): ServerWebEnv {
  const parsed = ServerWebEnvSchema.safeParse({
    NEXT_PUBLIC_DATA_MODE: optionalTrimmed(raw.NEXT_PUBLIC_DATA_MODE),
    NEXT_PUBLIC_API_BASE_URL: optionalTrimmed(raw.NEXT_PUBLIC_API_BASE_URL),
    API_BASE_URL: optionalTrimmed(raw.API_BASE_URL),
    VERCEL_URL: optionalTrimmed(raw.VERCEL_URL),
  });

  if (!parsed.success) {
    const details = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Invalid @luxestay/web server environment configuration: ${details}`);
  }

  const publicApiBaseUrl = normalizeBaseUrl(parsed.data.NEXT_PUBLIC_API_BASE_URL);
  const explicitServerUrl = parsed.data.API_BASE_URL
    ? normalizeBaseUrl(parsed.data.API_BASE_URL)
    : undefined;
  const vercelFallbackUrl = normalizeVercelUrl(parsed.data.VERCEL_URL);
  const resolvedServerApiBaseUrl =
    explicitServerUrl ?? (publicApiBaseUrl || vercelFallbackUrl || "");

  if (parsed.data.NEXT_PUBLIC_DATA_MODE === "api" && !resolvedServerApiBaseUrl) {
    throw new Error(
      'Invalid @luxestay/web server environment configuration: API_BASE_URL is required on the server when NEXT_PUBLIC_API_BASE_URL uses same-origin mode ("/").'
    );
  }

  return {
    dataMode: parsed.data.NEXT_PUBLIC_DATA_MODE,
    publicApiBaseUrl,
    serverApiBaseUrl: resolvedServerApiBaseUrl,
  };
}
