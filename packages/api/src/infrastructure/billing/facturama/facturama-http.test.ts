import {
  decodeBase64Bytes,
  decodeBase64Text,
  readRejectionDetail,
  toBasicAuth,
  trimTrailingSlash,
} from "@aqui-suena/api/infrastructure/billing/facturama/facturama-http";
import { describe, expect, it } from "vitest";

describe("trimTrailingSlash", () => {
  it("removes one or more trailing slashes", () => {
    expect(trimTrailingSlash("https://api.facturama.mx/")).toBe("https://api.facturama.mx");
    expect(trimTrailingSlash("https://api.facturama.mx///")).toBe("https://api.facturama.mx");
  });

  it("leaves a slash-less url unchanged", () => {
    expect(trimTrailingSlash("https://api.facturama.mx")).toBe("https://api.facturama.mx");
  });
});

describe("toBasicAuth", () => {
  it("encodes credentials as a Basic auth header", () => {
    expect(toBasicAuth("user", "password")).toBe(`Basic ${btoa("user:password")}`);
  });
});

describe("decodeBase64Bytes", () => {
  it("decodes base64 into a byte array", () => {
    expect([...decodeBase64Bytes(btoa("abc"))]).toEqual([0x61, 0x62, 0x63]);
  });
});

describe("decodeBase64Text", () => {
  it("decodes base64 UTF-8 without corrupting non-ASCII characters", () => {
    const utf8 = Buffer.from("áéíñ", "utf8").toString("base64");

    expect(decodeBase64Text(utf8)).toBe("áéíñ");
  });
});

describe("readRejectionDetail", () => {
  const rejection = (body: string, status: number): Response => new Response(body, { status });

  it("returns the JSON Message when present", async () => {
    await expect(
      readRejectionDetail(rejection(JSON.stringify({ Message: "Cuenta no encontrada" }), 404)),
    ).resolves.toBe("Cuenta no encontrada");
  });

  it("falls back to the HTTP status when the body has no Message", async () => {
    await expect(
      readRejectionDetail(rejection(JSON.stringify({ Error: "otro" }), 500)),
    ).resolves.toBe("The invoice provider answered 500");
  });

  it("returns the raw body when it is not JSON", async () => {
    await expect(readRejectionDetail(rejection("plain text", 400))).resolves.toBe("plain text");
  });

  it("falls back to the status for an empty body", async () => {
    await expect(readRejectionDetail(rejection("", 502))).resolves.toBe(
      "The invoice provider answered 502",
    );
  });
});
