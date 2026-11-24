import type { ApiEnv, StorageDriver } from "../config/env.js";

export interface DatabaseConfig {
  driver: StorageDriver;
  databaseUrl?: string;
}

export function resolveDatabaseConfig(env: Pick<ApiEnv, "storageDriver" | "databaseUrl">): DatabaseConfig {
  return {
    driver: env.storageDriver,
    databaseUrl: env.databaseUrl,
  };
}

export function assertDatabaseDriverSupported(config: DatabaseConfig): void {
  if (config.driver === "database") {
    throw new Error(
      "STORAGE_DRIVER=database requires Phase 1 DB adapter implementation in apps/api/src/db (see apps/api/src/db/README.md and docs/PLAN.md P1.1)."
    );
  }
}
