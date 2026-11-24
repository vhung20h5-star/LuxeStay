import { serve } from "@hono/node-server";
import { createApiApp } from "./app.js";
import { loadApiEnv } from "./config/env.js";
import {
  assertDatabaseDriverSupported,
  resolveDatabaseConfig,
} from "./db/client.js";

const env = loadApiEnv();
assertDatabaseDriverSupported(resolveDatabaseConfig(env));

const { app } = createApiApp({ corsOrigins: env.corsOrigins });

serve(
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
