import { R2CfdiDocumentStore } from "@aqui-suena/api/infrastructure/billing/invoices/r2-cfdi-document-store";
import type { R2StorageOptions } from "@aqui-suena/api/infrastructure/r2/sigv4";
import { describe, expect, it } from "vitest";

const r2: R2StorageOptions = {
  accountId: "acc-1",
  accessKeyId: "access-key",
  secretAccessKey: "secret-key",
  bucketName: "aqui-suena-media",
  endpoint: "https://r2.example.test",
};

describe("R2CfdiDocumentStore", () => {
  it("uploads the XML under an account-scoped key and returns it", async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const fakeFetch: typeof fetch = async (input, init) => {
      calls.push({ url: String(input), init: init ?? {} });

      return new Response(null, { status: 200 });
    };

    const store = new R2CfdiDocumentStore({ r2, fetch: fakeFetch });

    const key = await store.saveXml({ accountId: "acc-1", xml: "<cfdi:Comprobante/>" });

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

    const store = new R2CfdiDocumentStore({ r2, fetch: fakeFetch });

    await expect(store.saveXml({ accountId: "acc-1", xml: "<cfdi/>" })).rejects.toThrow(
      /R2 cfdi upload failed: 403/,
    );
  });

  it("uploads the PDF under its own key and content type", async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];

    const fakeFetch: typeof fetch = async (input, init) => {
      calls.push({ url: String(input), init: init ?? {} });

      return new Response(null, { status: 200 });
    };

    const store = new R2CfdiDocumentStore({ r2, fetch: fakeFetch });

    const pdf = new Uint8Array([0x25, 0x50, 0x44, 0x46]);

    const key = await store.savePdf({ accountId: "acc-1", pdf });

    expect(key).toMatch(/^cfdi\/acc-1\/[0-9a-f-]{36}\.pdf$/);
    expect(calls[0]?.url).toContain(`/${key}`);
    expect(calls[0]?.init.method).toBe("PUT");
    expect(calls[0]?.init.body).toBe(pdf);
    expect(calls[0]?.init.headers).toMatchObject({ "Content-Type": "application/pdf" });
  });

  it("throws with the HTTP status when the PDF upload fails", async () => {
    const fakeFetch: typeof fetch = async () => new Response(null, { status: 403 });

    const store = new R2CfdiDocumentStore({ r2, fetch: fakeFetch });

    await expect(
      store.savePdf({ accountId: "acc-1", pdf: new Uint8Array([0x25]) }),
    ).rejects.toThrow(/R2 cfdi upload failed: 403/);
  });
});
