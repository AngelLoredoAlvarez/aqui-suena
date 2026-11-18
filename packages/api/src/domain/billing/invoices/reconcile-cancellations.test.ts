import type {
  CfdiDocumentStore,
  CfdiInvoice,
  InMemoryCfdiInvoiceRepository,
} from "@aqui-suena/api/domain/billing/invoices/invoice";
import { InMemoryCfdiInvoiceRepository as Repository } from "@aqui-suena/api/domain/billing/invoices/invoice";
import type {
  InvoiceCancellationResult,
  InvoiceCanceller,
} from "@aqui-suena/api/domain/billing/invoices/invoice-canceller";
import { ReconcileCancellations } from "@aqui-suena/api/domain/billing/invoices/reconcile-cancellations";
import { describe, expect, it } from "vitest";

const NOW = new Date("2026-11-25T20:00:00Z");
const INVOICE_UUID = "0F1B9C7A-3C4D-4E5F-8A9B-0C1D2E3F4A5B";

function acuseFor(uuid: string): string {
  return `<Acuse><Folios><UUID>${uuid}</UUID></Folios></Acuse>`;
}

function pending(overrides: Partial<CfdiInvoice> = {}): CfdiInvoice {
  return {
    id: "cfdi-1",
    accountId: "acc-1",
    paymentId: null,
    status: "cancellation_pending",
    uuid: "0F1B9C7A-3C4D-4E5F-8A9B-0C1D2E3F4A5B",
    providerId: "fac-1",
    xmlKey: "cfdi/acc-1/1.xml",
    pdfKey: "cfdi/acc-1/1.pdf",
    failureReason: null,
    cancellationMotive: "03",
    cancellationRequestedAt: new Date("2026-11-20T10:00:00Z"),
    cancellationResolvedAt: null,
    cancellationExpiresAt: new Date("2026-11-23T10:00:00Z"),
    cancellationDetail: null,
    acuseKey: null,
    createdAt: new Date("2026-11-20T10:00:00Z"),
    updatedAt: new Date("2026-11-20T10:00:00Z"),
    ...overrides,
  };
}

class FakeCanceller implements InvoiceCanceller {
  readonly checks: string[] = [];

  constructor(private readonly answer: InvoiceCancellationResult | Error) {}

  async cancel(): Promise<InvoiceCancellationResult> {
    throw new Error("not used in these tests");
  }

  async cancellationStatus(providerId: string): Promise<InvoiceCancellationResult> {
    this.checks.push(providerId);

    if (this.answer instanceof Error) {
      throw this.answer;
    }

    return this.answer;
  }
}

class FakeDocumentStore implements CfdiDocumentStore {
  readonly acuses: string[] = [];

  async saveXml(): Promise<string> {
    throw new Error("not used in these tests");
  }

  async savePdf(): Promise<string> {
    throw new Error("not used in these tests");
  }

  async saveAcuse(input: { xml: string }): Promise<string> {
    this.acuses.push(input.xml);

    return `cfdi/acc-1/${this.acuses.length}-acuse.xml`;
  }
}

const cancelled: InvoiceCancellationResult = {
  outcome: "cancelled",
  providerStatus: "expired",
  detail: null,
  expiresAt: null,
  resolvedAt: new Date("2026-11-24T10:00:00Z"),
  acuseXml: acuseFor(INVOICE_UUID),
};

function setup(
  options: {
    invoices?: CfdiInvoice[];
    answer?: InvoiceCancellationResult | Error;
    onError?: (error: unknown, invoiceId: string) => void;
  } = {},
) {
  const repository = new Repository(options.invoices ?? [pending()]);
  const canceller = new FakeCanceller(options.answer ?? cancelled);
  const documents = new FakeDocumentStore();

  const reconcile = new ReconcileCancellations({
    invoices: repository,
    canceller,
    documents,
    now: () => NOW,
    onError: options.onError,
  });

  return { reconcile, repository, canceller, documents };
}

async function rowOf(repository: InMemoryCfdiInvoiceRepository, id = "cfdi-1") {
  return repository.getByIdForAccount("acc-1", id);
}

describe("ReconcileCancellations", () => {
  it("turns a pending invoice into cancelled once the receiver window closed", async () => {
    const { reconcile, repository, documents } = setup();

    const result = await reconcile.execute({ accountId: "acc-1" });

    expect(result).toEqual({ checked: 1, updated: 1 });
    expect(await rowOf(repository)).toMatchObject({
      status: "cancelled",
      acuseKey: "cfdi/acc-1/1-acuse.xml",
      cancellationResolvedAt: new Date("2026-11-24T10:00:00Z"),
    });
    expect(documents.acuses).toHaveLength(1);
  });

  it("applies a rejection reported by the provider", async () => {
    const { reconcile, repository } = setup({
      answer: {
        outcome: "rejected",
        providerStatus: "rejected",
        detail: "El receptor rechazó la cancelación",
        expiresAt: null,
        resolvedAt: new Date("2026-11-24T09:00:00Z"),
        acuseXml: null,
      },
    });

    await reconcile.execute({ accountId: "acc-1" });

    expect(await rowOf(repository)).toMatchObject({
      status: "cancellation_rejected",
      cancellationDetail: "El receptor rechazó la cancelación",
    });
  });

  it("leaves a recently checked invoice alone", async () => {
    const { reconcile, canceller } = setup({
      invoices: [
        pending({
          cancellationExpiresAt: new Date("2026-12-01T10:00:00Z"),
          updatedAt: new Date("2026-11-25T19:55:00Z"),
        }),
      ],
    });

    const result = await reconcile.execute({ accountId: "acc-1" });

    expect(result).toEqual({ checked: 0, updated: 0 });
    expect(canceller.checks).toHaveLength(0);
  });

  it("checks an invoice nobody has looked at in a while", async () => {
    const { reconcile, canceller } = setup({
      invoices: [
        pending({
          cancellationExpiresAt: new Date("2026-12-01T10:00:00Z"),
          updatedAt: new Date("2026-11-25T18:00:00Z"),
        }),
      ],
    });

    const result = await reconcile.execute({ accountId: "acc-1" });

    expect(result).toEqual({ checked: 1, updated: 1 });
    expect(canceller.checks).toEqual(["fac-1"]);
  });

  it("keeps the row untouched when the provider fails, and reports it", async () => {
    const reported: string[] = [];
    const { reconcile, repository } = setup({
      answer: new Error("PAC down"),
      onError: (_error, invoiceId) => reported.push(invoiceId),
    });

    const result = await reconcile.execute({ accountId: "acc-1" });

    expect(result).toEqual({ checked: 1, updated: 0 });
    expect(reported).toEqual(["cfdi-1"]);
    expect(await rowOf(repository)).toMatchObject({ status: "cancellation_pending" });
  });

  it("ignores another account's pending invoices", async () => {
    const { reconcile, canceller } = setup({
      invoices: [pending({ id: "cfdi-2", accountId: "acc-2" })],
    });

    await reconcile.execute({ accountId: "acc-1" });

    expect(canceller.checks).toHaveLength(0);
  });
});

describe("ReconcileCancellations.executeAll", () => {
  it("sweeps pending rows across accounts, oldest first", async () => {
    const { reconcile, canceller } = setup({
      invoices: [
        pending({ id: "cfdi-a", accountId: "acc-1" }),
        pending({
          id: "cfdi-b",
          accountId: "acc-2",
          updatedAt: new Date("2026-11-19T10:00:00Z"),
        }),
      ],
    });

    const result = await reconcile.executeAll();

    expect(result).toEqual({ checked: 2, updated: 2 });
    expect(canceller.checks).toEqual(["fac-1", "fac-1"]);
  });
});
