import { IssueInvoice } from "@aqui-suena/api/domain/billing/invoices/issue-invoice";
import { DEFAULT_PLAN_CATALOG } from "@aqui-suena/api/domain/plans/catalog";
import { InMemoryPlanRepository } from "@aqui-suena/api/domain/plans/plans";
import { createIssueInvoice, type FacturamaEnv } from "@aqui-suena/api/server/composition/invoices";
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
