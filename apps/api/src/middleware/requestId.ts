import { randomUUID } from "node:crypto";
import type { MiddlewareHandler } from "hono";
import type { ApiEnvBindings } from "../types.js";

export const requestIdMiddleware: MiddlewareHandler<ApiEnvBindings> = async (c, next) => {
  const incoming = c.req.header("x-request-id")?.trim();
  const requestId = incoming || randomUUID();
  c.set("requestId", requestId);
  await next();
  c.header("x-request-id", requestId);
};
