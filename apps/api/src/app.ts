import { Hono } from "hono";
import { cors } from "hono/cors";
import { createAuthSessionMiddleware } from "./middleware/auth.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { requestIdMiddleware } from "./middleware/requestId.js";
import {
  createInMemoryActivitiesRepository,
  type ApiActivitiesRepository,
} from "./modules/activities/repository.js";
import { createActivitiesRoutes } from "./modules/activities/routes.js";
import { createActivitiesService } from "./modules/activities/service.js";
import {
  createInMemoryAuthRepository,
  type ApiAuthRepository,
} from "./modules/auth/repository.js";
import { createAuthRoutes } from "./modules/auth/routes.js";
import { createAuthService } from "./modules/auth/service.js";
import {
  createInMemoryAvailabilityRepository,
  type ApiAvailabilityRepository,
} from "./modules/availability/repository.js";
import { createAvailabilityRoutes } from "./modules/availability/routes.js";
import { createAvailabilityService } from "./modules/availability/service.js";
import {
  createSeedCatalogRepository,
  type ApiCatalogRepository,
} from "./modules/catalog/repository.js";
import { createCatalogRoutes } from "./modules/catalog/routes.js";
import { createCatalogService } from "./modules/catalog/service.js";
import {
  createInMemoryDealsRepository,
  type ApiDealsRepository,
} from "./modules/deals/repository.js";
import { createDealsRoutes } from "./modules/deals/routes.js";
import { createDealsService } from "./modules/deals/service.js";
import {
  createInMemoryFavoritesRepository,
  type ApiFavoritesRepository,
} from "./modules/favorites/repository.js";
import { createFavoritesRoutes } from "./modules/favorites/routes.js";
import { createFavoritesService } from "./modules/favorites/service.js";
import { createHealthRoutes } from "./modules/health/routes.js";
import { createHostRoutes } from "./modules/host/routes.js";
import { createHostService } from "./modules/host/service.js";
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
import {
  createInMemoryReviewRepository,
  type ApiReviewRepository,
} from "./modules/reviews/repository.js";
import { createReviewRoutes } from "./modules/reviews/routes.js";
import { createReviewService } from "./modules/reviews/service.js";
import type { ApiEnvBindings } from "./types.js";

export interface CreateApiAppOptions {
  corsOrigins?: string[];
  nodeEnv?: "development" | "test" | "production";
  sessionTtlDays?: number;
  paymentWebhookSecret?: string;
  paymentSandboxEnabled?: boolean;
  notificationWebhookUrl?: string;
  catalogRepository?: ApiCatalogRepository;
  dealsRepository?: ApiDealsRepository;
  activitiesRepository?: ApiActivitiesRepository;
  availabilityRepository?: ApiAvailabilityRepository;
  reservationRepository?: ApiReservationRepository;
  reviewRepository?: ApiReviewRepository;
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
  const dealsRepository = options?.dealsRepository ?? createInMemoryDealsRepository();
  const activitiesRepository =
    options?.activitiesRepository ?? createInMemoryActivitiesRepository();
  const availabilityRepository =
    options?.availabilityRepository ?? createInMemoryAvailabilityRepository();
  const reservationRepository =
    options?.reservationRepository ??
    createInMemoryReservationRepository({ availabilityRepository });
  const reviewRepository =
    options?.reviewRepository ?? createInMemoryReviewRepository({ catalogRepository });
  const authRepository = options?.authRepository ?? createInMemoryAuthRepository();
  const favoritesRepository =
    options?.favoritesRepository ?? createInMemoryFavoritesRepository();
  const paymentRepository = options?.paymentRepository ?? createInMemoryPaymentRepository();
  const notificationRepository =
    options?.notificationRepository ?? createInMemoryNotificationRepository();

  const catalogService = createCatalogService(catalogRepository);
  const dealsService = createDealsService({
    dealsRepository,
    catalogRepository,
  });
  const activitiesService = createActivitiesService({
    activitiesRepository,
    catalogRepository,
    reservationRepository,
  });
  const availabilityService = createAvailabilityService({
    catalogRepository,
    availabilityRepository,
    reservationRepository,
  });
  const reviewService = createReviewService({
    catalogRepository,
    reservationRepository,
    reviewRepository,
  });
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
    activitiesRepository,
    paymentRepository,
    paymentService,
    notificationService,
    sandboxEnabled: paymentSandboxEnabled,
  });
  const hostService = createHostService({
    catalogRepository,
    availabilityRepository,
    availabilityService,
    reservationRepository,
  });

  const app = new Hono<ApiEnvBindings>();

  app.use("*", requestIdMiddleware);
  app.use(
    "*",
    cors({
      origin: (origin, c) => {
        if (!origin) return corsOrigins[0] ?? "http://localhost:3000";
        if (corsOrigins.includes("*") || corsOrigins.includes(origin)) {
          return origin;
        }
        try {
          const reqUrl = new URL(c.req.url);
          const forwardedHost = c.req.header("x-forwarded-host") ?? c.req.header("host");
          const forwardedProto =
            c.req.header("x-forwarded-proto") ?? reqUrl.protocol.replace(/:$/, "");
          const requestOrigin = forwardedHost
            ? `${forwardedProto}://${forwardedHost}`
            : reqUrl.origin;
          if (origin === requestOrigin || origin === reqUrl.origin) {
            return origin;
          }
        } catch {
          // Ignore malformed request URL and fall back to strict deny
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
  app.route("/", createCatalogRoutes(catalogService, { reservationRepository }));
  app.route("/", createDealsRoutes(dealsService));
  app.route("/", createActivitiesRoutes(activitiesService));
  app.route("/", createAvailabilityRoutes(availabilityService));
  app.route("/", createReviewRoutes(reviewService));
  app.route("/", createHostRoutes(hostService));
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
      deals: dealsRepository,
      activities: activitiesRepository,
      availability: availabilityRepository,
      reservations: reservationRepository,
      reviews: reviewRepository,
      auth: authRepository,
      favorites: favoritesRepository,
      payments: paymentRepository,
      notifications: notificationRepository,
    },
  };
}
