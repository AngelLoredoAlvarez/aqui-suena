import { CancelInvoice } from "@aqui-suena/api/domain/billing/invoices/cancel-invoice";
import {
  type CfdiDocumentStore,
  type CfdiInvoice,
  type CfdiInvoiceStatus,
  InMemoryCfdiInvoiceRepository,
} from "@aqui-suena/api/domain/billing/invoices/invoice";
import type {
  CancelInvoiceRequest,
  InvoiceCancellationResult,
  InvoiceCanceller,
} from "@aqui-suena/api/domain/billing/invoices/invoice-canceller";
import { InvoiceProviderRejection } from "@aqui-suena/api/domain/billing/invoices/invoice-issuer";
import { ConflictError, NotFoundError, ValidationError } from "@aqui-suena/api/shared/domain-error";
import { describe, expect, it } from "vitest";

const NOW = new Date("2026-11-18T20:00:00Z");

function invoice(overrides: Partial<CfdiInvoice> = {}): CfdiInvoice {
  return {
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
    createdAt: new Date("2026-05-10T18:00:00Z"),
    updatedAt: new Date("2026-05-10T18:00:00Z"),
    ...overrides,
  };
}

class FakeCanceller implements InvoiceCanceller {
  readonly calls: CancelInvoiceRequest[] = [];

  constructor(private readonly answer: InvoiceCancellationResult | Error) {}

  async cancel(request: CancelInvoiceRequest): Promise<InvoiceCancellationResult> {
    this.calls.push(request);

    if (this.answer instanceof Error) {
      throw this.answer;
    }

    return this.answer;
  }

  async cancellationStatus(): Promise<InvoiceCancellationResult> {
    throw new Error("not used in these tests");
  }
}

class FakeDocumentStore implements CfdiDocumentStore {
  readonly acuses: Array<{ accountId: string; xml: string }> = [];

  constructor(private readonly shouldFail = false) {}

  async saveXml(): Promise<string> {
    throw new Error("not used in these tests");
  }

  async savePdf(): Promise<string> {
    throw new Error("not used in these tests");
  }

  async saveAcuse(input: { accountId: string; xml: string }): Promise<string> {
    if (this.shouldFail) {
      throw new Error("R2 cfdi upload failed: 403");
    }

    this.acuses.push(input);

    return `cfdi/${input.accountId}/${this.acuses.length}-acuse.xml`;
  }
}

const cancelled: InvoiceCancellationResult = {
  outcome: "cancelled",
  providerStatus: "canceled",
  detail: null,
  expiresAt: null,
  resolvedAt: new Date("2026-11-18T20:00:05Z"),
  acuseXml: "<Acuse/>",
};

function setup(
  options: {
    invoices?: CfdiInvoice[];
    answer?: InvoiceCancellationResult | Error;
    acuseFails?: boolean;
    onArchiveError?: (error: unknown, accountId: string) => void;
  } = {},
) {
  const repository = new InMemoryCfdiInvoiceRepository(options.invoices ?? [invoice()]);
  const canceller = new FakeCanceller(options.answer ?? cancelled);
  const documents = new FakeDocumentStore(options.acuseFails ?? false);

  const useCase = new CancelInvoice({
    invoices: repository,
    canceller,
    documents,
    now: () => NOW,
    onArchiveError: options.onArchiveError,
  });

  return { useCase, repository, canceller, documents };
}

describe("CancelInvoice", () => {
  it("cancels, records the motive and archives the acuse", async () => {
    const { useCase, canceller, documents } = setup();

    const result = await useCase.execute({
      accountId: "acc-1",
      invoiceId: "cfdi-1",
      motive: "03",
    });

    expect(canceller.calls).toEqual([{ providerId: "fac-1", motive: "03" }]);
    expect(result).toMatchObject({
      status: "cancelled",
      cancellationMotive: "03",
      acuseKey: "cfdi/acc-1/1-acuse.xml",
      cancellationDetail: null,
    });
    expect(result.cancellationRequestedAt).toEqual(NOW);
    expect(result.cancellationResolvedAt).toEqual(new Date("2026-11-18T20:00:05Z"));
    expect(documents.acuses).toHaveLength(1);
  });

  it("keeps the invoice pending when the receiver has not answered", async () => {
    const { useCase } = setup({
      answer: {
        outcome: "pending",
        providerStatus: "pending",
        detail: "En espera de aceptación del receptor",
        expiresAt: new Date("2026-11-21T20:00:00Z"),
        resolvedAt: null,
        acuseXml: null,
      },
    });

    const result = await useCase.execute({
      accountId: "acc-1",
      invoiceId: "cfdi-1",
      motive: "03",
    });

    expect(result.status).toBe("cancellation_pending");
    expect(result.cancellationExpiresAt).toEqual(new Date("2026-11-21T20:00:00Z"));
    expect(result.cancellationResolvedAt).toBeNull();
    expect(result.acuseKey).toBeNull();
  });

  it("marks a rejection without cancelling: the invoice stays valid", async () => {
    const { useCase } = setup({
      answer: {
        outcome: "rejected",
        providerStatus: "rejected",
        detail: "El receptor rechazó la cancelación",
        expiresAt: null,
        resolvedAt: new Date("2026-11-19T10:00:00Z"),
        acuseXml: null,
      },
    });

    const result = await useCase.execute({
      accountId: "acc-1",
      invoiceId: "cfdi-1",
      motive: "03",
    });

    expect(result.status).toBe("cancellation_rejected");
    expect(result.cancellationDetail).toBe("El receptor rechazó la cancelación");
    expect(result.cancellationResolvedAt).toEqual(new Date("2026-11-19T10:00:00Z"));
  });

  it("returns the invoice to issued when the PAC says it is not cancellable", async () => {
    const { useCase } = setup({
      answer: {
        outcome: "not_cancellable",
        providerStatus: "active",
        detail: "Tiene documentos relacionados",
        expiresAt: null,
        resolvedAt: null,
        acuseXml: null,
      },
    });

    const result = await useCase.execute({
      accountId: "acc-1",
      invoiceId: "cfdi-1",
      motive: "03",
    });

    expect(result.status).toBe("issued");
    expect(result.cancellationDetail).toBe("Tiene documentos relacionados");
    expect(result.cancellationResolvedAt).toEqual(NOW);
  });

  it("refuses a cancellation outside the legal window without calling the PAC", async () => {
    const { useCase, canceller } = setup({
      invoices: [invoice({ createdAt: new Date("2024-01-10T18:00:00Z") })],
    });

    const error = await useCase
      .execute({ accountId: "acc-1", invoiceId: "cfdi-1", motive: "03" })
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ValidationError);
    expect(error).toMatchObject({
      message: "The cancellation window for this invoice closed in 3/2025",
    });
    expect(canceller.calls).toHaveLength(0);
  });

  it("refuses an invoice that is not issued", async () => {
    const { useCase, canceller } = setup({
      invoices: [invoice({ status: "cancelled" as CfdiInvoiceStatus })],
    });

    const error = await useCase
      .execute({ accountId: "acc-1", invoiceId: "cfdi-1", motive: "03" })
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ConflictError);
    expect(error).toMatchObject({
      message: "Only an issued invoice can be cancelled (current status: cancelled)",
    });
    expect(canceller.calls).toHaveLength(0);
  });

  it("answers NOT_FOUND for an invoice of another account", async () => {
    const { useCase } = setup({ invoices: [invoice({ accountId: "acc-2" })] });

    await expect(
      useCase.execute({ accountId: "acc-1", invoiceId: "cfdi-1", motive: "03" }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("loses the race to a concurrent request without calling the PAC twice", async () => {
    // A row already claimed by someone else: the compare-and-set matches nothing.
    const { useCase, canceller } = setup({
      invoices: [
        invoice({
          status: "cancellation_pending",
          cancellationMotive: "03",
          cancellationRequestedAt: NOW,
        }),
      ],
    });

    const error = await useCase
      .execute({ accountId: "acc-1", invoiceId: "cfdi-1", motive: "03" })
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ConflictError);
    expect(canceller.calls).toHaveLength(0);
  });

  it("restores issued with the reason when the PAC refuses the request", async () => {
    const rejection = new InvoiceProviderRejection("El CFDI no existe");
    const { useCase, repository } = setup({ answer: rejection });

    const error = await useCase
      .execute({ accountId: "acc-1", invoiceId: "cfdi-1", motive: "03" })
      .catch((caught: unknown) => caught);

    expect(error).toBe(rejection);

    const row = await repository.getByIdForAccount("acc-1", "cfdi-1");

    expect(row).toMatchObject({
      status: "issued",
      cancellationDetail: "El CFDI no existe",
      acuseKey: null,
    });
  });

  it("still cancels when the acuse cannot be archived", async () => {
    const reported: string[] = [];
    const { useCase } = setup({
      acuseFails: true,
      onArchiveError: (_error, accountId) => reported.push(accountId),
    });

    const result = await useCase.execute({
      accountId: "acc-1",
      invoiceId: "cfdi-1",
      motive: "03",
    });

    expect(result.status).toBe("cancelled");
    expect(result.acuseKey).toBeNull();
    expect(reported).toEqual(["acc-1"]);
  });
});
