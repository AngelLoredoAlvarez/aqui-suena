import { InMemoryAccountRepository } from "@aqui-suena/api/domain/accounts/account-repository";
import type { FiscalProfile } from "@aqui-suena/api/domain/accounts/fiscal-profile";
import type {
  CfdiInvoiceNotification,
  CfdiNotifier,
  CfdiRecipient,
} from "@aqui-suena/api/domain/billing/invoices/cfdi-notifier";
import {
  type CfdiDocumentStore,
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
  InMemoryPaymentRepository,
  type Payment,
} from "@aqui-suena/api/domain/billing/payments/payment";
import { DEFAULT_PLAN_CATALOG } from "@aqui-suena/api/domain/plans/catalog";
import { InMemoryPlanRepository } from "@aqui-suena/api/domain/plans/plans";
import { NotFoundError, ValidationError } from "@aqui-suena/api/shared/domain-error";
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

  constructor(
    private readonly result: IssuedCfdi | Error,
    private readonly pdf: Uint8Array | Error = new TextEncoder().encode("%PDF-1.4"),
  ) {}

  async issue(request: IssueInvoiceRequest): Promise<IssuedCfdi> {
    this.requests.push(request);

    if (this.result instanceof Error) {
      throw this.result;
    }

    return this.result;
  }

  async downloadPdf(): Promise<Uint8Array> {
    if (this.pdf instanceof Error) {
      throw this.pdf;
    }

    return this.pdf;
  }
}

class FakeCfdiDocumentStore implements CfdiDocumentStore {
  readonly xmls: Array<{ accountId: string; xml: string }> = [];
  readonly pdfs: Array<{ accountId: string; pdf: Uint8Array }> = [];
  readonly acuses: Array<{ accountId: string; xml: string }> = [];

  constructor(
    private readonly xmlFails = false,
    private readonly pdfFails = false,
  ) {}

  async saveXml(input: { accountId: string; xml: string }): Promise<string> {
    if (this.xmlFails) {
      throw new Error("R2 cfdi upload failed: 403");
    }

    this.xmls.push(input);

    return `cfdi/${input.accountId}/${this.xmls.length}.xml`;
  }

  async saveAcuse(input: { accountId: string; xml: string }): Promise<string> {
    this.acuses.push(input);

    return `cfdi/${input.accountId}/${this.acuses.length}-acuse.xml`;
  }

  async savePdf(input: { accountId: string; pdf: Uint8Array }): Promise<string> {
    if (this.pdfFails) {
      throw new Error("R2 cfdi upload failed: 403");
    }

    this.pdfs.push(input);

    return `cfdi/${input.accountId}/${this.pdfs.length}.pdf`;
  }
}

class FakeCfdiNotifier implements CfdiNotifier {
  readonly sent: Array<{ recipient: CfdiRecipient; invoice: CfdiInvoiceNotification }> = [];

  constructor(private readonly failure?: Error) {}

  async invoiceIssued(recipient: CfdiRecipient, invoice: CfdiInvoiceNotification): Promise<void> {
    if (this.failure !== undefined) {
      throw this.failure;
    }

    this.sent.push({ recipient, invoice });
  }
}

function completedPayment(overrides: Partial<Payment> = {}): Payment {
  return {
    id: "pay-1",
    accountId: "acc-1",
    subscriptionId: "sub-1",
    planId: "commerce",
    billingInterval: "monthly",
    method: "card",
    provider: "conekta",
    providerOrderId: "ord-1",
    providerChargeId: "chg-1",
    idempotencyKey: "checkout:acc-1:commerce:monthly:card",
    amount: 14900,
    currency: "MXN",
    status: "completed",
    reference: null,
    nextActionUrl: null,
    expiresAt: null,
    failureReason: null,
    periodStart: new Date("2026-11-01T00:00:00Z"),
    periodEnd: new Date("2026-12-01T00:00:00Z"),
    paidAt: new Date("2026-11-01T00:05:00Z"),
    createdAt: new Date("2026-11-01T00:00:00Z"),
    updatedAt: new Date("2026-11-01T00:05:00Z"),
    ...overrides,
  };
}

function setup(
  options: {
    profile?: FiscalProfile | null;
    payment?: Payment | null;
    payments?: Payment[];
    issuerResult?: Error | IssuedCfdi;
    xmlSaveFails?: boolean;
    pdfSaveFails?: boolean;
    pdfDownloadFails?: boolean;
    notificationFails?: boolean;
    withoutNotifier?: boolean;
    accountDeleted?: boolean;
    onArchiveError?: (error: unknown, accountId: string) => void;
  } = {},
) {
  const deliveryErrors: Array<{ stage: string; subjectId: string }> = [];

  const issuer = new FakeInvoiceIssuer(
    options.issuerResult ?? {
      providerId: "fac-1",
      uuid: "0F1B9C7A-3C4D-4E5F-8A9B-0C1D2E3F4A5B",
      xml: "<cfdi:Comprobante/>",
    },
    options.pdfDownloadFails ? new InvoiceProviderRejection("El CFDI no existe") : undefined,
  );

  const invoices = new InMemoryCfdiInvoiceRepository();

  const documents = new FakeCfdiDocumentStore(
    options.xmlSaveFails ?? false,
    options.pdfSaveFails ?? false,
  );

  const notifier = options.withoutNotifier
    ? undefined
    : new FakeCfdiNotifier(
        options.notificationFails ? new Error("Resend API error 500: mail failed") : undefined,
      );

  const accounts = new InMemoryAccountRepository([
    {
      id: "acc-1",
      email: "owner@example.com",
      planId: "commerce",
      locale: "es-MX",
      deletedAt: options.accountDeleted ? new Date("2026-11-17T00:00:00Z") : null,
    },
  ]);

  const fiscalProfiles = new FakeFiscalProfiles(
    options.profile === undefined ? completeProfile : options.profile,
  );

  const payments = new InMemoryPaymentRepository(
    options.payments ?? (options.payment === null ? [] : [options.payment ?? completedPayment()]),
  );

  const issueInvoice = new IssueInvoice({
    fiscalProfiles,
    payments,
    plans: new InMemoryPlanRepository([...DEFAULT_PLAN_CATALOG]),
    issuer,
    invoices,
    documents,
    accounts,
    notifier,
    downloadUrl: "https://aquisuena.mx/cuenta/suscripcion",
    now: () => NOW,
    onArchiveError: options.onArchiveError,
    onDeliveryError: (_error, stage, subjectId) => deliveryErrors.push({ stage, subjectId }),
  });

  return { issueInvoice, issuer, invoices, documents, notifier, deliveryErrors };
}

describe("IssueInvoice", () => {
  it("issues a CFDI for the latest completed payment and stores the XML", async () => {
    const { issueInvoice, issuer, documents } = setup();

    const invoice = await issueInvoice.execute("acc-1");

    expect(issuer.requests).toHaveLength(1);
    expect(issuer.requests[0]).toMatchObject({
      accountId: "acc-1",
      planId: "commerce",
      amountCents: 14900,
      currency: "MXN",
      fiscalProfile: completeProfile,
      issuedAt: NOW,
      paymentForm: "04",
    });
    expect(invoice).toMatchObject({
      accountId: "acc-1",
      paymentId: "pay-1",
      status: "issued",
      providerId: "fac-1",
      uuid: "0F1B9C7A-3C4D-4E5F-8A9B-0C1D2E3F4A5B",
    });
    expect(invoice.xmlKey).toBe("cfdi/acc-1/1.xml");
    expect(documents.xmls).toEqual([{ accountId: "acc-1", xml: "<cfdi:Comprobante/>" }]);
  });

  it("rejects the request without a completed payment", async () => {
    const { issueInvoice, issuer, invoices } = setup({ payment: null });

    const error = await issueInvoice.execute("acc-1").catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ValidationError);
    expect(error).toMatchObject({
      message: "A completed payment is required before requesting an invoice",
    });
    expect(issuer.requests).toHaveLength(0);
    expect(invoices.rows).toHaveLength(0);
  });

  it("uses the paid amount and interval of an annual payment", async () => {
    const { issueInvoice, issuer, notifier } = setup({
      payment: completedPayment({
        billingInterval: "annual",
        method: "cash",
        amount: 99000,
      }),
    });

    const invoice = await issueInvoice.execute("acc-1");

    expect(issuer.requests[0]).toMatchObject({
      planId: "commerce",
      amountCents: 99000,
      paymentForm: "01",
    });
    expect(notifier?.sent[0]?.invoice).toMatchObject({ amountMinorUnits: 99000 });
    expect(invoice.paymentId).toBe("pay-1");
  });

  it("maps a SPEI payment to the transfer payment form", async () => {
    const { issueInvoice, issuer } = setup({
      payment: completedPayment({ method: "spei", amount: 9900 }),
    });

    await issueInvoice.execute("acc-1");

    expect(issuer.requests[0]).toMatchObject({ amountCents: 9900, paymentForm: "03" });
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

    const { issueInvoice, invoices, documents } = setup({ issuerResult: rejection });

    const error = await issueInvoice.execute("acc-1").catch((caught: unknown) => caught);

    expect(error).toBe(rejection);
    expect(invoices.rows).toHaveLength(1);
    expect(invoices.rows[0]).toMatchObject({
      status: "failed",
      failureReason: "CSD EKU9003173C9 is not valid",
      uuid: null,
      xmlKey: null,
    });
    expect(documents.xmls).toHaveLength(0);
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

  it("archives the PDF and records its key in the same invoice", async () => {
    const { issueInvoice, documents, notifier } = setup();

    const invoice = await issueInvoice.execute("acc-1");

    expect(documents.pdfs).toHaveLength(1);
    expect(invoice.pdfKey).toBe("cfdi/acc-1/1.pdf");
    expect(notifier?.sent[0]?.invoice.pdf).toEqual(new TextEncoder().encode("%PDF-1.4"));
    expect(notifier?.sent[0]?.recipient).toEqual({
      email: "owner@example.com",
      locale: "es-MX",
    });
    expect(notifier?.sent[0]?.invoice).toMatchObject({
      invoiceId: invoice.id,
      uuid: "0F1B9C7A-3C4D-4E5F-8A9B-0C1D2E3F4A5B",
      planName: "Comercios & Catálogo",
      amountMinorUnits: 14900,
      currency: "MXN",
      downloadUrl: "https://aquisuena.mx/cuenta/suscripcion",
      xml: "<cfdi:Comprobante/>",
    });
  });

  it("still issues and emails when the PDF download fails", async () => {
    const { issueInvoice, notifier, deliveryErrors } = setup({ pdfDownloadFails: true });

    const invoice = await issueInvoice.execute("acc-1");

    expect(invoice.status).toBe("issued");
    expect(invoice.pdfKey).toBeNull();
    expect(notifier?.sent[0]?.invoice.pdf).toBeUndefined();
    expect(deliveryErrors[0]).toMatchObject({ stage: "pdf", subjectId: "fac-1" });
  });

  it("keeps the invoice when the PDF archive fails", async () => {
    const { issueInvoice, documents, notifier } = setup({ pdfSaveFails: true });

    const invoice = await issueInvoice.execute("acc-1");

    expect(invoice.status).toBe("issued");
    expect(invoice.pdfKey).toBeNull();
    expect(documents.pdfs).toHaveLength(0);
    expect(notifier?.sent[0]?.invoice.pdf).toBeDefined();
  });

  it("still issues when the email fails", async () => {
    const { issueInvoice, deliveryErrors } = setup({ notificationFails: true });

    const invoice = await issueInvoice.execute("acc-1");

    expect(invoice.status).toBe("issued");
    expect(deliveryErrors[0]).toMatchObject({ stage: "email", subjectId: invoice.id });
  });

  it("never emails a deleted account", async () => {
    const { issueInvoice, notifier } = setup({ accountDeleted: true });

    const invoice = await issueInvoice.execute("acc-1");

    expect(invoice.status).toBe("issued");
    expect(notifier?.sent).toHaveLength(0);
  });

  it("issues without delivery when no notifier is configured", async () => {
    const { issueInvoice, deliveryErrors } = setup({ withoutNotifier: true });

    const invoice = await issueInvoice.execute("acc-1");

    expect(invoice.status).toBe("issued");
    expect(deliveryErrors).toHaveLength(0);
  });
});

describe("IssueInvoice substitution", () => {
  it("stamps a substitute for a specific payment and relates it to the original", async () => {
    const { issueInvoice, issuer, invoices } = setup({
      payments: [
        completedPayment({ id: "pay-old", paidAt: new Date("2026-11-01T00:05:00Z") }),
        completedPayment({ id: "pay-new", paidAt: new Date("2026-11-10T00:05:00Z") }),
      ],
    });

    const invoice = await issueInvoice.execute("acc-1", {
      paymentId: "pay-old",
      substitutesUuid: "0F1B9C7A-3C4D-4E5F-8A9B-0C1D2E3F4A5B",
    });

    expect(issuer.requests[0]).toMatchObject({
      substitutesUuid: "0F1B9C7A-3C4D-4E5F-8A9B-0C1D2E3F4A5B",
      amountCents: 14900,
    });
    expect(invoice.paymentId).toBe("pay-old");
    expect(invoices.rows[0]?.substitutionUuid).toBeNull();
  });

  it("refuses a payment that belongs to another account", async () => {
    const { issueInvoice, issuer } = setup({
      payments: [completedPayment({ id: "pay-2", accountId: "acc-2" })],
    });

    await expect(
      issueInvoice.execute("acc-1", {
        paymentId: "pay-2",
        substitutesUuid: "0F1B9C7A-3C4D-4E5F-8A9B-0C1D2E3F4A5B",
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(issuer.requests).toHaveLength(0);
  });

  it("requires the payment id when a substitute is requested", async () => {
    const { issueInvoice, issuer } = setup();

    await expect(
      issueInvoice.execute("acc-1", {
        substitutesUuid: "0F1B9C7A-3C4D-4E5F-8A9B-0C1D2E3F4A5B",
      }),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(issuer.requests).toHaveLength(0);
  });
});
