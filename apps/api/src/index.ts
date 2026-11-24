import { serve } from "@hono/node-server";
import { createApiRuntime } from "./runtime.js";

const runtime = createApiRuntime();
const { env, app } = runtime;

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
  await runtime.close();
  process.exit(0);
}

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});
process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});
