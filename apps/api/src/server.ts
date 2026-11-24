import { Hono } from "hono";
import { getApiRuntime } from "./runtime.js";

/**
 * Vercel Functions (Fluid Compute) Hono entrypoint.
 * Delegates lazily so importing this module at build time never requires runtime DB/secrets.
 */
const app = new Hono();

app.all("*", (c) => getApiRuntime().app.fetch(c.req.raw));

export default app;
