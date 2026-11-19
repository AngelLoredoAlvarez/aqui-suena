import type { IssueInvoiceRequest } from "@aqui-suena/api/domain/billing/invoices/invoice-issuer";
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
};

describe("toFacturamaCfdiPayload", () => {
  it("maps the request into a CFDI 4.0 income payload", () => {
    const payload = toFacturamaCfdiPayload(request, settings);

    expect(payload).toEqual({
      CfdiType: "I",
      ExpeditionPlace: "42501",
      Currency: "MXN",
      PaymentMethod: "PPD",
      PaymentForm: "99",
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
