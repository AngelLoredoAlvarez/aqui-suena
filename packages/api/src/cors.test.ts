import { describe, expect, it } from "vitest";
import { corsHeaders, DEFAULT_ALLOWED_ORIGINS, preflightHeaders, resolveCors } from "./cors";

describe("resolveCors", () => {
  it("allows a request without an Origin header, because React Native sends none", () => {
    expect(resolveCors(null, DEFAULT_ALLOWED_ORIGINS)).toEqual({ allowed: true, origin: null });
  });

  it("allows the Tauri custom protocol used on Linux and macOS", () => {
    expect(resolveCors("tauri://localhost", DEFAULT_ALLOWED_ORIGINS)).toEqual({
      allowed: true,
      origin: "tauri://localhost",
    });
  });

  it("allows the Tauri origin used on Windows", () => {
    expect(resolveCors("http://tauri.localhost", DEFAULT_ALLOWED_ORIGINS).allowed).toBe(true);
  });

  it("allows the web development server", () => {
    expect(resolveCors("http://localhost:3000", DEFAULT_ALLOWED_ORIGINS).allowed).toBe(true);
  });

  it("refuses an origin that is not on the list", () => {
    expect(resolveCors("http://evil.example", DEFAULT_ALLOWED_ORIGINS)).toEqual({
      allowed: false,
      origin: "http://evil.example",
    });
  });
});

describe("corsHeaders", () => {
  it("always varies on Origin so a cache never replays a foreign response", () => {
    expect(corsHeaders(null)).toEqual({ vary: "Origin" });
  });

  it("echoes the request origin instead of a wildcard", () => {
    expect(corsHeaders("tauri://localhost")).toEqual({
      vary: "Origin",
      "access-control-allow-origin": "tauri://localhost",
      "access-control-allow-methods": "GET,POST,OPTIONS",
      "access-control-allow-headers": "content-type,authorization",
    });
  });

  it("adds the preflight cache lifetime only to preflight responses", () => {
    expect(preflightHeaders("http://tauri.localhost")["access-control-max-age"]).toBe("600");
    expect(corsHeaders("http://tauri.localhost")["access-control-max-age"]).toBeUndefined();
  });
});
