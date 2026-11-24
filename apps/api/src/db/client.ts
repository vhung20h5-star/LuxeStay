import { attachDatabasePool } from "@vercel/functions";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import type { ApiEnv, StorageDriver } from "../config/env.js";
import * as schema from "./schema/index.js";

export type LuxeStayDb = NodePgDatabase<typeof schema>;

export interface DatabaseConfig {
  driver: StorageDriver;
  databaseUrl?: string;
}

export interface DbClientHandle {
  db: LuxeStayDb;
  pool: Pool;
  close(): Promise<void>;
}

export function resolveDatabaseConfig(
  env: Pick<ApiEnv, "storageDriver" | "databaseUrl">
): DatabaseConfig {
  return {
    driver: env.storageDriver,
    databaseUrl: env.databaseUrl,
  };
}

export function createDbClient(databaseUrl: string): DbClientHandle {
  const isVercel = Boolean(process.env.VERCEL);
  const pool = new Pool({
    connectionString: databaseUrl,
    max: isVercel ? 5 : 10,
    idleTimeoutMillis: 20_000,
    connectionTimeoutMillis: 10_000,
  });

  if (isVercel) {
    attachDatabasePool(pool);
  }

  const db = drizzle(pool, { schema });

  return {
    db,
    pool,
    async close() {
      await pool.end();
    },
  };
}
