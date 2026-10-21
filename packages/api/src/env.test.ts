import { describe, expect, it } from "vitest";
import { DEFAULT_ALLOWED_ORIGINS } from "./cors";
import { parseAllowedOrigins, readConfig } from "./env";

describe("parseAllowedOrigins", () => {
  it("falls back to the three platform origins when the variable is absent", () => {
    expect(parseAllowedOrigins(undefined)).toEqual(DEFAULT_ALLOWED_ORIGINS);
  });

  it("treats an empty variable as absent", () => {
    expect(parseAllowedOrigins("   ")).toEqual(DEFAULT_ALLOWED_ORIGINS);
  });

  it("splits on commas, trims and dedupes", () => {
    expect(
      parseAllowedOrigins(
        " https://aqui-suena.app , https://admin.aqui-suena.app ,https://aqui-suena.app ",
      ),
    ).toEqual(["https://aqui-suena.app", "https://admin.aqui-suena.app"]);
  });
});

describe("readConfig", () => {
  it("defaults to port 3001 on every interface", () => {
    expect(readConfig({})).toEqual({
      port: 3001,
      host: "0.0.0.0",
      allowedOrigins: DEFAULT_ALLOWED_ORIGINS,
    });
  });

  it("reads PORT, HOST and ALLOWED_ORIGINS from the environment", () => {
    expect(
      readConfig({
        PORT: "8080",
        HOST: "127.0.0.1",
        ALLOWED_ORIGINS: "https://aqui-suena.app",
      }),
    ).toEqual({
      port: 8080,
      host: "127.0.0.1",
      allowedOrigins: ["https://aqui-suena.app"],
    });
  });

  it("rejects a PORT that is not a valid TCP port", () => {
    expect(() => readConfig({ PORT: "not-a-port" })).toThrow(/PORT/);
    expect(() => readConfig({ PORT: "70000" })).toThrow(/PORT/);
  });
});
