import type { MiddlewareHandler } from "hono";

export type RequestLogEntry = {
  readonly level: "info" | "error";
  readonly requestId: string;
  readonly method: string;
  readonly path: string;
  readonly status: number;
  readonly durationMs: number;
  readonly error?: string;
};

export type RequestLogger = {
  readonly log: (message: string) => void;
  readonly error: (message: string) => void;
};

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._-]{8,128}$/;
const MAX_ERROR_LENGTH = 300;

// Reject ids that could inject newlines or broken JSON into the log line.
export function resolveRequestId(request: Request): string {
  const inbound = request.headers.get("x-request-id");

  return inbound !== null && REQUEST_ID_PATTERN.test(inbound) ? inbound : crypto.randomUUID();
}

// Stack traces leak absolute filesystem paths.
export function describeError(error: unknown): string {
  const message = error instanceof Error ? `${error.name}: ${error.message}` : "unknown error";

  return message.slice(0, MAX_ERROR_LENGTH);
}

export function logRequest(logger: RequestLogger, entry: RequestLogEntry): void {
  const line = JSON.stringify(entry);

  if (entry.level === "error") {
    logger.error(line);
    return;
  }

  logger.log(line);
}

function elapsedSince(startedAt: number): number {
  return Math.round(performance.now() - startedAt);
}

// Path only: query strings can carry tokens.
export function requestLogging(logger: RequestLogger = console): MiddlewareHandler {
  return async (c, next) => {
    const startedAt = performance.now();

    const requestId = resolveRequestId(c.req.raw);

    c.header("x-request-id", requestId);

    try {
      await next();
    } catch (error) {
      logRequest(logger, {
        level: "error",
        requestId,
        method: c.req.method,
        path: c.req.path,
        status: 500,
        durationMs: elapsedSince(startedAt),
        error: describeError(error),
      });

      return c.text("Internal Server Error", 500);
    }

    // Hono converts handler errors into a 500 exposed through `c.error`.
    if (c.error !== undefined) {
      logRequest(logger, {
        level: "error",
        requestId,
        method: c.req.method,
        path: c.req.path,
        status: c.res.status,
        durationMs: elapsedSince(startedAt),
        error: describeError(c.error),
      });

      return;
    }

    logRequest(logger, {
      level: "info",
      requestId,
      method: c.req.method,
      path: c.req.path,
      status: c.res.status,
      durationMs: elapsedSince(startedAt),
    });
  };
}

// Admin and health routes bypass createApp, so the Worker wraps its whole fetch.
export function withRequestLogging<Env>(
  handler: (request: Request, env: Env) => Promise<Response>,
  logger: RequestLogger = console,
): (request: Request, env: Env) => Promise<Response> {
  return async (request, env) => {
    const startedAt = performance.now();
    const requestId = resolveRequestId(request);
    const path = new URL(request.url).pathname;
    const log = (entry: Omit<RequestLogEntry, "requestId" | "method" | "path">) =>
      logRequest(logger, { requestId, method: request.method, path, ...entry });

    try {
      const response = await handler(request, env);
      const stamped = new Response(response.body, response);
      stamped.headers.set("x-request-id", requestId);
      log({ level: "info", status: response.status, durationMs: elapsedSince(startedAt) });

      return stamped;
    } catch (error) {
      log({
        level: "error",
        status: 500,
        durationMs: elapsedSince(startedAt),
        error: describeError(error),
      });

      throw error;
    }
  };
}
