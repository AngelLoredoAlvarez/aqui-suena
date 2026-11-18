import type {
  CancelInvoiceRequest,
  InvoiceCancellationOutcome,
  InvoiceCancellationResult,
  InvoiceCanceller,
} from "@aqui-suena/api/domain/billing/invoices/invoice-canceller";
import { InvoiceProviderRejection } from "@aqui-suena/api/domain/billing/invoices/invoice-issuer";
import type { FacturamaFiscalSettings } from "@aqui-suena/api/infrastructure/billing/facturama/facturama-cfdi-payload";
import {
  decodeBase64Text,
  type FacturamaCredentials,
  MALFORMED_RESPONSE,
  readRejectionDetail,
  toBasicAuth,
  trimTrailingSlash,
} from "@aqui-suena/api/infrastructure/billing/facturama/facturama-http";

export type FacturamaInvoiceCancellerDependencies = {
  readonly credentials: FacturamaCredentials;
  readonly fiscal: FacturamaFiscalSettings;
  readonly fetch: typeof fetch;
};

type FacturamaCancellationResponse = {
  readonly Status?: unknown;
  readonly Message?: unknown;
  readonly IsCancelable?: unknown;
  readonly RequestDate?: unknown;
  readonly ResponseDate?: unknown;
  readonly ExpirationDate?: unknown;
  readonly AcuseXmlBase64?: unknown;
  readonly AcuseStatusDetails?: unknown;
};

const CANCELLATION_ENDPOINT = "/cfdi";
/**
 * `issuedLite` is how the multiemisor API names an issued document. Both APIs
 * cancel on the same path; only the type differs.
 */
const CANCELLATION_TYPES = { web: "issued", multiemisor: "issuedLite" } as const;

/**
 * The provider's vocabulary, mapped once.
 *
 * `canceled`, `acepted` and `expired` all mean the CFDI is cancelled: the last
 * one is the positive ficta, where the receiver never answered and the SAT
 * cancelled it anyway. `active` means it is not cancellable at all (it has
 * related documents), which is not the same as a rejection.
 */
const OUTCOMES: Record<string, InvoiceCancellationOutcome> = {
  canceled: "cancelled",
  acepted: "cancelled",
  expired: "cancelled",
  pending: "pending",
  rejected: "rejected",
  active: "not_cancellable",
};

/**
 * Facturama sends naive dates (`2026-11-18T14:59:41`) in Mexico City time. The
 * offset is explicit so a later comparison is not shifted by six hours.
 */
function parseProviderDate(value: unknown): Date | null {
  if (typeof value !== "string" || value.length === 0) return null;

  const hasOffset = /(?:Z|[+-]\d{2}:\d{2})$/.test(value);
  const parsed = new Date(hasOffset ? value : `${value}-06:00`);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** The provider puts the reason in `Message` or, for an acuse, in its details. */
function firstNonEmptyText(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.length > 0) return value;
  }

  return null;
}

function toResult(body: FacturamaCancellationResponse): InvoiceCancellationResult {
  const providerStatus = typeof body.Status === "string" ? body.Status.toLowerCase() : "";
  const outcome = OUTCOMES[providerStatus];

  if (outcome === undefined) {
    throw new InvoiceProviderRejection(MALFORMED_RESPONSE);
  }

  const acuse =
    typeof body.AcuseXmlBase64 === "string" && body.AcuseXmlBase64.length > 0
      ? decodeBase64Text(body.AcuseXmlBase64)
      : null;

  const detail = firstNonEmptyText(body.Message, body.AcuseStatusDetails);

  return {
    outcome,
    providerStatus,
    detail,
    expiresAt: parseProviderDate(body.ExpirationDate),
    resolvedAt: parseProviderDate(body.ResponseDate),
    acuseXml: acuse,
  };
}

export class FacturamaInvoiceCanceller implements InvoiceCanceller {
  private readonly deps: FacturamaInvoiceCancellerDependencies;

  constructor(deps: FacturamaInvoiceCancellerDependencies) {
    this.deps = deps;
  }

  async cancel(request: CancelInvoiceRequest): Promise<InvoiceCancellationResult> {
    const params = new URLSearchParams({ type: this.documentType(), motive: request.motive });

    if (request.substitutionUuid !== undefined) {
      params.set("uuidReplacement", request.substitutionUuid);
    }

    return this.read(this.url(request.providerId, params), "DELETE");
  }

  async cancellationStatus(providerId: string): Promise<InvoiceCancellationResult> {
    const params = new URLSearchParams({ type: this.documentType() });

    return this.read(this.url(providerId, params), "GET");
  }

  private documentType(): string {
    return CANCELLATION_TYPES[this.deps.fiscal.mode];
  }

  private url(providerId: string, params: URLSearchParams): string {
    const { credentials } = this.deps;
    const id = encodeURIComponent(providerId);

    return `${trimTrailingSlash(credentials.baseUrl)}${CANCELLATION_ENDPOINT}/${id}?${params.toString()}`;
  }

  private async read(url: string, method: "DELETE" | "GET"): Promise<InvoiceCancellationResult> {
    const { credentials } = this.deps;
    // Workers rejects native fetch when it is invoked as a method (`obj.fetch()`).
    const fetchFn = this.deps.fetch;

    const response = await fetchFn(url, {
      method,
      headers: {
        Accept: "application/json",
        Authorization: toBasicAuth(credentials.user, credentials.password),
      },
    });

    if (!response.ok) {
      throw new InvoiceProviderRejection(await readRejectionDetail(response));
    }

    return toResult((await response.json()) as FacturamaCancellationResponse);
  }
}
