import { z } from "zod";

export const DataModeSchema = z.enum(["api", "mock"]);
export type DataMode = z.infer<typeof DataModeSchema>;

const PublicWebEnvSchema = z.object({
  NEXT_PUBLIC_DATA_MODE: DataModeSchema.default("api"),
  NEXT_PUBLIC_API_BASE_URL: z.string().url().default("http://localhost:4000"),
});

const ServerWebEnvSchema = PublicWebEnvSchema.extend({
  API_BASE_URL: z.string().url().optional(),
});

export interface PublicWebEnv {
  dataMode: DataMode;
  publicApiBaseUrl: string;
}

export interface ServerWebEnv extends PublicWebEnv {
  serverApiBaseUrl: string;
}

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

export function getPublicWebEnv(
  raw: Record<string, string | undefined> = {
    NEXT_PUBLIC_DATA_MODE: process.env.NEXT_PUBLIC_DATA_MODE,
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
  }
): PublicWebEnv {
  const parsed = PublicWebEnvSchema.safeParse({
    NEXT_PUBLIC_DATA_MODE: raw.NEXT_PUBLIC_DATA_MODE || undefined,
    NEXT_PUBLIC_API_BASE_URL: raw.NEXT_PUBLIC_API_BASE_URL || undefined,
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
    NEXT_PUBLIC_DATA_MODE: raw.NEXT_PUBLIC_DATA_MODE || undefined,
    NEXT_PUBLIC_API_BASE_URL: raw.NEXT_PUBLIC_API_BASE_URL || undefined,
    API_BASE_URL: raw.API_BASE_URL || undefined,
  });

  if (!parsed.success) {
    const details = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Invalid @luxestay/web server environment configuration: ${details}`);
  }

  const publicApiBaseUrl = normalizeBaseUrl(parsed.data.NEXT_PUBLIC_API_BASE_URL);
  const serverApiBaseUrl = normalizeBaseUrl(parsed.data.API_BASE_URL ?? publicApiBaseUrl);

  return {
    dataMode: parsed.data.NEXT_PUBLIC_DATA_MODE,
    publicApiBaseUrl,
    serverApiBaseUrl,
  };
}
