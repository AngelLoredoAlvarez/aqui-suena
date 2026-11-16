import type { Account } from "@aqui-suena/api/domain/accounts/account";
import { InMemoryAccountRepository } from "@aqui-suena/api/domain/accounts/account-repository";
import type { FiscalProfile } from "@aqui-suena/api/domain/billing/fiscal/fiscal-profile";
import { NotFoundError } from "@aqui-suena/api/shared/domain-error";
import { describe, expect, it } from "vitest";

const profile: FiscalProfile = {
  rfc: "EKU9003173C9",
  legalName: "ESCUELA KEMPER URGARTE",
  taxRegime: "601",
  taxZipCode: "42501",
  cfdiUse: "G03",
  billingEmail: "facturas@example.com",
};

const account: Account = {
  id: "acc-1",
  email: "owner@example.com",
  planId: "trades",
  locale: "es-MX",
};

describe("InMemoryAccountRepository fiscal profile", () => {
  it("returns null when the account has no fiscal data", async () => {
    const repo = new InMemoryAccountRepository([account]);

    expect(await repo.getFiscalProfile("acc-1")).toBeNull();
  });

  it("stores and returns the profile", async () => {
    const repo = new InMemoryAccountRepository([account]);

    await repo.updateFiscalProfile("acc-1", profile);

    expect(await repo.getFiscalProfile("acc-1")).toEqual(profile);
  });

  it("replaces the previous profile instead of appending", async () => {
    const repo = new InMemoryAccountRepository([account]);

    await repo.updateFiscalProfile("acc-1", profile);
    await repo.updateFiscalProfile("acc-1", { ...profile, rfc: "AALG880101HDF" });

    expect((await repo.getFiscalProfile("acc-1"))?.rfc).toBe("AALG880101HDF");
  });

  it("throws NotFoundError for an unknown account", async () => {
    const repo = new InMemoryAccountRepository([account]);

    await expect(repo.updateFiscalProfile("missing", profile)).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});
