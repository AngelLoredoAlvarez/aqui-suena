import {
  describeError,
  requestLogging,
  resolveRequestId,
  withRequestLogging,
} from "@aqui-suena/api/server/http/observability";
import { Hono } from "hono";
import { describe, expect, it } from "vitest";

function makeLogger() {
  const info: string[] = [];
  const errors: string[] = [];

  return {
    logger: {
      log: (message: string) => info.push(message),
      error: (message: string) => errors.push(message),
    },
    info,
    errors,
  };
}

describe("resolveRequestId", () => {
  it("reuses a well-formed inbound request id", () => {
    const request = new Request("https://api.test/health", {
      headers: { "x-request-id": "req-0123456789" },
    });

    expect(resolveRequestId(request)).toBe("req-0123456789");
  });

  it("replaces a malformed inbound request id", () => {
    const request = new Request("https://api.test/health", {
      headers: { "x-request-id": "bad id with spaces" },
    });

    expect(resolveRequestId(request)).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("generates a request id when the header is missing", () => {
    expect(resolveRequestId(new Request("https://api.test/health"))).toMatch(/^[0-9a-f-]{36}$/);
  });
});

describe("describeError", () => {
  it("keeps the error name and message without a stack trace", () => {
    const described = describeError(new TypeError("boom"));

    expect(described).toBe("TypeError: boom");
    expect(described).not.toContain(" at ");
  });

  it("truncates long messages", () => {
    expect(describeError(new Error("x".repeat(400)))).toHaveLength(300);
  });
});

describe("requestLogging", () => {
  it("logs method, path, status and duration, and stamps the request id", async () => {
    const { logger, info } = makeLogger();

    const app = new Hono();

    app.use("*", requestLogging(logger));

    app.get("/health", (c) => c.json({ ok: true }));

    const response = await app.request("https://api.test/health?token=secret");

    expect(response.status).toBe(200);
    expect(response.headers.get("x-request-id")).toBeTruthy();
    expect(info).toHaveLength(1);

    const entry = JSON.parse(info[0] as string);

    expect(entry).toMatchObject({ level: "info", method: "GET", path: "/health", status: 200 });
    expect(entry.durationMs).toEqual(expect.any(Number));
    expect(info[0]).not.toContain("secret");
  });

  it("propagates a valid inbound request id to the response", async () => {
    const { logger } = makeLogger();

    const app = new Hono();

    app.use("*", requestLogging(logger));

    app.get("/health", (c) => c.json({ ok: true }));

    const response = await app.request("https://api.test/health", {
      headers: { "x-request-id": "req-abcdefgh" },
    });

    expect(response.headers.get("x-request-id")).toBe("req-abcdefgh");
  });

  it("logs a structured error and answers 500 when a handler throws", async () => {
    const { logger, errors } = makeLogger();

    const app = new Hono();

    app.use("*", requestLogging(logger));

    app.get("/boom", () => {
      throw new Error("kaboom");
    });

    const response = await app.request("https://api.test/boom");

    expect(response.status).toBe(500);
    expect(response.headers.get("x-request-id")).toBeTruthy();
    expect(errors).toHaveLength(1);

    const entry = JSON.parse(errors[0] as string);

    expect(entry).toMatchObject({ level: "error", path: "/boom", status: 500 });
    expect(entry.error).toBe("Error: kaboom");
    expect(errors[0]).not.toContain(" at ");
  });
});

describe("withRequestLogging", () => {
  it("logs the request and stamps the response", async () => {
    const { logger, info } = makeLogger();

    const handler = withRequestLogging(async () => new Response("ok"), logger);

    const response = await handler(new Request("https://worker.test/health"), undefined);

    expect(response.headers.get("x-request-id")).toBeTruthy();
    expect(info).toHaveLength(1);
    expect(JSON.parse(info[0] as string)).toMatchObject({
      level: "info",
      method: "GET",
      path: "/health",
      status: 200,
    });
  });

  it("logs and rethrows handler errors", async () => {
    const { logger, errors } = makeLogger();

    const handler = withRequestLogging(async () => {
      throw new Error("worker down");
    }, logger);

    await expect(handler(new Request("https://worker.test/admin/seed-plans"), {})).rejects.toThrow(
      "worker down",
    );

    expect(errors).toHaveLength(1);
    expect(JSON.parse(errors[0] as string)).toMatchObject({
      level: "error",
      path: "/admin/seed-plans",
      status: 500,
      error: "Error: worker down",
    });
  });
});
