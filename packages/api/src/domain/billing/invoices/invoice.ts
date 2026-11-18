import { type OffsetPage, paginateOffset } from "@aqui-suena/api/shared/pagination/page";

export const CFDI_INVOICE_STATUSES = ["issued", "failed"] as const;

export type CfdiInvoiceStatus = (typeof CFDI_INVOICE_STATUSES)[number];

export type CfdiInvoice = {
  id: string;
  accountId: string;
  paymentId: string | null;
  status: CfdiInvoiceStatus;
  uuid: string | null;
  providerId: string | null;
  xmlKey: string | null;
  pdfKey: string | null;
  failureReason: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type NewCfdiInvoice = Omit<CfdiInvoice, "id" | "createdAt" | "updatedAt">;

export type ListInvoicesInput = {
  readonly accountId: string;
  readonly limit: number;
  readonly offset: number;
};

export interface CfdiInvoiceRepository {
  create(input: NewCfdiInvoice): Promise<CfdiInvoice>;
  /** Only `issued` rows: a PAC rejection is not a document the owner owns. */
  listByAccount(input: ListInvoicesInput): Promise<OffsetPage<CfdiInvoice>>;
  getByIdForAccount(accountId: string, id: string): Promise<CfdiInvoice | null>;
}

export interface CfdiDocumentStore {
  saveXml(input: { accountId: string; xml: string }): Promise<string>;
  savePdf(input: { accountId: string; pdf: Uint8Array }): Promise<string>;
}

/** Signs a short-lived download for an archived document. */
export interface CfdiDocumentLinker {
  signedDownloadUrl(input: { key: string; fileName: string; contentType: string }): Promise<string>;
}

export class InMemoryCfdiInvoiceRepository implements CfdiInvoiceRepository {
  constructor(readonly rows: CfdiInvoice[] = []) {}

  async listByAccount(input: ListInvoicesInput): Promise<OffsetPage<CfdiInvoice>> {
    const issued = this.rows
      .filter((row) => row.accountId === input.accountId && row.status === "issued")
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return paginateOffset(
      issued.slice(input.offset, input.offset + input.limit),
      input.limit,
      input.offset,
    );
  }

  async getByIdForAccount(accountId: string, id: string): Promise<CfdiInvoice | null> {
    return (
      this.rows.find(
        (row) => row.id === id && row.accountId === accountId && row.status === "issued",
      ) ?? null
    );
  }

  async create(input: NewCfdiInvoice): Promise<CfdiInvoice> {
    const now = new Date();

    const invoice: CfdiInvoice = {
      id: crypto.randomUUID(),
      ...input,
      createdAt: now,
      updatedAt: now,
    };

    this.rows.push(invoice);

    return invoice;
  }
}
