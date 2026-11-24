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
  })
  .superRefine((data, ctx) => {
    if (data.STORAGE_DRIVER === "database" && !data.DATABASE_URL) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["DATABASE_URL"],
        message: "DATABASE_URL is required when STORAGE_DRIVER=database",
      });
    }
  });

export interface ApiEnv {
  port: number;
  corsOrigins: string[];
  nodeEnv: "development" | "test" | "production";
  storageDriver: StorageDriver;
  databaseUrl?: string;
}

export function loadApiEnv(rawEnv: Record<string, string | undefined> = process.env): ApiEnv {
  const parsed = ApiEnvSchema.safeParse({
    PORT: rawEnv.PORT || undefined,
    CORS_ORIGINS: rawEnv.CORS_ORIGINS || undefined,
    NODE_ENV: rawEnv.NODE_ENV || undefined,
    STORAGE_DRIVER: rawEnv.STORAGE_DRIVER || undefined,
    DATABASE_URL: rawEnv.DATABASE_URL || undefined,
  });

  if (!parsed.success) {
    const details = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Invalid @luxestay/api environment configuration: ${details}`);
  }

  const corsOrigins = parsed.data.CORS_ORIGINS.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return {
    port: parsed.data.PORT,
    corsOrigins: corsOrigins.length > 0 ? corsOrigins : ["http://localhost:3000"],
    nodeEnv: parsed.data.NODE_ENV,
    storageDriver: parsed.data.STORAGE_DRIVER,
    databaseUrl: parsed.data.DATABASE_URL,
  };
}
