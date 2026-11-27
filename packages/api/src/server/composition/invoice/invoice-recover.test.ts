import { RecoverMissingArchives } from "@aqui-suena/api/domain/billing/invoices/use-cases/recover-missing-archives";
import type { FacturamaEnv } from "@aqui-suena/api/server/composition/invoice/invoice-config";
import { createRecoverMissingArchives } from "@aqui-suena/api/server/composition/invoice/invoice-recover";
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
  return createRecoverMissingArchives({
    db: new FakeD1Database().db,
    facturama: { ...facturama, ...overrides.facturama },
    r2: { ...r2, ...overrides.r2 },
    fetch: async () => new Response(null, { status: 200 }),
  });
}

describe("createRecoverMissingArchives", () => {
  it("builds the recovery sweep when the PAC and R2 are configured", () => {
    expect(setup()).toBeInstanceOf(RecoverMissingArchives);
  });

  it("returns undefined without the PAC password", () => {
    expect(setup({ facturama: { password: undefined } })).toBeUndefined();
  });

  it("returns undefined without R2 credentials", () => {
    expect(setup({ r2: { accessKeyId: undefined } })).toBeUndefined();
  });
});
