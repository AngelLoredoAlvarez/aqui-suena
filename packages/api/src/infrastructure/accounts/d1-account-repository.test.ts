import { D1AccountRepository } from "@aqui-suena/api/infrastructure/accounts/d1-account-repository";
import { DataIntegrityError } from "@aqui-suena/api/shared/domain-error";
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
