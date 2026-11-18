import { InvoiceProviderRejection } from "@aqui-suena/api/domain/billing/invoices/invoice-issuer";
import type { FacturamaFiscalSettings } from "@aqui-suena/api/infrastructure/billing/facturama/facturama-cfdi-payload";
import { FacturamaInvoiceCanceller } from "@aqui-suena/api/infrastructure/billing/facturama/facturama-invoice-canceller";
import { describe, expect, it } from "vitest";

const settings: FacturamaFiscalSettings = {
  mode: "web",
  expeditionPlace: "42501",
  ivaRate: 0.16,
  productCode: "01010101",
  unitCode: "E48",
};

function setup(fakeFetch: typeof fetch, mode: "web" | "multiemisor" = "web") {
  return new FacturamaInvoiceCanceller({
    credentials: {
      user: "facturama-user",
      password: "s3cr3t",
      baseUrl: "https://apisandbox.facturama.mx",
    },
    fiscal: { ...settings, mode },
    fetch: fakeFetch,
  });
}

describe("FacturamaInvoiceCanceller.cancel", () => {
  it("requests cancellation with the motive and maps a cancelled answer", async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];

    const fakeFetch: typeof fetch = async (input, init) => {
      calls.push({ url: String(input), init: init ?? {} });

      return new Response(
        JSON.stringify({
          Status: "canceled",
          Uuid: "0F1B9C7A-3C4D-4E5F-8A9B-0C1D2E3F4A5B",
          RequestDate: "2026-11-18T14:59:41",
          ResponseDate: "2026-11-18T14:59:45",
          AcuseXmlBase64: btoa("<?xml version='1.0'?><Acuse/>"),
        }),
        { status: 200 },
      );
    };

    const result = await setup(fakeFetch).cancel({ providerId: "fac-1", motive: "03" });

    expect(calls[0]?.url).toBe("https://apisandbox.facturama.mx/cfdi/fac-1?type=issued&motive=03");
    expect(calls[0]?.init.method).toBe("DELETE");
    expect(calls[0]?.init.headers).toMatchObject({
      Authorization: `Basic ${btoa("facturama-user:s3cr3t")}`,
    });
    expect(result).toMatchObject({
      outcome: "cancelled",
      providerStatus: "canceled",
      acuseXml: "<?xml version='1.0'?><Acuse/>",
    });
    expect(result.resolvedAt?.toISOString()).toBe("2026-11-18T20:59:45.000Z");
  });

  it("uses the multiemisor document type", async () => {
    const calls: string[] = [];
    const fakeFetch: typeof fetch = async (input) => {
      calls.push(String(input));

      return new Response(JSON.stringify({ Status: "pending" }), { status: 200 });
    };

    await setup(fakeFetch, "multiemisor").cancel({ providerId: "fac-2", motive: "02" });

    expect(calls[0]).toContain("/cfdi/fac-2?type=issuedLite&motive=02");
  });

  it("carries the substitute UUID for motive 01", async () => {
    const calls: string[] = [];
    const fakeFetch: typeof fetch = async (input) => {
      calls.push(String(input));

      return new Response(JSON.stringify({ Status: "pending" }), { status: 200 });
    };

    await setup(fakeFetch).cancel({
      providerId: "fac-1",
      motive: "01",
      substitutionUuid: "11111111-2222-3333-4444-555555555555",
    });

    expect(calls[0]).toContain("motive=01");
    expect(calls[0]).toContain("uuidReplacement=11111111-2222-3333-4444-555555555555");
  });

  it("maps acepted and expired to cancelled, because both cancel the CFDI", async () => {
    for (const status of ["acepted", "expired"]) {
      const fakeFetch: typeof fetch = async () =>
        new Response(JSON.stringify({ Status: status }), { status: 200 });

      const result = await setup(fakeFetch).cancel({ providerId: "fac-1", motive: "03" });

      expect(result.outcome).toBe("cancelled");
      expect(result.providerStatus).toBe(status);
    }
  });

  it("keeps a pending answer pending and reports the receiver deadline", async () => {
    const fakeFetch: typeof fetch = async () =>
      new Response(
        JSON.stringify({
          Status: "pending",
          Message: "En espera de aceptación del receptor",
          ExpirationDate: "2026-11-21T14:59:41",
        }),
        { status: 200 },
      );

    const result = await setup(fakeFetch).cancel({ providerId: "fac-1", motive: "03" });

    expect(result).toMatchObject({
      outcome: "pending",
      detail: "En espera de aceptación del receptor",
      acuseXml: null,
    });
    expect(result.expiresAt?.toISOString()).toBe("2026-11-21T20:59:41.000Z");
  });

  it("keeps a rejected answer rejected: the invoice stays valid", async () => {
    const fakeFetch: typeof fetch = async () =>
      new Response(
        JSON.stringify({ Status: "rejected", Message: "El receptor rechazó la cancelación" }),
        { status: 200 },
      );

    const result = await setup(fakeFetch).cancel({ providerId: "fac-1", motive: "03" });

    expect(result).toMatchObject({
      outcome: "rejected",
      detail: "El receptor rechazó la cancelación",
    });
  });

  it("distinguishes an uncancellable invoice from a rejected one", async () => {
    const fakeFetch: typeof fetch = async () =>
      new Response(JSON.stringify({ Status: "active", IsCancelable: "No cancelable" }), {
        status: 200,
      });

    const result = await setup(fakeFetch).cancel({ providerId: "fac-1", motive: "03" });

    expect(result.outcome).toBe("not_cancellable");
  });

  it("raises the provider message when the PAC refuses the request", async () => {
    const fakeFetch: typeof fetch = async () =>
      new Response(JSON.stringify({ Message: "El CFDI no existe" }), { status: 404 });

    const error = await setup(fakeFetch)
      .cancel({ providerId: "fac-404", motive: "03" })
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(InvoiceProviderRejection);
    expect(error).toMatchObject({ detail: "El CFDI no existe" });
  });

  it("rejects an unknown status instead of guessing", async () => {
    const fakeFetch: typeof fetch = async () =>
      new Response(JSON.stringify({ Status: "invented" }), { status: 200 });

    const error = await setup(fakeFetch)
      .cancel({ providerId: "fac-1", motive: "03" })
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(InvoiceProviderRejection);
    expect(error).toMatchObject({ detail: "Malformed response from the invoice provider" });
  });
});

describe("FacturamaInvoiceCanceller.cancellationStatus", () => {
  it("asks the same endpoint with GET and no motive", async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];

    const fakeFetch: typeof fetch = async (input, init) => {
      calls.push({ url: String(input), init: init ?? {} });

      return new Response(JSON.stringify({ Status: "expired" }), { status: 200 });
    };

    const result = await setup(fakeFetch, "multiemisor").cancellationStatus("fac-1");

    expect(calls[0]?.url).toBe("https://apisandbox.facturama.mx/cfdi/fac-1?type=issuedLite");
    expect(calls[0]?.init.method).toBe("GET");
    expect(result.outcome).toBe("cancelled");
  });
});
