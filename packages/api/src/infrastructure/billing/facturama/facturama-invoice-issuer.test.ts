import type { IssueInvoiceRequest } from "@aqui-suena/api/domain/billing/invoices/invoice-issuer";
import { InvoiceProviderRejection } from "@aqui-suena/api/domain/billing/invoices/invoice-issuer";
import type { FacturamaFiscalSettings } from "@aqui-suena/api/infrastructure/billing/facturama/facturama-cfdi-payload";
import { FacturamaInvoiceIssuer } from "@aqui-suena/api/infrastructure/billing/facturama/facturama-invoice-issuer";
import { describe, expect, it } from "vitest";

const settings: FacturamaFiscalSettings = {
  mode: "web",
  expeditionPlace: "42501",
  ivaRate: 0.16,
  productCode: "01010101",
  unitCode: "E48",
};

const request: IssueInvoiceRequest = {
  accountId: "acc-1",
  planId: "commerce",
  planName: "Comercios & Catálogo",
  amountCents: 9900,
  currency: "MXN",
  fiscalProfile: {
    rfc: "EKU9003173C9",
    legalName: "ESCUELA KEMPER URGATE",
    taxRegime: "601",
    taxZipCode: "42501",
    cfdiUse: "G01",
    billingEmail: "facturas@example.com",
  },
  issuedAt: new Date("2026-11-16T18:00:00Z"),
  paymentForm: "04",
};

function setup(fakeFetch: typeof fetch) {
  return new FacturamaInvoiceIssuer({
    credentials: {
      user: "facturama-user",
      password: "s3cr3t",
      baseUrl: "https://apisandbox.facturama.mx",
    },
    fiscal: settings,
    fetch: fakeFetch,
  });
}

describe("FacturamaInvoiceIssuer", () => {
  it("posts the CFDI payload with basic auth and maps the stamped response", async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];

    const fakeFetch: typeof fetch = async (input, init) => {
      calls.push({ url: String(input), init: init ?? {} });

      return new Response(
        JSON.stringify({
          Id: "fac-1",
          ContentBase64: btoa("<cfdi:Comprobante/>"),
          Complement: { TaxStamp: { Uuid: "0F1B9C7A-3C4D-4E5F-8A9B-0C1D2E3F4A5B" } },
        }),
        { status: 200 },
      );
    };

    const issued = await setup(fakeFetch).issue(request);

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://apisandbox.facturama.mx/3/cfdis");
    expect(calls[0]?.init.method).toBe("POST");
    expect(calls[0]?.init.headers).toMatchObject({
      Authorization: `Basic ${btoa("facturama-user:s3cr3t")}`,
      "Content-Type": "application/json",
    });
    expect(JSON.parse(String(calls[0]?.init.body))).toMatchObject({
      CfdiType: "I",
      Receiver: { Rfc: "EKU9003173C9" },
    });
    expect(issued).toEqual({
      providerId: "fac-1",
      uuid: "0F1B9C7A-3C4D-4E5F-8A9B-0C1D2E3F4A5B",
      xml: "<cfdi:Comprobante/>",
    });
  });

  it("throws InvoiceProviderRejection with the provider message on a rejected stamp", async () => {
    const fakeFetch: typeof fetch = async () =>
      new Response(
        JSON.stringify({
          Message: "El RFC del receptor no se encuentra en la lista de contribuyentes",
        }),
        { status: 400 },
      );

    const error = await setup(fakeFetch)
      .issue(request)
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(InvoiceProviderRejection);
    expect(error).toMatchObject({
      detail: "El RFC del receptor no se encuentra en la lista de contribuyentes",
    });
  });

  it("throws InvoiceProviderRejection when a success response carries no fiscal UUID", async () => {
    const fakeFetch: typeof fetch = async () =>
      new Response(JSON.stringify({ Id: "fac-1", ContentBase64: btoa("<cfdi/>") }), {
        status: 200,
      });

    const error = await setup(fakeFetch)
      .issue(request)
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(InvoiceProviderRejection);
    expect(error).toMatchObject({ detail: "Malformed response from the invoice provider" });
  });

  it("posts to the multiemisor endpoint and accepts its response shape", async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const fakeFetch: typeof fetch = async (input, init) => {
      calls.push({ url: String(input), init: init ?? {} });

      return new Response(
        JSON.stringify({
          Id: "fac-2",
          XmlBase64: btoa("<cfdi:Comprobante/>"),
          TaxStamp: { Uuid: "e836bae4-fa5c-4fce-9a47-1589f4ef0035" },
        }),
        { status: 201 },
      );
    };

    const issuers = new FacturamaInvoiceIssuer({
      credentials: {
        user: "facturama-user",
        password: "s3cr3t",
        baseUrl: "https://apisandbox.facturama.mx",
      },
      fiscal: {
        ...settings,
        mode: "multiemisor",
        series: "A",
        issuer: { rfc: "EKU9003173C9", name: "ESCUELA KEMPER URGATE", fiscalRegime: "601" },
      },
      fetch: fakeFetch,
    });

    const issued = await issuers.issue(request);

    expect(calls[0]?.url).toBe("https://apisandbox.facturama.mx/api-lite/4/cfdis");
    expect(issued).toEqual({
      providerId: "fac-2",
      uuid: "e836bae4-fa5c-4fce-9a47-1589f4ef0035",
      xml: "<cfdi:Comprobante/>",
    });
  });

  it("downloads the stamped PDF from the file endpoint and decodes its base64", async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];

    const fakeFetch: typeof fetch = async (input, init) => {
      calls.push({ url: String(input), init: init ?? {} });

      return new Response(
        JSON.stringify({
          ContentEncoding: "base64",
          ContentType: "pdf",
          ContentLength: 4,
          Content: btoa("%PDF"),
        }),
        { status: 200 },
      );
    };

    const pdf = await setup(fakeFetch).downloadPdf("fac-1");

    expect(calls[0]?.url).toBe("https://apisandbox.facturama.mx/cfdi/pdf/issued/fac-1");
    expect(calls[0]?.init.headers).toMatchObject({
      Authorization: `Basic ${btoa("facturama-user:s3cr3t")}`,
      Accept: "application/json",
    });
    expect(Array.from(pdf)).toEqual([0x25, 0x50, 0x44, 0x46]);
  });

  it("downloads from the multiemisor file endpoint when that mode is configured", async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];

    const fakeFetch: typeof fetch = async (input, init) => {
      calls.push({ url: String(input), init: init ?? {} });

      return new Response(
        JSON.stringify({ ContentEncoding: "base64", ContentType: "pdf", Content: btoa("%") }),
        { status: 200 },
      );
    };

    const multiemisor = new FacturamaInvoiceIssuer({
      credentials: {
        user: "facturama-user",
        password: "s3cr3t",
        baseUrl: "https://apisandbox.facturama.mx",
      },
      fiscal: {
        ...settings,
        mode: "multiemisor",
        series: "A",
        issuer: { rfc: "EKU9003173C9", name: "ESCUELA KEMPER URGATE", fiscalRegime: "601" },
      },
      fetch: fakeFetch,
    });

    await multiemisor.downloadPdf("fac-2");

    expect(calls[0]?.url).toBe("https://apisandbox.facturama.mx/cfdi/pdf/issuedLite/fac-2");
  });

  it("downloads the stamped XML from the file endpoint and decodes its base64", async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];

    const fakeFetch: typeof fetch = async (input, init) => {
      calls.push({ url: String(input), init: init ?? {} });

      return new Response(
        JSON.stringify({
          ContentEncoding: "base64",
          ContentType: "xml",
          Content: btoa("<cfdi:Comprobante/>"),
        }),
        { status: 200 },
      );
    };

    const xml = await setup(fakeFetch).downloadXml("fac-1");

    expect(calls[0]?.url).toBe("https://apisandbox.facturama.mx/cfdi/xml/issued/fac-1");
    expect(calls[0]?.init.headers).toMatchObject({
      Authorization: `Basic ${btoa("facturama-user:s3cr3t")}`,
      Accept: "application/json",
    });
    expect(xml).toBe("<cfdi:Comprobante/>");
  });

  it("downloads XML from the multiemisor file endpoint when that mode is configured", async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];

    const fakeFetch: typeof fetch = async (input, init) => {
      calls.push({ url: String(input), init: init ?? {} });

      return new Response(
        JSON.stringify({ ContentEncoding: "base64", ContentType: "xml", Content: btoa("<cfdi/>") }),
        { status: 200 },
      );
    };

    const multiemisor = new FacturamaInvoiceIssuer({
      credentials: {
        user: "facturama-user",
        password: "s3cr3t",
        baseUrl: "https://apisandbox.facturama.mx",
      },
      fiscal: {
        ...settings,
        mode: "multiemisor",
        series: "A",
        issuer: { rfc: "EKU9003173C9", name: "ESCUELA KEMPER URGATE", fiscalRegime: "601" },
      },
      fetch: fakeFetch,
    });

    await multiemisor.downloadXml("fac-2");

    expect(calls[0]?.url).toBe("https://apisandbox.facturama.mx/cfdi/xml/issuedLite/fac-2");
  });

  it("throws InvoiceProviderRejection when the XML download answers no file", async () => {
    const fakeFetch: typeof fetch = async () =>
      new Response(JSON.stringify({ ContentType: "xml" }), { status: 200 });

    const error = await setup(fakeFetch)
      .downloadXml("fac-1")
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(InvoiceProviderRejection);
    expect(error).toMatchObject({ detail: "Malformed response from the invoice provider" });
  });

  it("throws InvoiceProviderRejection when the PDF cannot be downloaded", async () => {
    const fakeFetch: typeof fetch = async () =>
      new Response(JSON.stringify({ Message: "El CFDI no existe" }), { status: 404 });

    const error = await setup(fakeFetch)
      .downloadPdf("fac-404")
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(InvoiceProviderRejection);
    expect(error).toMatchObject({ detail: "El CFDI no existe" });
  });

  it("throws InvoiceProviderRejection when the download answers no file", async () => {
    const fakeFetch: typeof fetch = async () =>
      new Response(JSON.stringify({ ContentType: "pdf" }), { status: 200 });

    const error = await setup(fakeFetch)
      .downloadPdf("fac-1")
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(InvoiceProviderRejection);
    expect(error).toMatchObject({ detail: "Malformed response from the invoice provider" });
  });
});
