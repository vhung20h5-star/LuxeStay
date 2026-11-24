import { z } from "zod";

export const StorageDriverSchema = z.enum(["memory", "database"]);
export type StorageDriver = z.infer<typeof StorageDriverSchema>;

const ApiEnvSchema = z
  .object({
    PORT: z.coerce.number().int().min(1).max(65535).default(4000),
    CORS_ORIGINS: z.string().default("http://localhost:3000"),
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    STORAGE_DRIVER: StorageDriverSchema.default("memory"),
    DATABASE_URL: z.string().url().optional(),
    SESSION_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(7),
    PAYMENT_WEBHOOK_SECRET: z.string().min(8).optional(),
    PAYMENT_SANDBOX_ENABLED: z.enum(["true", "false"]).optional(),
    NOTIFICATION_WEBHOOK_URL: z.string().url().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.STORAGE_DRIVER === "database" && !data.DATABASE_URL) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["DATABASE_URL"],
        message: "DATABASE_URL is required when STORAGE_DRIVER=database",
      });
    }
    if (data.NODE_ENV === "production" && !data.PAYMENT_WEBHOOK_SECRET) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["PAYMENT_WEBHOOK_SECRET"],
        message: "PAYMENT_WEBHOOK_SECRET is required in production",
      });
    }
  });

export interface ApiEnv {
  port: number;
  corsOrigins: string[];
  nodeEnv: "development" | "test" | "production";
  storageDriver: StorageDriver;
  databaseUrl?: string;
  sessionTtlDays: number;
  paymentWebhookSecret: string;
  paymentSandboxEnabled: boolean;
  notificationWebhookUrl?: string;
}

function toVercelOrigin(rawHost: string | undefined): string | undefined {
  const trimmed = rawHost?.trim();
  if (!trimmed) return undefined;
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    return new URL(withProtocol).origin;
  } catch {
    return undefined;
  }
}

export function loadApiEnv(rawEnv: Record<string, string | undefined> = process.env): ApiEnv {
  const parsed = ApiEnvSchema.safeParse({
    PORT: rawEnv.PORT || undefined,
    CORS_ORIGINS: rawEnv.CORS_ORIGINS || undefined,
    NODE_ENV: rawEnv.NODE_ENV || undefined,
    STORAGE_DRIVER: rawEnv.STORAGE_DRIVER || undefined,
    DATABASE_URL: rawEnv.DATABASE_URL || undefined,
    SESSION_TTL_DAYS: rawEnv.SESSION_TTL_DAYS || undefined,
    PAYMENT_WEBHOOK_SECRET: rawEnv.PAYMENT_WEBHOOK_SECRET || undefined,
    PAYMENT_SANDBOX_ENABLED: rawEnv.PAYMENT_SANDBOX_ENABLED || undefined,
    NOTIFICATION_WEBHOOK_URL: rawEnv.NOTIFICATION_WEBHOOK_URL || undefined,
  });

  if (!parsed.success) {
    const details = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Invalid @luxestay/api environment configuration: ${details}`);
  }

  const configuredOrigins = parsed.data.CORS_ORIGINS.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  const vercelOrigins = [
    toVercelOrigin(rawEnv.VERCEL_URL),
    toVercelOrigin(rawEnv.VERCEL_BRANCH_URL),
    toVercelOrigin(rawEnv.VERCEL_PROJECT_PRODUCTION_URL),
  ].filter((origin): origin is string => Boolean(origin));

  const corsOrigins = [...new Set([...configuredOrigins, ...vercelOrigins])];

  const paymentSandboxEnabled =
    parsed.data.PAYMENT_SANDBOX_ENABLED !== undefined
      ? parsed.data.PAYMENT_SANDBOX_ENABLED === "true"
      : parsed.data.NODE_ENV !== "production";

  return {
    port: parsed.data.PORT,
    corsOrigins: corsOrigins.length > 0 ? corsOrigins : ["http://localhost:3000"],
    nodeEnv: parsed.data.NODE_ENV,
    storageDriver: parsed.data.STORAGE_DRIVER,
    databaseUrl: parsed.data.DATABASE_URL,
    sessionTtlDays: parsed.data.SESSION_TTL_DAYS,
    paymentWebhookSecret:
      parsed.data.PAYMENT_WEBHOOK_SECRET ?? "luxestay-dev-webhook-secret-change-in-prod",
    paymentSandboxEnabled,
    notificationWebhookUrl: parsed.data.NOTIFICATION_WEBHOOK_URL,
  };
}
