import type { Account } from "@aqui-suena/api/domain/accounts/account";
import {
  AccountEmailConflictError,
  InMemoryAccountRepository,
} from "@aqui-suena/api/domain/accounts/account-repository";
import type { FiscalProfile } from "@aqui-suena/api/domain/accounts/fiscal-profile";
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

describe("InMemoryAccountRepository ensure", () => {
  it("creates the row with the default plan and locale", async () => {
    const repo = new InMemoryAccountRepository([]);

    await repo.ensure("acc-new", "owner@example.com");

    expect(await repo.getById("acc-new")).toEqual({
      id: "acc-new",
      email: "owner@example.com",
      planId: "community",
      locale: "es-MX",
    });
  });

  it("normalizes the email before storing it", async () => {
    const repo = new InMemoryAccountRepository([]);

    await repo.ensure("acc-new", "  Owner@Example.COM  ");

    expect((await repo.getById("acc-new"))?.email).toBe("owner@example.com");
  });

  it("syncs the email when the session email changes", async () => {
    const repo = new InMemoryAccountRepository([{ ...account, email: "old@example.com" }]);

    await repo.ensure("acc-1", "new@example.com");

    expect((await repo.getById("acc-1"))?.email).toBe("new@example.com");
  });

  it("changes nothing else when it syncs the email", async () => {
    const repo = new InMemoryAccountRepository([account]);

    await repo.updateFiscalProfile("acc-1", profile);

    await repo.ensure("acc-1", "new@example.com");

    expect(await repo.getById("acc-1")).toEqual({
      id: "acc-1",
      email: "new@example.com",
      planId: "trades",
      locale: "es-MX",
      fiscalProfile: profile,
    });
  });

  it("refuses an email owned by another account", async () => {
    const repo = new InMemoryAccountRepository([
      { ...account, id: "acc-old", email: "taken@example.com" },
    ]);

    await expect(repo.ensure("acc-new", "TAKEN@example.com")).rejects.toBeInstanceOf(
      AccountEmailConflictError,
    );
    expect(await repo.getById("acc-new")).toBeNull();
  });

  it("leaves an existing account untouched when the email already matches", async () => {
    const repo = new InMemoryAccountRepository([account]);

    await expect(repo.ensure("acc-1", "  OWNER@Example.com ")).resolves.toBeUndefined();

    expect(await repo.getById("acc-1")).toEqual(account);
  });
});

describe("InMemoryAccountRepository anonymize", () => {
  it("frees the email and clears the fiscal data", async () => {
    const repo = new InMemoryAccountRepository([account]);

    await repo.updateFiscalProfile("acc-1", profile);

    await repo.anonymize("acc-1");

    const anonymized = await repo.getById("acc-1");

    expect(anonymized?.email).toBe("deleted-acc-1@deleted.invalid");
    expect(anonymized?.fiscalProfile).toBeUndefined();
    expect(anonymized?.deletedAt).toBeInstanceOf(Date);
    expect(anonymized?.planId).toBe(account.planId);
  });

  it("keeps the row so the financial records still point at it", async () => {
    const repo = new InMemoryAccountRepository([account]);

    await repo.anonymize("acc-1");

    expect(await repo.getById("acc-1")).not.toBeNull();
  });

  it("is idempotent and keeps the first deletion moment", async () => {
    const repo = new InMemoryAccountRepository([account]);

    await repo.anonymize("acc-1");

    const first = (await repo.getById("acc-1"))?.deletedAt;

    await repo.anonymize("acc-1");

    expect((await repo.getById("acc-1"))?.deletedAt).toEqual(first);
  });

  it("throws NotFoundError for an unknown account", async () => {
    const repo = new InMemoryAccountRepository([]);

    await expect(repo.anonymize("missing")).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("InMemoryAccountRepository saved card", () => {
  const card = {
    customerId: "cus-1",
    sourceId: "src-1",
    brand: "visa",
    last4: "4242",
    expMonth: 12,
    expYear: 30,
  };

  it("stores and returns the card", async () => {
    const repo = new InMemoryAccountRepository([account]);

    await repo.saveCard("acc-1", card);

    expect(await repo.getSavedCard("acc-1")).toEqual(card);
  });

  it("clears the card when the account is anonymized", async () => {
    const repo = new InMemoryAccountRepository([account]);

    await repo.saveCard("acc-1", card);
    await repo.anonymize("acc-1");

    expect(await repo.getSavedCard("acc-1")).toBeNull();
  });

  it("throws NotFoundError for an unknown account", async () => {
    const repo = new InMemoryAccountRepository([account]);

    await expect(repo.saveCard("missing", card)).rejects.toBeInstanceOf(NotFoundError);
  });
});
