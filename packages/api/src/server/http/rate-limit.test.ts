import { createApp } from "@aqui-suena/api/server/http/app";
import { isRateLimited, rateLimitKey } from "@aqui-suena/api/server/http/rate-limit";
import { describe, expect, it } from "vitest";

describe("rateLimitKey", () => {
  it("keys on the client IP", () => {
    expect(rateLimitKey("1.2.3.4")).toBe("1.2.3.4");
  });

  it("falls back to a shared bucket when the IP is missing", () => {
    expect(rateLimitKey(undefined)).toBe("unknown");
  });
});

describe("rate limiting middleware", () => {
  it("returns 429 when the limiter refuses the request", async () => {
    const app = createApp({
      allowedOrigins: [],
      logRequests: false,
      rateLimiter: { limit: async () => ({ success: false }) },
    });

    const response = await app.request("https://api.test/health", {
      headers: { "cf-connecting-ip": "1.2.3.4" },
    });

    expect(response.status).toBe(429);
  });

  it("passes through when the limiter allows the request", async () => {
    const app = createApp({
      allowedOrigins: [],
      logRequests: false,
      rateLimiter: { limit: async () => ({ success: true }) },
    });

    const response = await app.request("https://api.test/health");

    expect(response.status).toBe(200);
  });

  it("does not rate limit when no limiter is wired", async () => {
    const app = createApp({ allowedOrigins: [], logRequests: false });

    const response = await app.request("https://api.test/health");

    expect(response.status).toBe(200);
  });
});

describe("isRateLimited", () => {
  it("is false when no limiter is wired", async () => {
    expect(await isRateLimited(undefined, new Request("https://api.test/"))).toBe(false);
  });

  it("is true when the limiter refuses", async () => {
    const limiter = { limit: async () => ({ success: false }) };
    expect(await isRateLimited(limiter, new Request("https://api.test/"))).toBe(true);
  });

  it("is false when the limiter allows", async () => {
    const limiter = { limit: async () => ({ success: true }) };
    expect(await isRateLimited(limiter, new Request("https://api.test/"))).toBe(false);
  });
});
