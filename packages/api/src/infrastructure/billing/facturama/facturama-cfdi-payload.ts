import type { IssueInvoiceRequest } from "@aqui-suena/api/domain/billing/invoices/invoice-issuer";

/**
 * Fiscal configuration owned by the emitter (us), not by the caller. It comes
 * from the environment, never from a request body.
 */
export type FacturamaFiscalSettings = {
  readonly expeditionPlace: string;
  readonly ivaRate: number;
  readonly productCode: string;
  readonly unitCode: string;
};

export type FacturamaCfdiPayload = {
  readonly CfdiType: "I";
  readonly ExpeditionPlace: string;
  readonly Currency: string;
  readonly PaymentMethod: "PUE";
  readonly PaymentForm: "99";
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
  const subtotal = toAmount(request.amountCents);
  const ivaTotal = toAmount(Math.round(request.amountCents * settings.ivaRate));

  return {
    CfdiType: "I",
    ExpeditionPlace: settings.expeditionPlace,
    Currency: request.currency,
    PaymentMethod: "PUE",
    PaymentForm: "99",
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
        Taxes: [
          {
            Name: "IVA",
            Rate: settings.ivaRate,
            Base: subtotal,
            Total: ivaTotal,
            IsRetention: false,
          },
        ],
      },
    ],
  };
}
