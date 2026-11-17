import type { Account } from "@aqui-suena/api/domain/accounts/account";
import { InMemoryAccountRepository } from "@aqui-suena/api/domain/accounts/account-repository";
import type { CfdiInvoice } from "@aqui-suena/api/domain/billing/invoices/invoice";
import type { IssueInvoice } from "@aqui-suena/api/domain/billing/invoices/issue-invoice";
import { createBillingRouter } from "@aqui-suena/api/server/routers/billing/billing";
import { UpgradeRequired } from "@aqui-suena/api/shared/domain-error";
import { describe, expect, it } from "vitest";

const account: Account = {
  id: "acc-1",
  email: "owner@example.com",
  planId: "trades",
  locale: "es-MX",
};

const input = {
  rfc: "eku9003173c9",
  legalName: "  escuela   kemper urgarte ",
  taxRegime: "601",
  taxZipCode: "42501",
  cfdiUse: "G03",
  billingEmail: "Facturas@Example.com",
} as const;

const issuedInvoice: CfdiInvoice = {
  id: "cfdi-1",
  accountId: "acc-1",
  paymentId: null,
  status: "issued",
  uuid: "0F1B9C7A-3C4D-4E5F-8A9B-0C1D2E3F4A5B",
  providerId: "fac-1",
  xmlKey: "cfdi/acc-1/1.xml",
  failureReason: null,
  createdAt: new Date("2026-11-16T18:00:00Z"),
  updatedAt: new Date("2026-11-16T18:00:00Z"),
};

function setup(
  accounts: Account[] = [account],
  issueInvoice: Pick<IssueInvoice, "execute"> | null = { execute: async () => issuedInvoice },
) {
  const repo = new InMemoryAccountRepository(accounts);

  const router = createBillingRouter({
    account: repo,
    issueInvoice: issueInvoice ?? undefined,
  });
  const caller = router.createCaller({ user: { id: "u1", accountId: "acc-1" } });

  return { repo, caller, router };
}

describe("billing.getFiscalProfile", () => {
  it("returns null when the account has no fiscal data", async () => {
    const { caller } = setup();

    expect(await caller.getFiscalProfile()).toEqual({ fiscalProfile: null });
  });

  it("requires an authenticated user", async () => {
    const { router } = setup();
    const caller = router.createCaller({ user: null });

    await expect(caller.getFiscalProfile()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});

describe("billing.updateFiscalProfile", () => {
  it("normalizes and persists the profile", async () => {
    const { caller, repo } = setup();

    const result = await caller.updateFiscalProfile(input);

    expect(result.fiscalProfile).toEqual({
      rfc: "EKU9003173C9",
      legalName: "ESCUELA KEMPER URGARTE",
      taxRegime: "601",
      taxZipCode: "42501",
      cfdiUse: "G03",
      billingEmail: "facturas@example.com",
    });
    expect(await repo.getFiscalProfile("acc-1")).toEqual(result.fiscalProfile);
  });

  it("lets a Comunidad account store its profile before upgrading", async () => {
    // S8: collecting fiscal data is not the paywalled action. The checkout form
    // fills it before the payment exists, so the write stays open; issuing the
    // CFDI is what requires a paid plan.
    const { caller, repo } = setup([
      { id: "acc-1", email: "owner@example.com", planId: "community", locale: "es-MX" },
    ]);

    await caller.updateFiscalProfile(input);

    expect(await repo.getFiscalProfile("acc-1")).not.toBeNull();
  });

  it("answers BAD_REQUEST for an invalid RFC", async () => {
    const { caller } = setup();

    await expect(caller.updateFiscalProfile({ ...input, rfc: "nope" })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });

  it("answers NOT_FOUND when the account does not exist", async () => {
    const { caller } = setup([]);

    await expect(caller.updateFiscalProfile(input)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("requires an authenticated user", async () => {
    const { router } = setup();
    const caller = router.createCaller({ user: null });

    await expect(caller.updateFiscalProfile(input)).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});

describe("billing.requestInvoice", () => {
  it("returns the issued invoice view", async () => {
    const { caller } = setup();

    expect(await caller.requestInvoice()).toEqual({
      invoice: {
        id: "cfdi-1",
        status: "issued",
        uuid: "0F1B9C7A-3C4D-4E5F-8A9B-0C1D2E3F4A5B",
        issuedAt: issuedInvoice.createdAt,
      },
    });
  });

  it("maps a community account to FORBIDDEN with the upgrade prefix", async () => {
    const { caller } = setup([account], {
      execute: async () => {
        throw new UpgradeRequired("billing.upgradeRequired.invoiceIssue");
      },
    });

    await expect(caller.requestInvoice()).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "UPGRADE_REQUIRED: billing.upgradeRequired.invoiceIssue",
    });
  });

  it("answers PRECONDITION_FAILED when invoicing is not configured", async () => {
    const { caller } = setup([account], null);

    await expect(caller.requestInvoice()).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
  });
});
