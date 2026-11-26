import type { IssueInvoiceRequest } from "@aqui-suena/api/domain/billing/invoices/ports/invoice-issuer";
import {
  type FacturamaFiscalSettings,
  toFacturamaCfdiPayload,
} from "@aqui-suena/api/infrastructure/billing/facturama/facturama-cfdi-payload";
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
  amountCents: 14900,
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

describe("toFacturamaCfdiPayload", () => {
  it("maps the request into a CFDI 4.0 income payload", () => {
    const payload = toFacturamaCfdiPayload(request, settings);

    expect(payload).toEqual({
      CfdiType: "I",
      ExpeditionPlace: "42501",
      Currency: "MXN",
      PaymentMethod: "PUE",
      PaymentForm: "04",
      Receiver: {
        Rfc: "EKU9003173C9",
        Name: "ESCUELA KEMPER URGATE",
        CfdiUse: "G01",
        FiscalRegime: "601",
        TaxZipCode: "42501",
      },
      Items: [
        {
          ProductCode: "01010101",
          Description: "Comercios & Catálogo",
          UnitCode: "E48",
          Unit: "Unidad de servicio",
          Quantity: 1,
          UnitPrice: 128.45,
          Subtotal: 128.45,
          TaxObject: "02",
          Total: 149,
          Taxes: [{ Name: "IVA", Rate: 0.16, Base: 128.45, Total: 20.55, IsRetention: false }],
        },
      ],
    });
  });

  it("breaks the gross amount down into subtotal and VAT without float drift", () => {
    const payload = toFacturamaCfdiPayload({ ...request, amountCents: 4999 }, settings);

    expect(payload.Items[0]).toMatchObject({ UnitPrice: 43.09, Subtotal: 43.09, Total: 49.99 });
    expect(payload.Items[0]?.Taxes[0]).toMatchObject({ Base: 43.09, Total: 6.9 });
  });

  it("adds the issuer, serie and folio for the multiemisor endpoint", () => {
    const payload = toFacturamaCfdiPayload(request, {
      ...settings,
      mode: "multiemisor",
      series: "A",
      issuer: { rfc: "EKU9003173C9", name: "ESCUELA KEMPER URGATE", fiscalRegime: "601" },
    });

    expect(payload).toMatchObject({
      Serie: "A",
      Folio: String(request.issuedAt.getTime()),
      Issuer: { Rfc: "EKU9003173C9", Name: "ESCUELA KEMPER URGATE", FiscalRegime: "601" },
    });
  });

  it("omits the issuer block in web mode", () => {
    const payload = toFacturamaCfdiPayload(request, settings);

    expect(payload).not.toHaveProperty("Issuer");
    expect(payload).not.toHaveProperty("Serie");
    expect(payload).not.toHaveProperty("Folio");
  });
});

describe("toFacturamaCfdiPayload substitution", () => {
  it("relates the substitute to the CFDI it replaces", () => {
    const payload = toFacturamaCfdiPayload(
      { ...request, substitutesUuid: "0F1B9C7A-3C4D-4E5F-8A9B-0C1D2E3F4A5B" },
      settings,
    );

    expect(payload.Relations).toEqual({
      Type: "04",
      Cfdis: [{ Uuid: "0F1B9C7A-3C4D-4E5F-8A9B-0C1D2E3F4A5B" }],
    });
  });

  it("omits the relation for a regular invoice", () => {
    expect(toFacturamaCfdiPayload(request, settings)).not.toHaveProperty("Relations");
  });
});
