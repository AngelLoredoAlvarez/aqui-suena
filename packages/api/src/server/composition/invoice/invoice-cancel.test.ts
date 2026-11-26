import type { CfdiInvoice } from "@aqui-suena/api/domain/billing/invoices/model/invoice";
import { CancelInvoice } from "@aqui-suena/api/domain/billing/invoices/use-cases/cancel-invoice";
import { ReconcileCancellations } from "@aqui-suena/api/domain/billing/invoices/use-cases/reconcile-cancellations";
import {
  createCancelInvoice,
  createInvoiceSubstituter,
} from "@aqui-suena/api/server/composition/invoice/invoice-cancel";
import type { FacturamaEnv } from "@aqui-suena/api/server/composition/invoice/invoice-config";
import { DataIntegrityError } from "@aqui-suena/api/shared/domain-error";
import { FakeD1Database } from "@aqui-suena/api/testing/d1";
import { describe, expect, it } from "vitest";

const facturama: FacturamaEnv = {
  user: "facturama-user",
  password: "secret",
  baseUrl: "https://apisandbox.facturama.mx",
  expeditionPlace: "42501",
  ivaRate: 0.16,
};

const r2 = {
  accountId: "acc-1",
  accessKeyId: "key",
  secretAccessKey: "secret",
};

function setup(overrides: { facturama?: Partial<FacturamaEnv>; r2?: Partial<typeof r2> } = {}) {
  return createCancelInvoice({
    db: new FakeD1Database().db,
    facturama: { ...facturama, ...overrides.facturama },
    r2: { ...r2, ...overrides.r2 },
    fetch: async () => new Response(null, { status: 200 }),
  });
}

describe("createCancelInvoice", () => {
  it("builds the cancellation chain when the PAC and R2 are configured", () => {
    const chain = setup();

    expect(chain?.cancelInvoice).toBeInstanceOf(CancelInvoice);
    expect(chain?.reconcile).toBeInstanceOf(ReconcileCancellations);
  });

  it("returns undefined without the PAC password", () => {
    expect(setup({ facturama: { password: undefined } })).toBeUndefined();
  });

  it("returns undefined without R2 credentials", () => {
    expect(setup({ r2: { accessKeyId: undefined } })).toBeUndefined();
  });
});

describe("createInvoiceSubstituter", () => {
  function stamped(uuid: string | null): CfdiInvoice {
    return { uuid } as CfdiInvoice;
  }

  it("stamps through the issuing use case and returns the substitute UUID", async () => {
    const substituter = createInvoiceSubstituter({
      execute: async () => stamped("22222222-3333-4444-5555-666666666666"),
    });

    await expect(
      substituter.issue({
        accountId: "acc-1",
        paymentId: "pay-1",
        substitutesUuid: "0F1B9C7A-3C4D-4E5F-8A9B-0C1D2E3F4A5B",
      }),
    ).resolves.toEqual({ uuid: "22222222-3333-4444-5555-666666666666" });
  });

  it("refuses a stamped invoice without a UUID", async () => {
    const substituter = createInvoiceSubstituter({
      execute: async () => stamped(null),
    });

    await expect(
      substituter.issue({
        accountId: "acc-1",
        paymentId: "pay-1",
        substitutesUuid: "0F1B9C7A-3C4D-4E5F-8A9B-0C1D2E3F4A5B",
      }),
    ).rejects.toBeInstanceOf(DataIntegrityError);
  });
});
