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
  failureReason: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type NewCfdiInvoice = Omit<CfdiInvoice, "id" | "createdAt" | "updatedAt">;

export interface CfdiInvoiceRepository {
  create(input: NewCfdiInvoice): Promise<CfdiInvoice>;
}

export interface CfdiXmlStore {
  save(input: { accountId: string; xml: string }): Promise<string>;
}

export class InMemoryCfdiInvoiceRepository implements CfdiInvoiceRepository {
  constructor(readonly rows: CfdiInvoice[] = []) {}

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
