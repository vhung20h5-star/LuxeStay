import { serve } from "@hono/node-server";
import { createApiApp } from "./app.js";
import { loadApiEnv } from "./config/env.js";
import { createDbClient, type DbClientHandle } from "./db/client.js";
import { createPostgresAuthRepository } from "./modules/auth/postgresRepository.js";
import { createPostgresAvailabilityRepository } from "./modules/availability/postgresRepository.js";
import { createPostgresCatalogRepository } from "./modules/catalog/postgresRepository.js";
import { createPostgresFavoritesRepository } from "./modules/favorites/postgresRepository.js";
import { createPostgresNotificationRepository } from "./modules/notifications/postgresRepository.js";
import { createPostgresPaymentRepository } from "./modules/payments/postgresRepository.js";
import { createPostgresReservationRepository } from "./modules/reservations/postgresRepository.js";
import { createPostgresReviewRepository } from "./modules/reviews/postgresRepository.js";

const env = loadApiEnv();

let dbClient: DbClientHandle | undefined;
let appOptions: Parameters<typeof createApiApp>[0] = {
  corsOrigins: env.corsOrigins,
  nodeEnv: env.nodeEnv,
  sessionTtlDays: env.sessionTtlDays,
  paymentWebhookSecret: env.paymentWebhookSecret,
  paymentSandboxEnabled: env.paymentSandboxEnabled,
  notificationWebhookUrl: env.notificationWebhookUrl,
};

if (env.storageDriver === "database") {
  if (!env.databaseUrl) {
    throw new Error("DATABASE_URL is required when STORAGE_DRIVER=database.");
  }
  dbClient = createDbClient(env.databaseUrl);
  const catalogRepository = createPostgresCatalogRepository(dbClient.db);
  const availabilityRepository = createPostgresAvailabilityRepository(dbClient.db);
  const reservationRepository = createPostgresReservationRepository({
    db: dbClient.db,
    catalogRepository,
  });
  const reviewRepository = createPostgresReviewRepository(dbClient.db);
  appOptions = {
    ...appOptions,
    catalogRepository,
    availabilityRepository,
    reservationRepository,
    reviewRepository,
    authRepository: createPostgresAuthRepository(dbClient.db),
    favoritesRepository: createPostgresFavoritesRepository(dbClient.db),
    paymentRepository: createPostgresPaymentRepository(dbClient.db),
    notificationRepository: createPostgresNotificationRepository(dbClient.db),
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
      `[luxestay-api] Listening on http://localhost:${info.port} (env=${env.nodeEnv}, storage=${env.storageDriver}, sandbox=${env.paymentSandboxEnabled}, cors=${env.corsOrigins.join(",")})`
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
