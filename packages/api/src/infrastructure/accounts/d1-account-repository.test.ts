import { D1AccountRepository } from "@aqui-suena/api/infrastructure/accounts/d1-account-repository";
import { DataIntegrityError, NotFoundError } from "@aqui-suena/api/shared/domain-error";
import { FakeD1Database } from "@aqui-suena/api/testing/d1";
import { describe, expect, it } from "vitest";

const sampleRow = {
  id: "acc-1",
  email: "owner@example.com",
  plan_id: "trades",
  locale: "en",
};

describe("D1AccountRepository", () => {
  it("maps a row with a supported locale", async () => {
    const fake = new FakeD1Database(() => ({ first: sampleRow }));

    const account = await new D1AccountRepository(fake.db).getById("acc-1");

    expect(account).toEqual({
      id: "acc-1",
      email: "owner@example.com",
      planId: "trades",
      locale: "en",
    });
  });

  it("falls back to the default locale when the stored value is invalid", async () => {
    const fake = new FakeD1Database(() => ({ first: { ...sampleRow, locale: "fr" } }));

    const account = await new D1AccountRepository(fake.db).getById("acc-1");

    expect(account?.locale).toBe("es-MX");
  });

  it("throws DataIntegrityError when the stored plan id is unknown", async () => {
    const fake = new FakeD1Database(() => ({ first: { ...sampleRow, plan_id: "enterprise" } }));

    await expect(new D1AccountRepository(fake.db).getById("acc-1")).rejects.toBeInstanceOf(
      DataIntegrityError,
    );
  });

  it("returns null when the account does not exist", async () => {
    const fake = new FakeD1Database(() => ({ first: null }));

    expect(await new D1AccountRepository(fake.db).getById("missing")).toBeNull();
  });
});

describe("D1AccountRepository fiscal profile", () => {
  const fiscalRow = {
    rfc: "EKU9003173C9",
    legal_name: "ESCUELA KEMPER URGARTE",
    tax_regime: "601",
    tax_zip_code: "42501",
    cfdi_use: "G03",
    billing_email: "facturas@example.com",
  };

  it("returns null when the account has no fiscal data", async () => {
    const fake = new FakeD1Database(() => ({
      first: {
        rfc: null,
        legal_name: null,
        tax_regime: null,
        tax_zip_code: null,
        cfdi_use: null,
        billing_email: null,
      },
    }));

    expect(await new D1AccountRepository(fake.db).getFiscalProfile("acc-1")).toBeNull();
  });

  it("maps a stored fiscal profile", async () => {
    const fake = new FakeD1Database(() => ({ first: fiscalRow }));

    const profile = await new D1AccountRepository(fake.db).getFiscalProfile("acc-1");

    expect(profile).toEqual({
      rfc: "EKU9003173C9",
      legalName: "ESCUELA KEMPER URGARTE",
      taxRegime: "601",
      taxZipCode: "42501",
      cfdiUse: "G03",
      billingEmail: "facturas@example.com",
    });
  });

  it("returns null when the account does not exist", async () => {
    const fake = new FakeD1Database(() => ({ first: null }));

    expect(await new D1AccountRepository(fake.db).getFiscalProfile("missing")).toBeNull();
  });

  it("raises DataIntegrityError for a stored régime outside the catalog", async () => {
    const fake = new FakeD1Database(() => ({ first: { ...fiscalRow, tax_regime: "999" } }));

    await expect(new D1AccountRepository(fake.db).getFiscalProfile("acc-1")).rejects.toBeInstanceOf(
      DataIntegrityError,
    );
  });

  it("updates every fiscal column and the timestamps", async () => {
    const fake = new FakeD1Database(() => ({ run: { success: true, changes: 1 } }));

    await new D1AccountRepository(fake.db).updateFiscalProfile("acc-1", {
      rfc: "EKU9003173C9",
      legalName: "ESCUELA KEMPER URGARTE",
      taxRegime: "601",
      taxZipCode: "42501",
      cfdiUse: "G03",
      billingEmail: "facturas@example.com",
    });

    const statement = fake.statements.at(-1);

    expect(statement?.sql).toContain("UPDATE accounts SET rfc = ?");
    expect(statement?.params.slice(0, 6)).toEqual([
      "EKU9003173C9",
      "ESCUELA KEMPER URGARTE",
      "601",
      "42501",
      "G03",
      "facturas@example.com",
    ]);
    expect(statement?.params).toHaveLength(9);
  });

  it("throws NotFoundError when the update touches no row", async () => {
    const fake = new FakeD1Database(() => ({ run: { success: true, changes: 0 } }));

    await expect(
      new D1AccountRepository(fake.db).updateFiscalProfile("missing", {
        rfc: "EKU9003173C9",
        legalName: "ESCUELA KEMPER URGARTE",
        taxRegime: "601",
        taxZipCode: "42501",
        cfdiUse: "G03",
        billingEmail: "facturas@example.com",
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
