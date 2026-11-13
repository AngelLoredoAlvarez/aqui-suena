import { isAdminAuthorized } from "@aqui-suena/api/server/http/admin-auth";
import { describe, expect, it } from "vitest";

function requestWith(authorization?: string): Request {
  const headers: Record<string, string> = {};
  if (authorization !== undefined) headers.authorization = authorization;

  return new Request("https://worker.test/admin/seed-plans", { headers });
}

describe("isAdminAuthorized", () => {
  it("rejects when the admin token is not configured", () => {
    expect(isAdminAuthorized(requestWith("Bearer secret"), undefined)).toBe(false);
    expect(isAdminAuthorized(requestWith("Bearer secret"), "")).toBe(false);
  });

  it("rejects a missing or wrong authorization header", () => {
    expect(isAdminAuthorized(requestWith(), "secret")).toBe(false);
    expect(isAdminAuthorized(requestWith("Bearer wrong"), "secret")).toBe(false);
    expect(isAdminAuthorized(requestWith("secret"), "secret")).toBe(false);
  });

  it("accepts the exact bearer token", () => {
    expect(isAdminAuthorized(requestWith("Bearer secret"), "secret")).toBe(true);
  });
});
