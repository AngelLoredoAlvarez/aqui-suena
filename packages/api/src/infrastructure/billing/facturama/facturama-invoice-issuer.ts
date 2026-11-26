import {
  type InvoiceIssuer,
  InvoiceProviderRejection,
  type IssuedCfdi,
  type IssueInvoiceRequest,
} from "@aqui-suena/api/domain/billing/invoices/ports/invoice-issuer";
import {
  type FacturamaFiscalSettings,
  toFacturamaCfdiPayload,
} from "@aqui-suena/api/infrastructure/billing/facturama/facturama-cfdi-payload";
import {
  decodeBase64Bytes,
  decodeBase64Text,
  type FacturamaCredentials,
  MALFORMED_RESPONSE,
  readRejectionDetail,
  toBasicAuth,
  trimTrailingSlash,
} from "@aqui-suena/api/infrastructure/billing/facturama/facturama-http";

export type { FacturamaCredentials };

export type FacturamaInvoiceIssuerDependencies = {
  readonly credentials: FacturamaCredentials;
  readonly fiscal: FacturamaFiscalSettings;
  readonly fetch: typeof fetch;
};

type FacturamaFileResponse = {
  readonly Content?: unknown;
  readonly ContentEncoding?: unknown;
  readonly ContentType?: unknown;
};

type FacturamaCfdiResponse = {
  readonly Id?: unknown;
  readonly ContentBase64?: unknown;
  readonly XmlBase64?: unknown;
  readonly Complement?: { readonly TaxStamp?: { readonly Uuid?: unknown } };
  readonly TaxStamp?: { readonly Uuid?: unknown };
};

const WEB_ENDPOINT = "/3/cfdis";
const MULTIEMISOR_ENDPOINT = "/api-lite/4/cfdis";
/** Download endpoint: /cfdi/{format}/{type}/{id}, a different path from issuing. */
const DOWNLOAD_ENDPOINT = "/cfdi";
const DOWNLOAD_TYPES = { web: "issued", multiemisor: "issuedLite" } as const;

export class FacturamaInvoiceIssuer implements InvoiceIssuer {
  private readonly deps: FacturamaInvoiceIssuerDependencies;

  constructor(deps: FacturamaInvoiceIssuerDependencies) {
    this.deps = deps;
  }

  async issue(request: IssueInvoiceRequest): Promise<IssuedCfdi> {
    const { credentials, fiscal } = this.deps;
    const endpoint = fiscal.mode === "multiemisor" ? MULTIEMISOR_ENDPOINT : WEB_ENDPOINT;
    // Workers rejects native fetch when it is invoked as a method (`obj.fetch()`).
    const fetchFn = this.deps.fetch;

    const response = await fetchFn(`${trimTrailingSlash(credentials.baseUrl)}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: toBasicAuth(credentials.user, credentials.password),
      },
      body: JSON.stringify(toFacturamaCfdiPayload(request, fiscal)),
    });

    if (!response.ok) {
      throw new InvoiceProviderRejection(await readRejectionDetail(response));
    }

    const body = (await response.json()) as FacturamaCfdiResponse;
    const providerId = body.Id;
    // API Web nests the stamp under Complement; API Multiemisor returns it flat.
    const uuid = body.Complement?.TaxStamp?.Uuid ?? body.TaxStamp?.Uuid;
    const xml = body.ContentBase64 ?? body.XmlBase64;

    if (typeof providerId !== "string" || typeof uuid !== "string" || typeof xml !== "string") {
      throw new InvoiceProviderRejection(MALFORMED_RESPONSE);
    }

    return { providerId, uuid, xml: decodeBase64Text(xml) };
  }

  /**
   * Downloads the stamped PDF.
   *
   * Facturama serves files from `/cfdi/{format}/{type}/{id}`, not from the
   * issuing path, and answers JSON carrying the file as base64 — the issuing
   * endpoint ignores `?format=pdf` and returns the CFDI detail instead, which is
   * how a JSON document once ended up archived as a PDF.
   */
  async downloadPdf(providerId: string): Promise<Uint8Array> {
    const content = await this.downloadFile("pdf", providerId);
    const bytes = decodeBase64Bytes(content);

    // A 200 with no file is not a PDF; treating it as success would ship a
    // zero-byte attachment and a bogus R2 object.
    if (bytes.length === 0) {
      throw new InvoiceProviderRejection(MALFORMED_RESPONSE);
    }

    return bytes;
  }

  async downloadXml(providerId: string): Promise<string> {
    const content = await this.downloadFile("xml", providerId);

    const xml = decodeBase64Text(content);

    if (xml.length === 0) {
      throw new InvoiceProviderRejection(MALFORMED_RESPONSE);
    }

    return xml;
  }

  private async downloadFile(format: "pdf" | "xml", providerId: string): Promise<string> {
    const { credentials, fiscal } = this.deps;
    const type = DOWNLOAD_TYPES[fiscal.mode];
    // Workers rejects native fetch when it is invoked as a method (`obj.fetch()`).
    const fetchFn = this.deps.fetch;
    const id = encodeURIComponent(providerId);

    const response = await fetchFn(
      `${trimTrailingSlash(credentials.baseUrl)}${DOWNLOAD_ENDPOINT}/${format}/${type}/${id}`,
      {
        headers: {
          Accept: "application/json",
          Authorization: toBasicAuth(credentials.user, credentials.password),
        },
      },
    );

    if (!response.ok) {
      throw new InvoiceProviderRejection(await readRejectionDetail(response));
    }

    const body = (await response.json()) as FacturamaFileResponse;

    if (body.ContentEncoding !== "base64" || typeof body.Content !== "string") {
      throw new InvoiceProviderRejection(MALFORMED_RESPONSE);
    }

    return body.Content;
  }
}
