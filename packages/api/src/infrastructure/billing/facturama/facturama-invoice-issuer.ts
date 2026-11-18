import {
  type InvoiceIssuer,
  InvoiceProviderRejection,
  type IssuedCfdi,
  type IssueInvoiceRequest,
} from "@aqui-suena/api/domain/billing/invoices/invoice-issuer";
import {
  type FacturamaFiscalSettings,
  toFacturamaCfdiPayload,
} from "@aqui-suena/api/infrastructure/billing/facturama/facturama-cfdi-payload";

export type FacturamaCredentials = {
  readonly user: string;
  readonly password: string;
  readonly baseUrl: string;
};

export type FacturamaInvoiceIssuerDependencies = {
  readonly credentials: FacturamaCredentials;
  readonly fiscal: FacturamaFiscalSettings;
  readonly fetch: typeof fetch;
};

type FacturamaCfdiResponse = {
  readonly Id?: unknown;
  readonly ContentBase64?: unknown;
  readonly XmlBase64?: unknown;
  readonly Complement?: { readonly TaxStamp?: { readonly Uuid?: unknown } };
  readonly TaxStamp?: { readonly Uuid?: unknown };
};

const MALFORMED_RESPONSE = "Malformed response from the invoice provider";

const WEB_ENDPOINT = "/3/cfdis";
const MULTIEMISOR_ENDPOINT = "/api-lite/4/cfdis";

/** Trims trailing slashes so `${baseUrl}/3/cfdis` never doubles a slash. */
function trimTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

/** Facturama v3 authenticates with the panel credentials over Basic. */
function toBasicAuth(user: string, password: string): string {
  return `Basic ${btoa(`${user}:${password}`)}`;
}

/** The XML arrives base64-encoded UTF-8; `atob` alone would corrupt accents. */
function decodeXml(base64: string): string {
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));

  return new TextDecoder().decode(bytes);
}

/**
 * A rejection carries a JSON `Message`. When the body is not JSON or is empty,
 * the HTTP status is the only useful detail left.
 */
async function readRejectionDetail(response: Response): Promise<string> {
  const body = await response.text();

  if (body.length > 0) {
    try {
      const parsed: unknown = JSON.parse(body);

      if (typeof parsed === "object" && parsed !== null && "Message" in parsed) {
        const message = (parsed as { Message: unknown }).Message;

        if (typeof message === "string" && message.length > 0) return message;
      }
    } catch {
      return body;
    }
  }

  return `The invoice provider answered ${response.status}`;
}

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

    return { providerId, uuid, xml: decodeXml(xml) };
  }

  /**
   * The stamped PDF is addressed by provider id. Both API variants answer with
   * the file as the raw response body, not as JSON.
   */
  async downloadPdf(providerId: string): Promise<Uint8Array> {
    const { credentials, fiscal } = this.deps;

    const endpoint = fiscal.mode === "multiemisor" ? MULTIEMISOR_ENDPOINT : WEB_ENDPOINT;

    // Workers rejects native fetch when it is invoked as a method (`obj.fetch()`).
    const fetchFn = this.deps.fetch;

    const id = encodeURIComponent(providerId);

    const response = await fetchFn(
      `${trimTrailingSlash(credentials.baseUrl)}${endpoint}/${id}?format=pdf`,
      {
        headers: {
          Accept: "application/pdf",
          Authorization: toBasicAuth(credentials.user, credentials.password),
        },
      },
    );

    if (!response.ok) {
      throw new InvoiceProviderRejection(await readRejectionDetail(response));
    }

    const bytes = new Uint8Array(await response.arrayBuffer());

    // A 200 with an empty body is not a PDF; treating it as success would ship
    // a zero-byte attachment and a bogus R2 object.
    if (bytes.length === 0) {
      throw new InvoiceProviderRejection(MALFORMED_RESPONSE);
    }

    return bytes;
  }
}
