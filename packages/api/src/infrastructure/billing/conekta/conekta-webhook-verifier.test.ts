import { generateKeyPairSync, sign } from "node:crypto";
import { verifyConektaWebhook } from "@aqui-suena/api/infrastructure/billing/conekta/conekta-webhook-verifier";
import { describe, expect, it } from "vitest";

const { publicKey, privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const publicKeyPem = publicKey.export({ type: "spki", format: "pem" }).toString();
const body = JSON.stringify({ id: "evt-1", type: "order.paid", data: { object: {} } });
const digest = sign("sha256", Buffer.from(body), privateKey).toString("base64");

describe("verifyConektaWebhook", () => {
  it("accepts a valid RSA-SHA256 signature", async () => {
    expect(await verifyConektaWebhook(body, digest, publicKeyPem)).toBe(true);
  });

  it("rejects a tampered body", async () => {
    expect(await verifyConektaWebhook(`${body} `, digest, publicKeyPem)).toBe(false);
  });

  it("rejects a tampered digest", async () => {
    const tampered = Buffer.from(digest, "base64");
    tampered[0] = (tampered[0] ?? 0) ^ 0xff;

    expect(await verifyConektaWebhook(body, tampered.toString("base64"), publicKeyPem)).toBe(false);
  });

  it("rejects an empty digest", async () => {
    expect(await verifyConektaWebhook(body, "", publicKeyPem)).toBe(false);
  });

  it("rejects a malformed public key", async () => {
    expect(await verifyConektaWebhook(body, digest, "not-a-pem")).toBe(false);
  });
});
