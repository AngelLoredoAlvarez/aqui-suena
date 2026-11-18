import type { Account } from "@aqui-suena/api/domain/accounts/account";
import { InMemoryAccountRepository } from "@aqui-suena/api/domain/accounts/account-repository";
import type { CancelInvoice } from "@aqui-suena/api/domain/billing/invoices/cancel-invoice";
import {
  type CfdiDocumentLinker,
  type CfdiInvoice,
  InMemoryCfdiInvoiceRepository,
} from "@aqui-suena/api/domain/billing/invoices/invoice";
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
  pdfKey: "cfdi/acc-1/1.pdf",
  failureReason: null,
  cancellationMotive: null,
  cancellationRequestedAt: null,
  cancellationResolvedAt: null,
  cancellationExpiresAt: null,
  cancellationDetail: null,
  acuseKey: null,
  createdAt: new Date("2026-11-16T18:00:00Z"),
  updatedAt: new Date("2026-11-16T18:00:00Z"),
};

function setup(
  accounts: Account[] = [account],
  issueInvoice: Pick<IssueInvoice, "execute"> | null = { execute: async () => issuedInvoice },
  options: {
    invoices?: CfdiInvoice[];
    documents?: CfdiDocumentLinker;
    withoutHistory?: boolean;
    cancelInvoice?: Pick<CancelInvoice, "execute">;
    withoutCancel?: boolean;
  } = {},
) {
  const repo = new InMemoryAccountRepository(accounts);
  const invoices = new InMemoryCfdiInvoiceRepository(options.invoices ?? [issuedInvoice]);

  const router = createBillingRouter({
    account: repo,
    issueInvoice: issueInvoice ?? undefined,
    invoices: options.withoutHistory ? undefined : invoices,
    documents: options.documents,
    cancelInvoice: options.withoutCancel ? undefined : options.cancelInvoice,
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

describe("billing.invoices.list", () => {
  it("lists only issued invoices of the caller", async () => {
    const failed: CfdiInvoice = {
      ...issuedInvoice,
      id: "cfdi-failed",
      status: "failed",
      uuid: null,
      providerId: null,
      xmlKey: null,
      pdfKey: null,
      failureReason: "CSD rejected",
    };
    const foreign: CfdiInvoice = { ...issuedInvoice, id: "cfdi-foreign", accountId: "acc-2" };
    const { caller } = setup([account], null, { invoices: [issuedInvoice, failed, foreign] });

    const page = await caller.invoices.list({ limit: 20, offset: 0 });

    expect(page.items).toEqual([
      {
        id: "cfdi-1",
        uuid: "0F1B9C7A-3C4D-4E5F-8A9B-0C1D2E3F4A5B",
        issuedAt: issuedInvoice.createdAt,
        status: "issued",
        hasXml: true,
        hasPdf: true,
        cancellationMotive: null,
        cancellationResolvedAt: null,
        cancellationExpiresAt: null,
        cancellationDetail: null,
      },
    ]);
  });

  it("answers PRECONDITION_FAILED when the history is not configured", async () => {
    const { caller } = setup([account], null, { withoutHistory: true });

    await expect(caller.invoices.list({ limit: 20, offset: 0 })).rejects.toMatchObject({
      code: "PRECONDITION_FAILED",
    });
  });
});

describe("billing.invoices.downloadUrl", () => {
  const documents: CfdiDocumentLinker = {
    signedDownloadUrl: async ({ key, fileName, contentType }) =>
      `https://r2.test/${key}?name=${fileName}&type=${contentType}`,
  };

  it("signs the PDF of the caller's invoice with its filename", async () => {
    const { caller } = setup([account], null, { documents });

    const result = await caller.invoices.downloadUrl({ id: "cfdi-1", format: "pdf" });

    expect(result).toEqual({
      url: expect.stringContaining("cfdi/acc-1/1.pdf"),
      fileName: "CFDI-0F1B9C7A-3C4D-4E5F-8A9B-0C1D2E3F4A5B.pdf",
      expiresInSeconds: 300,
    });
    expect(result.url).toContain("application/pdf");
  });

  it("signs the XML when that format is requested", async () => {
    const { caller } = setup([account], null, { documents });

    const result = await caller.invoices.downloadUrl({ id: "cfdi-1", format: "xml" });

    expect(result.fileName).toBe("CFDI-0F1B9C7A-3C4D-4E5F-8A9B-0C1D2E3F4A5B.xml");
    expect(result.url).toContain("cfdi/acc-1/1.xml");
  });

  it("answers NOT_FOUND for an invoice of another account", async () => {
    const foreign: CfdiInvoice = { ...issuedInvoice, accountId: "acc-2" };
    const { caller } = setup([account], null, { invoices: [foreign], documents });

    await expect(
      caller.invoices.downloadUrl({ id: "cfdi-1", format: "pdf" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("answers CONFLICT when that file was never archived", async () => {
    const withoutPdf: CfdiInvoice = { ...issuedInvoice, pdfKey: null };
    const { caller } = setup([account], null, { invoices: [withoutPdf], documents });

    await expect(
      caller.invoices.downloadUrl({ id: "cfdi-1", format: "pdf" }),
    ).rejects.toMatchObject({ code: "CONFLICT", message: "This invoice has no PDF available" });
  });

  it("answers PRECONDITION_FAILED when signing is not configured", async () => {
    const { caller } = setup([account], null, {});

    await expect(
      caller.invoices.downloadUrl({ id: "cfdi-1", format: "pdf" }),
    ).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
  });
});

describe("billing.invoices.cancel", () => {
  it("cancels through the use case and reports the resulting state", async () => {
    const cancelled: CfdiInvoice = {
      ...issuedInvoice,
      status: "cancelled",
      cancellationMotive: "03",
      cancellationRequestedAt: new Date("2026-11-18T20:00:00Z"),
      cancellationResolvedAt: new Date("2026-11-18T20:00:05Z"),
      acuseKey: "cfdi/acc-1/1-acuse.xml",
    };
    const calls: Array<{ accountId: string; invoiceId: string; motive: string }> = [];
    const { caller } = setup([account], null, {
      cancelInvoice: {
        execute: async (command) => {
          calls.push(command);

          return cancelled;
        },
      },
    });

    const result = await caller.invoices.cancel({ id: "cfdi-1", motive: "03" });

    expect(calls).toEqual([{ accountId: "acc-1", invoiceId: "cfdi-1", motive: "03" }]);
    expect(result.invoice).toMatchObject({
      id: "cfdi-1",
      status: "cancelled",
      cancellationMotive: "03",
    });
  });

  it("answers PRECONDITION_FAILED when cancellation is not configured", async () => {
    const { caller } = setup([account], null, { withoutCancel: true });

    await expect(caller.invoices.cancel({ id: "cfdi-1", motive: "03" })).rejects.toMatchObject({
      code: "PRECONDITION_FAILED",
    });
  });
});
