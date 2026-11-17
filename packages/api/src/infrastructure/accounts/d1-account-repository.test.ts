import { D1AccountRepository } from "@aqui-suena/api/infrastructure/accounts/d1-account-repository";
import { DataIntegrityError, NotFoundError } from "@aqui-suena/api/shared/domain-error";
import { FakeD1Database } from "@aqui-suena/api/testing/d1";
import { normalizeSql } from "@aqui-suena/api/testing/sql";
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

    expect(normalizeSql(statement?.sql)).toContain("UPDATE accounts SET rfc = ?");
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

describe("D1AccountRepository ensure", () => {
  it("inserts a new row and leaves the defaults to the database", async () => {
    const fake = new FakeD1Database((statement) =>
      statement.sql.startsWith("SELECT") ? { first: null } : { run: { changes: 1 } },
    );

    await new D1AccountRepository(fake.db).ensure("acc-new", "  Owner@Example.COM ");

    const insert = fake.statements[1];

    expect(normalizeSql(fake.statements[0]?.sql)).toContain("FROM accounts");
    expect(normalizeSql(insert?.sql)).toContain("INSERT INTO accounts");
    expect(normalizeSql(insert?.sql)).toContain("ON CONFLICT(id) DO NOTHING");
    expect(normalizeSql(insert?.sql)).not.toContain("plan_id");
    expect(normalizeSql(insert?.sql)).not.toContain("locale");
    expect(insert?.params[0]).toBe("acc-new");
    expect(insert?.params[1]).toBe("owner@example.com");
    expect(typeof insert?.params[2]).toBe("number");
    expect(typeof insert?.params[3]).toBe("number");
  });

  it("writes nothing when the account already has that email", async () => {
    const fake = new FakeD1Database(() => ({ first: { email: "owner@example.com" } }));

    await new D1AccountRepository(fake.db).ensure("acc-1", "owner@example.com");

    expect(fake.statements).toHaveLength(1);
    expect(normalizeSql(fake.statements[0]?.sql)).toContain("SELECT email FROM accounts");
  });

  it("updates only the email when the session email changed", async () => {
    const fake = new FakeD1Database(() => ({ first: { email: "old@example.com" } }));

    await new D1AccountRepository(fake.db).ensure("acc-1", "new@example.com");

    const update = fake.statements[1];

    expect(normalizeSql(update?.sql)).toContain("UPDATE accounts SET email = ?");
    expect(normalizeSql(update?.sql)).not.toMatch(/billing_email|plan_id|locale|rfc/);
    expect(update?.params[0]).toBe("new@example.com");
    expect(update?.params[2]).toBe("acc-1");
  });
});

describe("D1AccountRepository anonymize", () => {
  it("anonymizes in a single write that keeps the first deletion moment", async () => {
    const fake = new FakeD1Database(() => ({ run: { changes: 1 } }));

    await new D1AccountRepository(fake.db).anonymize("acc-1");

    const update = fake.statements[0];

    expect(normalizeSql(update?.sql)).toMatch(/UPDATE accounts\s+SET/);
    expect(normalizeSql(update?.sql)).toContain("deleted_at = COALESCE(deleted_at, ?)");
    expect(normalizeSql(update?.sql)).toContain("rfc = NULL");
    expect(update?.params[0]).toBe("deleted-acc-1@deleted.invalid");
    expect(update?.params.at(-1)).toBe("acc-1");
  });

  it("throws NotFoundError when no row matched", async () => {
    const fake = new FakeD1Database(() => ({ run: { changes: 0 } }));

    await expect(new D1AccountRepository(fake.db).anonymize("missing")).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});
