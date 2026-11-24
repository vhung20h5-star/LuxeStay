import { Hono } from "hono";
import { cors } from "hono/cors";
import { createAuthSessionMiddleware } from "./middleware/auth.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { requestIdMiddleware } from "./middleware/requestId.js";
import {
  createInMemoryAuthRepository,
  type ApiAuthRepository,
} from "./modules/auth/repository.js";
import { createAuthRoutes } from "./modules/auth/routes.js";
import { createAuthService } from "./modules/auth/service.js";
import {
  createSeedCatalogRepository,
  type ApiCatalogRepository,
} from "./modules/catalog/repository.js";
import { createCatalogRoutes } from "./modules/catalog/routes.js";
import { createCatalogService } from "./modules/catalog/service.js";
import {
  createInMemoryFavoritesRepository,
  type ApiFavoritesRepository,
} from "./modules/favorites/repository.js";
import { createFavoritesRoutes } from "./modules/favorites/routes.js";
import { createFavoritesService } from "./modules/favorites/service.js";
import { createHealthRoutes } from "./modules/health/routes.js";
import {
  createInMemoryNotificationRepository,
  type ApiNotificationRepository,
} from "./modules/notifications/repository.js";
import { createNotificationService } from "./modules/notifications/service.js";
import {
  createInMemoryPaymentRepository,
  type ApiPaymentRepository,
} from "./modules/payments/repository.js";
import { createPaymentRoutes } from "./modules/payments/routes.js";
import { createPaymentService } from "./modules/payments/service.js";
import {
  createInMemoryReservationRepository,
  type ApiReservationRepository,
} from "./modules/reservations/repository.js";
import { createReservationRoutes } from "./modules/reservations/routes.js";
import { createReservationService } from "./modules/reservations/service.js";
import type { ApiEnvBindings } from "./types.js";

export interface CreateApiAppOptions {
  corsOrigins?: string[];
  nodeEnv?: "development" | "test" | "production";
  sessionTtlDays?: number;
  paymentWebhookSecret?: string;
  paymentSandboxEnabled?: boolean;
  notificationWebhookUrl?: string;
  catalogRepository?: ApiCatalogRepository;
  reservationRepository?: ApiReservationRepository;
  authRepository?: ApiAuthRepository;
  favoritesRepository?: ApiFavoritesRepository;
  paymentRepository?: ApiPaymentRepository;
  notificationRepository?: ApiNotificationRepository;
}

export function createApiApp(options?: CreateApiAppOptions) {
  const corsOrigins = options?.corsOrigins ?? ["http://localhost:3000"];
  const nodeEnv = options?.nodeEnv ?? "development";
  const sessionTtlDays = options?.sessionTtlDays ?? 7;
  const paymentWebhookSecret =
    options?.paymentWebhookSecret ?? "luxestay-dev-webhook-secret-change-in-prod";
  const paymentSandboxEnabled = options?.paymentSandboxEnabled ?? nodeEnv !== "production";

  const catalogRepository = options?.catalogRepository ?? createSeedCatalogRepository();
  const reservationRepository =
    options?.reservationRepository ?? createInMemoryReservationRepository();
  const authRepository = options?.authRepository ?? createInMemoryAuthRepository();
  const favoritesRepository =
    options?.favoritesRepository ?? createInMemoryFavoritesRepository();
  const paymentRepository = options?.paymentRepository ?? createInMemoryPaymentRepository();
  const notificationRepository =
    options?.notificationRepository ?? createInMemoryNotificationRepository();

  const catalogService = createCatalogService(catalogRepository);
  const authService = createAuthService({
    authRepository,
    sessionTtlDays,
    exposeDevOtpCode: nodeEnv !== "production",
  });
  const favoritesService = createFavoritesService({
    catalogRepository,
    favoritesRepository,
  });
  const notificationService = createNotificationService({
    notificationRepository,
    webhookUrl: options?.notificationWebhookUrl,
  });
  const paymentService = createPaymentService({
    paymentRepository,
    reservationRepository,
    notificationService,
    webhookSecret: paymentWebhookSecret,
    sandboxEnabled: paymentSandboxEnabled,
  });
  const reservationService = createReservationService({
    catalogRepository,
    reservationRepository,
    paymentRepository,
    paymentService,
    notificationService,
  });

  const app = new Hono<ApiEnvBindings>();

  app.use("*", requestIdMiddleware);
  app.use(
    "*",
    cors({
      origin: (origin) => {
        if (!origin) return corsOrigins[0] ?? "http://localhost:3000";
        if (corsOrigins.includes("*") || corsOrigins.includes(origin)) {
          return origin;
        }
        return "";
      },
      credentials: true,
      allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowHeaders: [
        "Content-Type",
        "Authorization",
        "X-Request-Id",
        "X-LuxeStay-Signature",
      ],
      exposeHeaders: ["x-request-id"],
    })
  );
  app.use("*", createAuthSessionMiddleware(authService));

  app.route("/", createHealthRoutes());
  app.route("/", createCatalogRoutes(catalogService));
  app.route(
    "/",
    createAuthRoutes(authService, {
      sessionTtlDays,
      secureCookie: nodeEnv === "production",
    })
  );
  app.route("/", createFavoritesRoutes(favoritesService));
  app.route("/", createReservationRoutes(reservationService));
  app.route("/", createPaymentRoutes(paymentService));

  app.notFound(notFoundHandler);
  app.onError(errorHandler);

  return {
    app,
    webhookSecret: paymentWebhookSecret,
    repositories: {
      catalog: catalogRepository,
      reservations: reservationRepository,
      auth: authRepository,
      favorites: favoritesRepository,
      payments: paymentRepository,
      notifications: notificationRepository,
    },
  };
}
