import type { IssueInvoiceRequest } from "@aqui-suena/api/domain/billing/invoices/invoice-issuer";

export type FacturamaIssuer = {
  readonly rfc: string;
  readonly name: string;
  readonly fiscalRegime: string;
};

/**
 * Fiscal configuration owned by the emitter (us), not by the caller. It comes
 * from the environment, never from a request body.
 *
 * `multiemisor` posts to `/api-lite/4/cfdis` with an issuer block, which is what
 * the sandbox needs while the account RFC differs from the stamped RFC. A real
 * single-emitter account uses `web` and `/3/cfdis`.
 */
export type FacturamaFiscalSettings = {
  readonly mode: "web" | "multiemisor";
  readonly expeditionPlace: string;
  readonly ivaRate: number;
  readonly productCode: string;
  readonly unitCode: string;
  readonly series?: string;
  readonly issuer?: FacturamaIssuer;
};

export type FacturamaCfdiPayload = {
  readonly CfdiType: "I";
  readonly ExpeditionPlace: string;
  readonly Currency: string;
  readonly PaymentMethod: "PPD";
  readonly PaymentForm: "99";
  readonly Serie?: string;
  readonly Folio?: string;
  readonly Issuer?: {
    readonly Rfc: string;
    readonly Name: string;
    readonly FiscalRegime: string;
  };
  readonly Receiver: {
    readonly Rfc: string;
    readonly Name: string;
    readonly CfdiUse: string;
    readonly FiscalRegime: string;
    readonly TaxZipCode: string;
  };
  readonly Items: ReadonlyArray<{
    readonly ProductCode: string;
    readonly Description: string;
    readonly UnitCode: string;
    readonly Unit: string;
    readonly Quantity: number;
    readonly UnitPrice: number;
    readonly Subtotal: number;
    readonly TaxObject: "02";
    readonly Total: number;
    readonly Taxes: ReadonlyArray<{
      readonly Name: "IVA";
      readonly Rate: number;
      readonly Base: number;
      readonly Total: number;
      readonly IsRetention: false;
    }>;
  }>;
};

const UNIT_NAME = "Unidad de servicio";

/** Cents to pesos. Rounded once, never in a chain of float operations. */
function toAmount(cents: number): number {
  return cents / 100;
}

export function toFacturamaCfdiPayload(
  request: IssueInvoiceRequest,
  settings: FacturamaFiscalSettings,
): FacturamaCfdiPayload {
  const { fiscalProfile } = request;

  // Plan prices are consumer prices with IVA included. Break the gross amount
  // down instead of adding IVA on top, or the stamped total would exceed the
  // amount actually charged.
  const totalCents = request.amountCents;
  const subtotalCents = Math.round(totalCents / (1 + settings.ivaRate));
  const ivaCents = totalCents - subtotalCents;
  const subtotal = toAmount(subtotalCents);

  const emitterBlock =
    settings.mode === "multiemisor" && settings.issuer !== undefined
      ? {
          Serie: settings.series ?? "A",
          Folio: String(request.issuedAt.getTime()),
          Issuer: {
            Rfc: settings.issuer.rfc,
            Name: settings.issuer.name,
            FiscalRegime: settings.issuer.fiscalRegime,
          },
        }
      : {};

  return {
    CfdiType: "I",
    ExpeditionPlace: settings.expeditionPlace,
    Currency: request.currency,
    PaymentMethod: "PPD",
    PaymentForm: "99",
    ...emitterBlock,
    Receiver: {
      Rfc: fiscalProfile.rfc,
      Name: fiscalProfile.legalName,
      CfdiUse: fiscalProfile.cfdiUse,
      FiscalRegime: fiscalProfile.taxRegime,
      TaxZipCode: fiscalProfile.taxZipCode,
    },
    Items: [
      {
        ProductCode: settings.productCode,
        Description: request.planName,
        UnitCode: settings.unitCode,
        Unit: UNIT_NAME,
        Quantity: 1,
        UnitPrice: subtotal,
        Subtotal: subtotal,
        TaxObject: "02",
        Total: toAmount(totalCents),
        Taxes: [
          {
            Name: "IVA",
            Rate: settings.ivaRate,
            Base: subtotal,
            Total: toAmount(ivaCents),
            IsRetention: false,
          },
        ],
      },
    ],
  };
}
