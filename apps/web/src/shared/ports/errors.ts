import type { ErrorCode } from "@luxestay/contracts";

export class HttpApiError extends Error {
  readonly status: number;
  readonly code: ErrorCode;
  readonly details?: unknown;
  readonly requestId?: string;

  constructor(options: {
    status: number;
    code: ErrorCode;
    message: string;
    details?: unknown;
    requestId?: string;
  }) {
    super(options.message);
    this.name = "HttpApiError";
    this.status = options.status;
    this.code = options.code;
    this.details = options.details;
    this.requestId = options.requestId;
  }
}

export function isAbortError(err: unknown): boolean {
  return err instanceof Error && err.name === "AbortError";
}
