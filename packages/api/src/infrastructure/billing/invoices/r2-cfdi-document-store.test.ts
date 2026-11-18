import { R2CfdiXmlStore } from "@aqui-suena/api/infrastructure/billing/invoices/r2-cfdi-xml-store";
import type { R2StorageOptions } from "@aqui-suena/api/infrastructure/r2/sigv4";
import { describe, expect, it } from "vitest";

const r2: R2StorageOptions = {
  accountId: "acc-1",
  accessKeyId: "access-key",
  secretAccessKey: "secret-key",
  bucketName: "aqui-suena-media",
  endpoint: "https://r2.example.test",
};

describe("R2CfdiXmlStore", () => {
  it("uploads the XML under an account-scoped key and returns it", async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const fakeFetch: typeof fetch = async (input, init) => {
      calls.push({ url: String(input), init: init ?? {} });

      return new Response(null, { status: 200 });
    };

    const store = new R2CfdiXmlStore({ r2, fetch: fakeFetch });

    const key = await store.save({ accountId: "acc-1", xml: "<cfdi:Comprobante/>" });

    expect(key).toMatch(/^cfdi\/acc-1\/[0-9a-f-]{36}\.xml$/);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toContain(`/${key}`);
    expect(calls[0]?.url).toContain("X-Amz-Signature=");
    expect(calls[0]?.init.method).toBe("PUT");
    expect(calls[0]?.init.body).toBe("<cfdi:Comprobante/>");
    expect(calls[0]?.init.headers).toMatchObject({ "Content-Type": "application/xml" });
  });

  it("throws with the HTTP status when the upload fails", async () => {
    const fakeFetch: typeof fetch = async () => new Response(null, { status: 403 });

    const store = new R2CfdiXmlStore({ r2, fetch: fakeFetch });

    await expect(store.save({ accountId: "acc-1", xml: "<cfdi/>" })).rejects.toThrow(
      /R2 cfdi upload failed: 403/,
    );
  });
});
