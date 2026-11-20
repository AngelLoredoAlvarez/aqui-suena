import type {
  CfdiDocumentStore,
  CfdiInvoice,
} from "@aqui-suena/api/domain/billing/invoices/invoice";
import type { InvoiceIssuer } from "@aqui-suena/api/domain/billing/invoices/invoice-issuer";
import { RecoverMissingArchives } from "@aqui-suena/api/domain/billing/invoices/recover-missing-archives";
import { describe, expect, it } from "vitest";

const NOW = new Date("2026-11-20T18:00:00Z");

function invoice(overrides: Partial<CfdiInvoice> = {}): CfdiInvoice {
  return {
    id: "inv-1",
    accountId: "acc-1",
    paymentId: "pay-1",
    status: "issued",
    uuid: "0F1B9C7A-3C4D-4E5F-8A9B-0C1D2E3F4A5B",
    providerId: "fac-1",
    xmlKey: null,
    pdfKey: null,
    failureReason: null,
    cancellationMotive: null,
    cancellationRequestedAt: null,
    cancellationResolvedAt: null,
    cancellationExpiresAt: null,
    cancellationDetail: null,
    acuseKey: null,
    substitutionUuid: null,
    createdAt: new Date("2026-11-19T18:00:00Z"),
    updatedAt: new Date("2026-11-19T18:00:00Z"),
    ...overrides,
  };
}

type Attempt = {
  readonly id: string;
  readonly accountId: string;
  readonly xmlKey: string | null;
  readonly pdfKey: string | null;
  readonly attemptedAt: Date;
};

class FakeArchiveRepository {
  readonly attempts: Attempt[] = [];
  readonly listedLimits: number[] = [];

  constructor(private readonly rows: CfdiInvoice[]) {}

  async listMissingArchivesForAllAccounts(input: { limit: number }): Promise<CfdiInvoice[]> {
    this.listedLimits.push(input.limit);

    return this.rows.slice(0, input.limit);
  }

  async recordArchiveAttempt(input: Attempt): Promise<void> {
    this.attempts.push(input);
  }
}

class FakeProvider implements Pick<InvoiceIssuer, "downloadXml" | "downloadPdf"> {
  readonly xmlRequests: string[] = [];
  readonly pdfRequests: string[] = [];

  constructor(
    private readonly xml: string | Error = "<cfdi:Comprobante/>",
    private readonly pdf: Uint8Array | Error = new Uint8Array([0x25, 0x50, 0x44, 0x46]),
  ) {}

  async downloadXml(providerId: string): Promise<string> {
    this.xmlRequests.push(providerId);

    if (this.xml instanceof Error) {
      throw this.xml;
    }

    return this.xml;
  }

  async downloadPdf(providerId: string): Promise<Uint8Array> {
    this.pdfRequests.push(providerId);

    if (this.pdf instanceof Error) {
      throw this.pdf;
    }

    return this.pdf;
  }
}

class FakeDocumentStore implements Pick<CfdiDocumentStore, "saveXml" | "savePdf"> {
  readonly xmls: string[] = [];
  readonly pdfs: Uint8Array[] = [];

  constructor(
    private readonly xmlFails = false,
    private readonly pdfFails = false,
  ) {}

  async saveXml(input: { accountId: string; xml: string }): Promise<string> {
    if (this.xmlFails) {
      throw new Error("R2 cfdi upload failed: 403");
    }

    this.xmls.push(input.xml);

    return `cfdi/${input.accountId}/recovered.xml`;
  }

  async savePdf(input: { accountId: string; pdf: Uint8Array }): Promise<string> {
    if (this.pdfFails) {
      throw new Error("R2 cfdi upload failed: 403");
    }

    this.pdfs.push(input.pdf);

    return `cfdi/${input.accountId}/recovered.pdf`;
  }
}

type SetupOverrides = {
  readonly rows?: CfdiInvoice[];
  readonly provider?: Pick<InvoiceIssuer, "downloadXml" | "downloadPdf">;
  readonly documents?: FakeDocumentStore;
  readonly limit?: number;
};

function setup(overrides: SetupOverrides = {}) {
  const repository = new FakeArchiveRepository(overrides.rows ?? [invoice()]);
  const provider = overrides.provider ?? new FakeProvider();
  const documents = overrides.documents ?? new FakeDocumentStore();
  const errors: Array<{ invoiceId: string; stage: "xml" | "pdf" }> = [];

  const recovery = new RecoverMissingArchives({
    invoices: repository,
    provider,
    documents,
    limit: overrides.limit,
    now: () => NOW,
    onError: (_error, invoiceId, stage) => errors.push({ invoiceId, stage }),
  });

  return { recovery, repository, documents, errors };
}

describe("RecoverMissingArchives", () => {
  it("re-archives both missing documents and records the recovered keys", async () => {
    const provider = new FakeProvider();

    const { recovery, repository, documents } = setup({ provider });

    await expect(recovery.execute()).resolves.toEqual({ checked: 1, recovered: 1 });

    expect(provider.xmlRequests).toEqual(["fac-1"]);
    expect(provider.pdfRequests).toEqual(["fac-1"]);
    expect(documents.xmls).toEqual(["<cfdi:Comprobante/>"]);
    expect(documents.pdfs).toEqual([new Uint8Array([0x25, 0x50, 0x44, 0x46])]);
    expect(repository.attempts).toEqual([
      {
        id: "inv-1",
        accountId: "acc-1",
        xmlKey: "cfdi/acc-1/recovered.xml",
        pdfKey: "cfdi/acc-1/recovered.pdf",
        attemptedAt: NOW,
      },
    ]);
  });

  it("asks the provider only for the document that is missing", async () => {
    const provider = new FakeProvider();

    const { recovery, repository } = setup({
      rows: [invoice({ xmlKey: "cfdi/acc-1/original.xml" })],
      provider,
    });

    await expect(recovery.execute()).resolves.toEqual({ checked: 1, recovered: 1 });

    expect(provider.xmlRequests).toEqual([]);
    expect(provider.pdfRequests).toEqual(["fac-1"]);
    expect(repository.attempts[0]).toMatchObject({
      xmlKey: null,
      pdfKey: "cfdi/acc-1/recovered.pdf",
    });
  });

  it("keeps the recovered XML when the PDF download fails", async () => {
    const { recovery, repository, errors } = setup({
      provider: new FakeProvider(undefined, new Error("provider down")),
    });

    await expect(recovery.execute()).resolves.toEqual({ checked: 1, recovered: 1 });

    expect(repository.attempts[0]).toMatchObject({
      xmlKey: "cfdi/acc-1/recovered.xml",
      pdfKey: null,
    });
    expect(errors).toEqual([{ invoiceId: "inv-1", stage: "pdf" }]);
  });

  it("stamps a failed attempt without changing any document key", async () => {
    const { recovery, repository, errors } = setup({
      provider: new FakeProvider(new Error("404"), new Error("404")),
    });

    await expect(recovery.execute()).resolves.toEqual({ checked: 1, recovered: 0 });

    expect(repository.attempts).toEqual([
      { id: "inv-1", accountId: "acc-1", xmlKey: null, pdfKey: null, attemptedAt: NOW },
    ]);
    expect(errors).toEqual([
      { invoiceId: "inv-1", stage: "xml" },
      { invoiceId: "inv-1", stage: "pdf" },
    ]);
  });

  it("reports an archive write failure and keeps the other document", async () => {
    const { recovery, repository, errors } = setup({
      documents: new FakeDocumentStore(true, false),
    });

    await expect(recovery.execute()).resolves.toEqual({ checked: 1, recovered: 1 });

    expect(repository.attempts[0]).toMatchObject({
      xmlKey: null,
      pdfKey: "cfdi/acc-1/recovered.pdf",
    });
    expect(errors).toEqual([{ invoiceId: "inv-1", stage: "xml" }]);
  });

  it("keeps the batch moving after one invoice fails, so it cannot starve the rest", async () => {
    const provider = {
      async downloadXml(providerId: string): Promise<string> {
        if (providerId === "fac-1") throw new Error("provider down");

        return "<cfdi/>";
      },
      async downloadPdf(providerId: string): Promise<Uint8Array> {
        if (providerId === "fac-1") throw new Error("provider down");

        return new Uint8Array([1]);
      },
    };
    const { recovery, repository } = setup({
      rows: [
        invoice({ id: "inv-1", providerId: "fac-1" }),
        invoice({ id: "inv-2", providerId: "fac-2" }),
      ],
      provider,
    });

    await expect(recovery.execute()).resolves.toEqual({ checked: 2, recovered: 1 });

    expect(repository.attempts.map((attempt) => attempt.id)).toEqual(["inv-1", "inv-2"]);
    expect(repository.attempts[0]).toMatchObject({ xmlKey: null, pdfKey: null });
    expect(repository.attempts[1]).toMatchObject({
      xmlKey: "cfdi/acc-1/recovered.xml",
      pdfKey: "cfdi/acc-1/recovered.pdf",
    });
  });

  it("asks the repository for a bounded batch", async () => {
    const { recovery, repository } = setup({ rows: [invoice()], limit: 2 });

    await recovery.execute();

    expect(repository.listedLimits).toEqual([2]);
  });
});
