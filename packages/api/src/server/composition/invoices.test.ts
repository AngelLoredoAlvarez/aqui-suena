import type { CfdiInvoice } from "@aqui-suena/api/domain/billing/invoices/model/invoice";
import { IssueInvoice } from "@aqui-suena/api/domain/billing/invoices/use-cases/issue-invoice";
import { RecoverMissingArchives } from "@aqui-suena/api/domain/billing/invoices/use-cases/recover-missing-archives";
import { DEFAULT_PLAN_CATALOG } from "@aqui-suena/api/domain/plans/catalog";
import { InMemoryPlanRepository } from "@aqui-suena/api/infrastructure/memory/in-memory-plan-repository";
import {
  createInvoiceSubstituter,
  createIssueInvoice,
  createRecoverMissingArchives,
  type FacturamaEnv,
} from "@aqui-suena/api/server/composition/invoices";
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
  return createIssueInvoice({
    db: new FakeD1Database().db,
    account: {
      getFiscalProfile: async () => null,
      getById: async () => null,
    },
    plans: new InMemoryPlanRepository([...DEFAULT_PLAN_CATALOG]),
    facturama: { ...facturama, ...overrides.facturama },
    r2: { ...r2, ...overrides.r2 },
    fetch: async () => new Response(null, { status: 200 }),
  });
}

describe("createIssueInvoice", () => {
  it("builds the use case when the PAC and R2 are fully configured", () => {
    expect(setup()).toBeInstanceOf(IssueInvoice);
  });

  it("returns undefined without the PAC password", () => {
    expect(setup({ facturama: { password: undefined } })).toBeUndefined();
  });

  it("returns undefined without the emitter expedition place", () => {
    expect(setup({ facturama: { expeditionPlace: undefined } })).toBeUndefined();
  });

  it("returns undefined without R2 credentials", () => {
    expect(setup({ r2: { secretAccessKey: undefined } })).toBeUndefined();
  });

  it("returns undefined when the VAT rate is not a fraction", () => {
    expect(setup({ facturama: { ivaRate: 16 } })).toBeUndefined();
  });

  it("returns undefined in multiemisor mode without an issuer", () => {
    expect(setup({ facturama: { mode: "multiemisor" } })).toBeUndefined();
  });

  it("builds in multiemisor mode when the issuer is configured", () => {
    const issueInvoice = setup({
      facturama: {
        mode: "multiemisor",
        series: "A",
        issuerRfc: "EKU9003173C9",
        issuerName: "ESCUELA KEMPER URGATE",
        issuerFiscalRegime: "601",
      },
    });

    expect(issueInvoice).toBeInstanceOf(IssueInvoice);
  });
});

describe("createRecoverMissingArchives", () => {
  function recoverSetup(
    overrides: { facturama?: Partial<FacturamaEnv>; r2?: Partial<typeof r2> } = {},
  ) {
    return createRecoverMissingArchives({
      db: new FakeD1Database().db,
      facturama: { ...facturama, ...overrides.facturama },
      r2: { ...r2, ...overrides.r2 },
      fetch: async () => new Response(null, { status: 200 }),
    });
  }

  it("builds the recovery job when the PAC and R2 are fully configured", () => {
    expect(recoverSetup()).toBeInstanceOf(RecoverMissingArchives);
  });

  it("returns undefined without the PAC password", () => {
    expect(recoverSetup({ facturama: { password: undefined } })).toBeUndefined();
  });

  it("returns undefined without R2 credentials", () => {
    expect(recoverSetup({ r2: { accessKeyId: undefined } })).toBeUndefined();
  });
});

describe("createInvoiceSubstituter", () => {
  function stamped(uuid: string | null): CfdiInvoice {
    return { uuid } as CfdiInvoice;
  }

  it("stamps through the issuing use case and returns the substitute UUID", async () => {
    const calls: Array<{
      accountId: string;
      options: { paymentId?: string; substitutesUuid?: string } | undefined;
    }> = [];
    const substituter = createInvoiceSubstituter({
      execute: async (accountId, options) => {
        calls.push({ accountId, options });

        return stamped("22222222-3333-4444-5555-666666666666");
      },
    });

    await expect(
      substituter.issue({
        accountId: "acc-1",
        paymentId: "pay-1",
        substitutesUuid: "0F1B9C7A-3C4D-4E5F-8A9B-0C1D2E3F4A5B",
      }),
    ).resolves.toEqual({ uuid: "22222222-3333-4444-5555-666666666666" });
    expect(calls).toEqual([
      {
        accountId: "acc-1",
        options: {
          paymentId: "pay-1",
          substitutesUuid: "0F1B9C7A-3C4D-4E5F-8A9B-0C1D2E3F4A5B",
        },
      },
    ]);
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
