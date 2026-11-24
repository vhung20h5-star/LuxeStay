import { Hono } from "hono";
import { cors } from "hono/cors";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { requestIdMiddleware } from "./middleware/requestId.js";
import {
  createSeedCatalogRepository,
  type ApiCatalogRepository,
} from "./modules/catalog/repository.js";
import { createCatalogRoutes } from "./modules/catalog/routes.js";
import { createCatalogService } from "./modules/catalog/service.js";
import { createHealthRoutes } from "./modules/health/routes.js";
import {
  createInMemoryReservationRepository,
  type ApiReservationRepository,
} from "./modules/reservations/repository.js";
import { createReservationRoutes } from "./modules/reservations/routes.js";
import { createReservationService } from "./modules/reservations/service.js";
import type { ApiEnvBindings } from "./types.js";

export interface CreateApiAppOptions {
  corsOrigins?: string[];
  catalogRepository?: ApiCatalogRepository;
  reservationRepository?: ApiReservationRepository;
}

export function createApiApp(options?: CreateApiAppOptions) {
  const corsOrigins = options?.corsOrigins ?? ["http://localhost:3000"];
  const catalogRepository = options?.catalogRepository ?? createSeedCatalogRepository();
  const reservationRepository =
    options?.reservationRepository ?? createInMemoryReservationRepository();

  const catalogService = createCatalogService(catalogRepository);
  const reservationService = createReservationService({
    catalogRepository,
    reservationRepository,
  });

  const app = new Hono<ApiEnvBindings>();

  app.use("*", requestIdMiddleware);
  app.use(
    "*",
    cors({
      origin: (origin) => {
        if (!origin) return corsOrigins[0] ?? "*";
        if (corsOrigins.includes("*") || corsOrigins.includes(origin)) {
          return origin;
        }
        return "";
      },
      allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowHeaders: ["Content-Type", "Authorization", "X-Request-Id"],
      exposeHeaders: ["x-request-id"],
    })
  );

  app.route("/", createHealthRoutes());
  app.route("/", createCatalogRoutes(catalogService));
  app.route("/", createReservationRoutes(reservationService));

  app.notFound(notFoundHandler);
  app.onError(errorHandler);

  return {
    app,
    repositories: {
      catalog: catalogRepository,
      reservations: reservationRepository,
    },
  };
}
