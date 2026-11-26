import { createApiApp, type CreateApiAppOptions } from "./app.js";
import { loadApiEnv, type ApiEnv } from "./config/env.js";
import { createDbClient, type DbClientHandle } from "./db/client.js";
import { createPostgresActivitiesRepository } from "./modules/activities/postgresRepository.js";
import { createPostgresAuthRepository } from "./modules/auth/postgresRepository.js";
import { createPostgresAvailabilityRepository } from "./modules/availability/postgresRepository.js";
import { createPostgresCatalogRepository } from "./modules/catalog/postgresRepository.js";
import { createPostgresDealsRepository } from "./modules/deals/postgresRepository.js";
import { createPostgresFavoritesRepository } from "./modules/favorites/postgresRepository.js";
import { createPostgresNotificationRepository } from "./modules/notifications/postgresRepository.js";
import { createPostgresPaymentRepository } from "./modules/payments/postgresRepository.js";
import { createPostgresReservationRepository } from "./modules/reservations/postgresRepository.js";
import { createPostgresReviewRepository } from "./modules/reviews/postgresRepository.js";

export interface ApiRuntime {
  env: ApiEnv;
  app: ReturnType<typeof createApiApp>["app"];
  dbClient?: DbClientHandle;
  close(): Promise<void>;
}

export function createApiRuntime(
  rawEnv: Record<string, string | undefined> = process.env
): ApiRuntime {
  const env = loadApiEnv(rawEnv);

  let dbClient: DbClientHandle | undefined;
  let appOptions: CreateApiAppOptions = {
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
      dealsRepository: createPostgresDealsRepository(dbClient.db),
      activitiesRepository: createPostgresActivitiesRepository(dbClient.db),
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

  return {
    env,
    app,
    dbClient,
    async close() {
      if (dbClient) {
        await dbClient.close();
      }
    },
  };
}

let cachedRuntime: ApiRuntime | null = null;

/**
 * Lazily initializes and caches the API runtime per Fluid Compute instance.
 * Safe to import during build-time static analysis even before runtime env vars are bound.
 */
export function getApiRuntime(
  rawEnv: Record<string, string | undefined> = process.env
): ApiRuntime {
  if (!cachedRuntime) {
    cachedRuntime = createApiRuntime(rawEnv);
  }
  return cachedRuntime;
}

export async function resetApiRuntimeForTests(): Promise<void> {
  if (cachedRuntime) {
    const previous = cachedRuntime;
    cachedRuntime = null;
    await previous.close();
  }
}
