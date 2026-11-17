import type { FiscalProfile } from "@aqui-suena/api/domain/billing/fiscal/fiscal-profile";
import {
  type CfdiXmlStore,
  InMemoryCfdiInvoiceRepository,
} from "@aqui-suena/api/domain/billing/invoices/invoice";
import {
  type InvoiceIssuer,
  InvoiceProviderRejection,
  type IssuedCfdi,
  type IssueInvoiceRequest,
} from "@aqui-suena/api/domain/billing/invoices/invoice-issuer";
import { IssueInvoice } from "@aqui-suena/api/domain/billing/invoices/issue-invoice";
import {
  InMemorySubscriptionRepository,
  type Subscription,
} from "@aqui-suena/api/domain/billing/subscriptions/subscription";
import { DEFAULT_PLAN_CATALOG } from "@aqui-suena/api/domain/plans/catalog";
import type { PlanId } from "@aqui-suena/api/domain/plans/entitlements";
import { InMemoryPlanRepository } from "@aqui-suena/api/domain/plans/plans";
import { UpgradeRequired, ValidationError } from "@aqui-suena/api/shared/domain-error";
import { describe, expect, it } from "vitest";

const NOW = new Date("2026-11-16T18:00:00Z");

const completeProfile: FiscalProfile = {
  rfc: "EKU9003173C9",
  legalName: "ESCUELA KEMPER URGATE",
  taxRegime: "601",
  taxZipCode: "42501",
  cfdiUse: "G01",
  billingEmail: "facturas@example.com",
};

class FakeFiscalProfiles {
  constructor(private readonly profile: FiscalProfile | null) {}

  async getFiscalProfile(): Promise<FiscalProfile | null> {
    return this.profile;
  }
}

class FakeInvoiceIssuer implements InvoiceIssuer {
  readonly requests: IssueInvoiceRequest[] = [];

  constructor(private readonly result: IssuedCfdi | Error) {}

  async issue(request: IssueInvoiceRequest): Promise<IssuedCfdi> {
    this.requests.push(request);

    if (this.result instanceof Error) {
      throw this.result;
    }

    return this.result;
  }
}

class FakeCfdiXmlStore implements CfdiXmlStore {
  readonly saved: Array<{ accountId: string; xml: string }> = [];

  constructor(private readonly shouldFail = false) {}

  async save(input: { accountId: string; xml: string }): Promise<string> {
    if (this.shouldFail) {
      throw new Error("R2 cfdi upload failed: 403");
    }

    this.saved.push(input);

    return `cfdi/${input.accountId}/${this.saved.length}.xml`;
  }
}

function paidSubscription(planId: PlanId = "commerce"): Subscription {
  return {
    id: "sub-1",
    accountId: "acc-1",
    planId,
    status: "active",
    startedAt: new Date("2026-11-01T00:00:00Z"),
    endsAt: new Date("2026-12-01T00:00:00Z"),
    graceEnd: null,
    createdAt: new Date("2026-11-01T00:00:00Z"),
    updatedAt: new Date("2026-11-01T00:00:00Z"),
  };
}

function setup(
  options: {
    profile?: FiscalProfile | null;
    subscription?: Subscription | null;
    issuerResult?: Error | IssuedCfdi;
    xmlSaveFails?: boolean;
    onArchiveError?: (error: unknown, accountId: string) => void;
  } = {},
) {
  const issuer = new FakeInvoiceIssuer(
    options.issuerResult ?? {
      providerId: "fac-1",
      uuid: "0F1B9C7A-3C4D-4E5F-8A9B-0C1D2E3F4A5B",
      xml: "<cfdi:Comprobante/>",
    },
  );

  const invoices = new InMemoryCfdiInvoiceRepository();

  const xml = new FakeCfdiXmlStore(options.xmlSaveFails ?? false);

  const fiscalProfiles = new FakeFiscalProfiles(
    options.profile === undefined ? completeProfile : options.profile,
  );

  const subscriptions = new InMemorySubscriptionRepository(
    options.subscription === null ? [] : [options.subscription ?? paidSubscription()],
  );

  const issueInvoice = new IssueInvoice({
    fiscalProfiles,
    subscriptions,
    plans: new InMemoryPlanRepository([...DEFAULT_PLAN_CATALOG]),
    issuer,
    invoices,
    xml,
    now: () => NOW,
    onArchiveError: options.onArchiveError,
  });

  return { issueInvoice, issuer, invoices, xml };
}

describe("IssueInvoice", () => {
  it("issues a CFDI for the active paid plan and stores the XML", async () => {
    const { issueInvoice, issuer, xml } = setup();

    const invoice = await issueInvoice.execute("acc-1");

    expect(issuer.requests).toHaveLength(1);
    expect(issuer.requests[0]).toMatchObject({
      accountId: "acc-1",
      planId: "commerce",
      amountCents: 9900,
      currency: "MXN",
      fiscalProfile: completeProfile,
      issuedAt: NOW,
    });
    expect(invoice).toMatchObject({
      accountId: "acc-1",
      status: "issued",
      providerId: "fac-1",
      uuid: "0F1B9C7A-3C4D-4E5F-8A9B-0C1D2E3F4A5B",
    });
    expect(invoice.xmlKey).toBe("cfdi/acc-1/1.xml");
    expect(xml.saved).toEqual([{ accountId: "acc-1", xml: "<cfdi:Comprobante/>" }]);
  });

  it("rejects a community account without reaching the provider", async () => {
    const { issueInvoice, issuer, invoices } = setup({ subscription: null });

    const error = await issueInvoice.execute("acc-1").catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(UpgradeRequired);
    expect(error).toMatchObject({ hint: "billing.upgradeRequired.invoiceIssue" });
    expect(issuer.requests).toHaveLength(0);
    expect(invoices.rows).toHaveLength(0);
  });

  it("still invoices a cancelled subscription that has paid time left", async () => {
    const { issueInvoice, issuer } = setup({
      subscription: { ...paidSubscription(), status: "cancelled" },
    });

    const invoice = await issueInvoice.execute("acc-1");

    expect(issuer.requests).toHaveLength(1);
    expect(invoice.status).toBe("issued");
  });

  it("rejects the request when the account has no fiscal profile", async () => {
    const { issueInvoice, issuer, invoices } = setup({ profile: null });

    const error = await issueInvoice.execute("acc-1").catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ValidationError);
    expect(error).toMatchObject({
      message: "fiscalProfile: complete the fiscal data before requesting an invoice",
    });
    expect(issuer.requests).toHaveLength(0);
    expect(invoices.rows).toHaveLength(0);
  });

  it("persists a failed attempt and rethrows when the provider rejects", async () => {
    const rejection = new InvoiceProviderRejection("CSD EKU9003173C9 is not valid");

    const { issueInvoice, invoices, xml } = setup({ issuerResult: rejection });

    const error = await issueInvoice.execute("acc-1").catch((caught: unknown) => caught);

    expect(error).toBe(rejection);
    expect(invoices.rows).toHaveLength(1);
    expect(invoices.rows[0]).toMatchObject({
      status: "failed",
      failureReason: "CSD EKU9003173C9 is not valid",
      uuid: null,
      xmlKey: null,
    });
    expect(xml.saved).toHaveLength(0);
  });

  it("does not persist anything when the issuer throws an unexpected error", async () => {
    const { issueInvoice, invoices } = setup({ issuerResult: new TypeError("boom") });

    const error = await issueInvoice.execute("acc-1").catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(TypeError);
    expect(invoices.rows).toHaveLength(0);
  });

  it("reports the archive failure while still recording the stamp", async () => {
    const reported: string[] = [];
    const { issueInvoice, invoices } = setup({
      xmlSaveFails: true,
      onArchiveError: (_error, accountId) => reported.push(accountId),
    });

    const invoice = await issueInvoice.execute("acc-1");

    expect(invoice).toMatchObject({ status: "issued", xmlKey: null });
    expect(invoices.rows).toHaveLength(1);
    expect(reported).toEqual(["acc-1"]);
  });
});
