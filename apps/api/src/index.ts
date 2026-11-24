import { serve } from "@hono/node-server";
import { createApiApp } from "./app.js";
import { loadApiEnv } from "./config/env.js";
import { createDbClient, type DbClientHandle } from "./db/client.js";
import { createPostgresCatalogRepository } from "./modules/catalog/postgresRepository.js";
import { createPostgresReservationRepository } from "./modules/reservations/postgresRepository.js";

const env = loadApiEnv();

let dbClient: DbClientHandle | undefined;
let appOptions: Parameters<typeof createApiApp>[0] = {
  corsOrigins: env.corsOrigins,
};

if (env.storageDriver === "database") {
  if (!env.databaseUrl) {
    throw new Error("DATABASE_URL is required when STORAGE_DRIVER=database.");
  }
  dbClient = createDbClient(env.databaseUrl);
  const catalogRepository = createPostgresCatalogRepository(dbClient.db);
  const reservationRepository = createPostgresReservationRepository({
    db: dbClient.db,
    catalogRepository,
  });
  appOptions = {
    corsOrigins: env.corsOrigins,
    catalogRepository,
    reservationRepository,
  };
}

const { app } = createApiApp(appOptions);

const server = serve(
  {
    fetch: app.fetch,
    port: env.port,
  },
  (info) => {
    console.log(
      `[luxestay-api] Listening on http://localhost:${info.port} (env=${env.nodeEnv}, storage=${env.storageDriver}, cors=${env.corsOrigins.join(",")})`
    );
  }
);

async function shutdown(signal: string) {
  console.log(`[luxestay-api] Received ${signal}, shutting down cleanly...`);
  server.close();
  if (dbClient) {
    await dbClient.close();
  }
  process.exit(0);
}

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});
process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});
